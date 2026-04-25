import { validateFrontmatter, parseFrontmatterBlock } from './frontmatter';
import { resolveTitleFallback, stripFrontmatter } from './markdown';
import { resolveDirectoryPolicy } from './policy';
import { normalizeSlug } from './slug';
import type {
  ContentPipelineIssue,
  DirectoryPolicyInput,
  EffectiveContentMetadata,
  IngestFileInput,
  IngestResult,
  PublishFrontmatter,
} from './types';

export function ingestContentFiles(
  files: IngestFileInput[],
  policies: DirectoryPolicyInput[] = [],
): IngestResult {
  assertValidArguments(files, policies);

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

    const effective = toEffectiveMetadata(policy.metadata, file);
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

  return {
    success: true,
    metadata: {
      ...metadata,
      contentType,
      visibility,
      published: metadata.published ?? true,
      tags: metadata.tags ?? [],
      slug: normalizeSlug(metadata.slug, file.path),
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

function assertValidArguments(files: IngestFileInput[], policies: DirectoryPolicyInput[]) {
  if (!Array.isArray(files)) {
    throw new TypeError('files must be an array.');
  }

  if (!Array.isArray(policies)) {
    throw new TypeError('policies must be an array.');
  }

  for (const file of files) {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') {
      throw new TypeError('Each ingest file must include string path and content fields.');
    }
  }
}
