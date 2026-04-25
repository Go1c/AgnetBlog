import { validateFrontmatter, parseFrontmatterBlock } from './frontmatter';
import { resolveTitleFallback, stripFrontmatter } from './markdown';
import { resolveDirectoryPolicy } from './policy';
import { normalizeSlug, resolveSlugSourcePath } from './slug';
import type {
  ContentPipelineIssue,
  DirectoryPolicyInput,
  EffectiveContentMetadata,
  IngestFileInput,
  IngestOptions,
  IngestResult,
  PublishFrontmatter,
} from './types';

export function ingestContentFiles(
  files: IngestFileInput[],
  policies: DirectoryPolicyInput[] = [],
  options: IngestOptions = {},
): IngestResult {
  assertValidArguments(files, policies, options);

  const result: IngestResult = {
    successes: [],
    failures: [],
  };

  for (const file of files) {
    const rawFrontmatter = parseFrontmatterBlock(file.content);
    const frontmatter = validateFrontmatter(rawFrontmatter);

    if (!frontmatter.success) {
      result.failures.push({
        path: file.path,
        errors: withPath(frontmatter.errors, file.path),
      });
      continue;
    }

    const policy = resolveDirectoryPolicy(file.path, policies, frontmatter.data);
    if (!policy.success) {
      result.failures.push({
        path: file.path,
        errors: policy.errors,
      });
      continue;
    }

    const effective = toEffectiveMetadata(policy.metadata, file, options);
    if (!effective.success) {
      result.failures.push({
        path: file.path,
        errors: effective.errors,
      });
      continue;
    }

    result.successes.push({
      path: file.path,
      metadata: effective.metadata,
      body: stripFrontmatter(file.content),
    });
  }

  return result;
}

function toEffectiveMetadata(
  metadata: PublishFrontmatter,
  file: IngestFileInput,
  options: IngestOptions,
):
  | { success: true; metadata: EffectiveContentMetadata }
  | { success: false; errors: ContentPipelineIssue[] } {
  const errors: ContentPipelineIssue[] = [];

  if (!metadata.contentType) {
    errors.push({
      code: 'missing_content_type',
      message: 'contentType is required in frontmatter or directory defaults.',
      field: 'contentType',
      path: file.path,
    });
  }

  if (!metadata.visibility) {
    errors.push({
      code: 'missing_visibility',
      message: 'visibility is required in frontmatter or directory defaults.',
      field: 'visibility',
      path: file.path,
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  const contentType = metadata.contentType;
  const visibility = metadata.visibility;

  if (!contentType || !visibility) {
    return {
      success: false,
      errors,
    };
  }

  const slug = metadata.slug
    ? normalizeSlug(metadata.slug, file.path)
    : resolveSlugSourcePath({
        path: file.path,
        relativePath: file.relativePath,
        contentType,
        sourceRoot: options.sourceRoot,
      });

  if (!slug.success) {
    return {
      success: false,
      errors: withPath(slug.errors, file.path),
    };
  }

  return {
    success: true,
    metadata: {
      ...metadata,
      contentType,
      visibility,
      published: metadata.published ?? true,
      tags: metadata.tags ?? [],
      slug: slug.slug,
      title: resolveTitleFallback({
        frontmatterTitle: metadata.title,
        markdown: file.content,
        sourcePath: file.path,
      }),
    },
  };
}

function withPath(errors: ContentPipelineIssue[], path: string) {
  return errors.map((error) => ({
    ...error,
    path,
  }));
}

function assertValidArguments(
  files: IngestFileInput[],
  policies: DirectoryPolicyInput[],
  options: IngestOptions,
) {
  if (!Array.isArray(files)) {
    throw new TypeError('files must be an array.');
  }

  if (!Array.isArray(policies)) {
    throw new TypeError('policies must be an array.');
  }

  if (!options || typeof options !== 'object') {
    throw new TypeError('options must be an object.');
  }

  for (const file of files) {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') {
      throw new TypeError('Each ingest file must include string path and content fields.');
    }

    if (file.relativePath !== undefined && typeof file.relativePath !== 'string') {
      throw new TypeError('relativePath must be a string when provided.');
    }
  }
}
