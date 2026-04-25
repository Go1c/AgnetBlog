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
    return trimmed.length > 0 ? normalizeDate(trimmed) : trimmed;
  }

  return value;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

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
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return isValidDateOnly(value) ? value : '';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function isValidDateOnly(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return parsed.toISOString().slice(0, 10) === value;
}

function parseSimpleYaml(source: string) {
  const data: Record<string, unknown> = {};
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line || line.trim().length === 0 || line.trimStart().startsWith('#')) {
      continue;
    }

    const keyValue = line.match(/^([A-Za-z][\w-]*):(?:\s*(.*))?$/);
    if (!keyValue) {
      continue;
    }

    const [, key, rawValue = ''] = keyValue;

    if (rawValue.trim().length > 0) {
      data[key] = parseYamlScalar(rawValue.trim());
      continue;
    }

    const items: unknown[] = [];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const item = lines[cursor].match(/^\s*-\s*(.*)$/);
      if (!item) {
        break;
      }

      items.push(parseYamlScalar(item[1].trim()));
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
  const unquoted = stripMatchingQuotes(value);

  if (unquoted === 'true') {
    return true;
  }

  if (unquoted === 'false') {
    return false;
  }

  if (/^\[.*\]$/.test(unquoted)) {
    return unquoted
      .slice(1, -1)
      .split(',')
      .map((item) => stripMatchingQuotes(item.trim()))
      .filter(Boolean);
  }

  return unquoted;
}

function stripMatchingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
