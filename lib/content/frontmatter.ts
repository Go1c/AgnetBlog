import { z } from 'zod';

import type { ContentPipelineIssue, PublishFrontmatter } from './types';

type ParseSuccess = {
  success: true;
  data: PublishFrontmatter;
};

type ParseFailure = {
  success: false;
  errors: ContentPipelineIssue[];
};

export type FrontmatterParseResult = ParseSuccess | ParseFailure;

const contentTypeSchema = z.enum(['blog', 'docs']);
const visibilitySchema = z.enum(['private', 'public', 'unlisted']);

const frontmatterDateSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return normalizeDate(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : trimmed;
  }

  return value;
}, z.string().date());

export const publishFrontmatterSchema = z.object({
  title: z.string().trim().min(1).optional(),
  date: frontmatterDateSchema.optional(),
  updatedAt: frontmatterDateSchema.optional(),
  summary: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  contentType: contentTypeSchema.optional(),
  visibility: visibilitySchema.optional(),
  slug: z.string().trim().min(1).optional(),
  docSection: z.string().trim().min(1).optional(),
  cover: z.string().trim().min(1).optional(),
  published: z.boolean().optional(),
});

export function validateFrontmatter(input: unknown): FrontmatterParseResult {
  const result = publishFrontmatterSchema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      field: issue.path.join('.'),
    })),
  };
}

export function parseFrontmatterBlock(markdown: string): Record<string, unknown> {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

  if (!match) {
    return {};
  }

  return parseSimpleYaml(match[1] ?? '');
}

function normalizeDate(value: Date | string) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }

    if (
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0
    ) {
      return [
        value.getUTCFullYear(),
        padDatePart(value.getUTCMonth() + 1),
        padDatePart(value.getUTCDate()),
      ].join('-');
    }

    return [
      value.getFullYear(),
      padDatePart(value.getMonth() + 1),
      padDatePart(value.getDate()),
    ].join('-');
  }

  return value;
}

function padDatePart(value: number) {
  return value.toString().padStart(2, '0');
}

function parseSimpleYaml(source: string) {
  const data: Record<string, unknown> = {};
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmedLine = stripYamlComment(line).trim();

    if (trimmedLine.length === 0) {
      continue;
    }

    const keyValue = trimmedLine.match(/^([A-Za-z][\w-]*):(?:\s*(.*))?$/);
    if (!keyValue) {
      continue;
    }

    const [, key, rawValue = ''] = keyValue;
    const value = rawValue.trim();

    if (value === '|' || value === '>') {
      const block = readYamlBlock(lines, index + 1);
      data[key] = value === '|' ? block.lines.join('\n') : foldYamlLines(block.lines);
      index = block.lastIndex;
      continue;
    }

    if (value.length > 0) {
      data[key] = parseYamlScalar(value);
      continue;
    }

    const items: unknown[] = [];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const item = lines[cursor]?.match(/^\s*-\s*(.*)$/);
      if (!item) {
        break;
      }

      const itemValue = stripYamlComment(item[1]).trim();
      items.push(parseYamlScalar(itemValue));
      cursor += 1;
    }

    if (items.length > 0) {
      data[key] = items;
      index = cursor - 1;
    } else {
      data[key] = '';
    }
  }

  return data;
}

function parseYamlScalar(value: string): unknown {
  const withoutComment = stripYamlComment(value).trim();
  const unquoted = stripMatchingQuotes(withoutComment);

  if (unquoted === 'true') {
    return true;
  }

  if (unquoted === 'false') {
    return false;
  }

  if (/^\[.*\]$/.test(withoutComment)) {
    return splitInlineArray(withoutComment.slice(1, -1))
      .map((item) => parseYamlScalar(item))
      .filter(Boolean);
  }

  return unquoted;
}

function stripMatchingQuotes(value: string) {
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function stripYamlComment(value: string) {
  let quote: '"' | "'" | undefined;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const previous = value[index - 1];

    if ((character === '"' || character === "'") && previous !== '\\') {
      quote = quote === character ? undefined : quote ?? character;
      continue;
    }

    if (character === '#' && !quote && (index === 0 || /\s/.test(previous))) {
      return value.slice(0, index);
    }
  }

  return value;
}

function splitInlineArray(value: string) {
  const items: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const previous = value[index - 1];

    if ((character === '"' || character === "'") && previous !== '\\') {
      quote = quote === character ? undefined : quote ?? character;
    }

    if (character === ',' && !quote) {
      items.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  if (current.trim().length > 0) {
    items.push(current.trim());
  }

  return items;
}

function readYamlBlock(lines: string[], startIndex: number) {
  const blockLines: string[] = [];
  let lastIndex = startIndex - 1;

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index] ?? '';

    if (line.trim().length === 0) {
      blockLines.push('');
      lastIndex = index;
      continue;
    }

    if (!/^\s+/.test(line)) {
      break;
    }

    blockLines.push(line.replace(/^\s{2}/, ''));
    lastIndex = index;
  }

  return {
    lines: blockLines,
    lastIndex,
  };
}

function foldYamlLines(lines: string[]) {
  return lines
    .join('\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, ' '))
    .join('\n\n');
}
