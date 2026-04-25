import { ingestContentFiles } from './ingest';
import { parseFrontmatterBlock, validateFrontmatter } from './frontmatter';
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

  const markdown = replaceFrontmatter(options.markdown, serializeFrontmatter(merged));
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

function replaceFrontmatter(markdown: string, serializedFrontmatter: string) {
  const replacement = `---\n${serializedFrontmatter}---\n`;

  if (/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(markdown)) {
    return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, replacement);
  }

  return `${replacement}${markdown}`;
}

function serializeFrontmatter(data: Record<string, unknown>) {
  return Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => serializeYamlEntry(key, value))
    .join('');
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
