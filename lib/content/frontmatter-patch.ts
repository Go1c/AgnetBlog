import { parseFrontmatterBlock, validateFrontmatter } from './frontmatter';
import { ingestContentFiles } from './ingest';
import type { ContentPipelineIssue, PublishFrontmatter } from './types';

export const PATCHABLE_FRONTMATTER_FIELDS = [
  'visibility',
  'contentType',
  'published',
  'summary',
  'tags',
  'slug',
  'date',
  'updatedAt',
  'docSection',
  'cover',
  'title',
] as const;

export type PatchableFrontmatterField = (typeof PATCHABLE_FRONTMATTER_FIELDS)[number];
export type FrontmatterPatchInput = Partial<Pick<PublishFrontmatter, PatchableFrontmatterField>>;
export type MetadataSummary = Partial<Record<PatchableFrontmatterField, unknown>>;

export type FrontmatterDiffEntry = {
  field: PatchableFrontmatterField;
  before: unknown;
  after: unknown;
};

export type FrontmatterPatchResult =
  | {
      ok: true;
      markdown: string;
      before: MetadataSummary;
      after: MetadataSummary;
      diff: FrontmatterDiffEntry[];
    }
  | {
      ok: false;
      error: string;
      issues?: ContentPipelineIssue[];
      unknownFields?: string[];
    };

type FrontmatterEnvelope = {
  opening: string;
  source: string;
  closingAndBody: string;
};

type FieldSpan = {
  key: string;
  start: number;
  end: number;
};

const allowedFields = new Set<string>(PATCHABLE_FRONTMATTER_FIELDS);

export function patchMarkdownFrontmatter(options: {
  markdown: string;
  patch: Record<string, unknown>;
  sourcePath: string;
  relativePath?: string;
}): FrontmatterPatchResult {
  const unknownFields = Object.keys(options.patch).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    return {
      ok: false,
      error: 'unknown_metadata_fields',
      unknownFields,
    };
  }

  const originalFrontmatter = parseFrontmatterBlock(options.markdown);
  const beforeValidation = validateFrontmatter(originalFrontmatter);
  if (!beforeValidation.success) {
    return {
      ok: false,
      error: 'invalid_existing_frontmatter',
      issues: beforeValidation.errors,
    };
  }

  const merged = {
    ...originalFrontmatter,
    ...options.patch,
  };
  const afterValidation = validateFrontmatter(merged);
  if (!afterValidation.success) {
    return {
      ok: false,
      error: 'invalid_patched_frontmatter',
      issues: afterValidation.errors,
    };
  }

  const markdown = patchFrontmatterText(options.markdown, options.patch);
  const ingestValidation = ingestContentFiles([
    {
      path: options.sourcePath,
      relativePath: options.relativePath,
      content: markdown,
    },
  ]);
  if (ingestValidation.failures.length > 0) {
    return {
      ok: false,
      error: 'patched_content_failed_ingest_validation',
      issues: ingestValidation.failures.flatMap((failure) => failure.errors),
    };
  }

  const before = summarizeMetadata(beforeValidation.data);
  const after = summarizeMetadata(afterValidation.data);
  const diff = diffSummaries(before, after);

  return {
    ok: true,
    markdown,
    before,
    after,
    diff,
  };
}

function patchFrontmatterText(markdown: string, patch: Record<string, unknown>) {
  const envelope = splitFrontmatter(markdown);
  const frontmatter = envelope?.source ?? '';
  const spans = findTopLevelFieldSpans(frontmatter);
  const replacements = new Map<string, string>();
  const appended: string[] = [];

  for (const [key, value] of Object.entries(patch)) {
    const serialized = serializeYamlEntry(key, value);
    if (spans.some((span) => span.key === key)) {
      replacements.set(key, serialized);
    } else {
      appended.push(serialized);
    }
  }

  let patched = '';
  let cursor = 0;
  for (const span of spans) {
    const replacement = replacements.get(span.key);
    if (replacement === undefined) {
      continue;
    }

    patched += frontmatter.slice(cursor, span.start);
    patched += replacement;
    cursor = span.end;
  }
  patched += frontmatter.slice(cursor);

  if (appended.length > 0) {
    patched = `${trimTrailingBlankLines(patched)}${patched.endsWith('\n') || patched.length === 0 ? '' : '\n'}${appended.join('')}`;
  }

  if (!envelope) {
    return `---\n${patched}---\n${markdown}`;
  }

  return `${envelope.opening}${patched}${envelope.closingAndBody}`;
}

function splitFrontmatter(markdown: string): FrontmatterEnvelope | undefined {
  const match = markdown.match(/^---(\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/);
  if (!match || match.index !== 0) {
    return undefined;
  }

  return {
    opening: `---${match[1]}`,
    source: match[2] ?? '',
    closingAndBody: markdown.slice((match[0] ?? '').length - (match[3] ?? '').length),
  };
}

function findTopLevelFieldSpans(source: string): FieldSpan[] {
  const lineStarts = getLineStarts(source);
  const fields: Array<Omit<FieldSpan, 'end'>> = [];

  for (let index = 0; index < lineStarts.length; index += 1) {
    const start = lineStarts[index] ?? 0;
    const next = lineStarts[index + 1] ?? source.length;
    const line = source.slice(start, next);
    const match = line.match(/^([A-Za-z][\w-]*):(?:\s|$)/);

    if (match) {
      fields.push({
        key: match[1] ?? '',
        start,
      });
    }
  }

  return fields.map((field, index) => ({
    ...field,
    end: fields[index + 1]?.start ?? source.length,
  }));
}

function getLineStarts(source: string) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n' && index + 1 < source.length) {
      starts.push(index + 1);
    }
  }

  return starts;
}

function trimTrailingBlankLines(source: string) {
  return source.replace(/(?:\r?\n\s*)*$/, '\n');
}

function serializeYamlEntry(key: string, value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${key}: []\n`;
    }

    return `${key}:\n${value.map((item) => `  - ${serializeYamlScalar(item)}`).join('\n')}\n`;
  }

  return `${key}: ${serializeYamlScalar(value)}\n`;
}

function serializeYamlScalar(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : JSON.stringify(String(value));
  }

  if (value === null) {
    return 'null';
  }

  const text = String(value);
  if (text.length === 0 || /[:#\[\]{}&*!|>'"%@`,]/.test(text) || /^\s|\s$/.test(text)) {
    return JSON.stringify(text);
  }

  return text;
}

function summarizeMetadata(frontmatter: PublishFrontmatter): MetadataSummary {
  return Object.fromEntries(
    PATCHABLE_FRONTMATTER_FIELDS.flatMap((field) =>
      frontmatter[field] === undefined ? [] : [[field, frontmatter[field]]],
    ),
  ) as MetadataSummary;
}

function diffSummaries(before: MetadataSummary, after: MetadataSummary): FrontmatterDiffEntry[] {
  return PATCHABLE_FRONTMATTER_FIELDS.flatMap((field) =>
    valuesEqual(before[field], after[field])
      ? []
      : [
          {
            field,
            before: before[field],
            after: after[field],
          },
        ],
  );
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
