import { createHash } from 'node:crypto';

import { ingestContentFiles } from '@/lib/content/ingest';
import type { DirectoryPolicyInput, IngestFileInput } from '@/lib/content/types';
import { db } from '@/lib/db';
import { upsertContentItem } from '@/lib/db/content-repository';
import { updateSyncJobStatus } from '@/lib/db/sync-job-repository';
import { compareCommits, fetchFileContent } from '@/lib/github/client';
import { ContentType, SyncStatus, Visibility } from '@/lib/generated/prisma/client';
import type { Prisma } from '@/lib/generated/prisma/client';
import {
  SYNC_SOURCE_ROOTS,
  type IncrementalSyncInput,
  type SyncFileResult,
  type SyncRunResult,
} from '@/lib/sync/types';

const INLINE_QUEUE_MESSAGE = 'No background queue is configured; sync executed inline in the request.';
const ZERO_COMMIT = /^0{40}$/;

type MarkdownFile = {
  path: string;
  content: string;
  sourceHash?: string;
};

export async function runIncrementalSync(input: IncrementalSyncInput): Promise<SyncRunResult> {
  await updateSyncJobStatus(input.jobId, SyncStatus.RUNNING, {
    startedAt: new Date(),
    errorMessage: null,
  });

  const fatal = async (message: string, files: SyncFileResult[] = []) =>
    finishJob(input.jobId, {
      mode: 'incremental',
      sourceRef: input.after,
      scanned: files.length,
      upserted: count(files, 'upserted'),
      unpublished: count(files, 'unpublished'),
      skipped: count(files, 'skipped'),
      failed: Math.max(1, count(files, 'failed')),
      files:
        files.length > 0
          ? files
          : [{ path: '(compare)', operation: 'failed', message }],
      queue: inlineQueue(),
      status: SyncStatus.FAILED,
    });

  if (!input.before || ZERO_COMMIT.test(input.before)) {
    return fatal('Incremental sync requires a valid before commit.');
  }

  const comparison = await compareCommits(input.before, input.after);
  if (!comparison.ok) {
    return fatal(comparison.error.message);
  }

  const changedMarkdown = comparison.data.files.filter((file) => isMarkdownPath(file.filename));
  const results: SyncFileResult[] = [];
  const upsertFiles: MarkdownFile[] = [];

  for (const file of changedMarkdown) {
    if (file.previousFilename && isMarkdownPath(file.previousFilename)) {
      results.push(await unpublishContentPath(file.previousFilename));
    }

    if (file.status === 'removed') {
      results.push(await unpublishContentPath(file.filename));
      continue;
    }

    const content = await fetchFileContent(file.filename, input.after);
    if (!content.ok) {
      results.push({
        path: file.filename,
        operation: 'failed',
        message: content.error.message,
      });
      continue;
    }

    upsertFiles.push({
      path: file.filename,
      content: content.data,
      sourceHash: file.sha ?? hashContent(content.data),
    });
  }

  results.push(...(await ingestAndUpsertMarkdownFiles(upsertFiles)));

  return finishJob(input.jobId, buildRunResult('incremental', input.after, results));
}

export async function ingestAndUpsertMarkdownFiles(files: MarkdownFile[]): Promise<SyncFileResult[]> {
  if (files.length === 0) {
    return [];
  }

  const policies = await loadDirectoryPolicies();
  const ingestFiles = files.map<IngestFileInput>((file) => ({
    path: file.path,
    relativePath: getRelativeContentPath(file.path),
    content: file.content,
  }));
  const ingest = ingestContentFiles(ingestFiles, policies, {
    sourceRoot: SYNC_SOURCE_ROOTS,
  });
  const results: SyncFileResult[] = [];

  for (const failure of ingest.failures) {
    results.push({
      path: failure.path,
      operation: 'failed',
      message: 'Content ingestion failed.',
      issues: failure.errors,
    });
  }

  for (const success of ingest.successes) {
    const file = files.find((candidate) => candidate.path === success.path);
    const sourceHash = file?.sourceHash ?? hashContent(file?.content ?? success.body);
    const metadata = success.metadata;
    const publishedAt = parsePublishedAt(metadata.date);

    try {
      await upsertContentItem({
        where: {
          sourcePath: success.path,
        },
        create: {
          type: toPrismaContentType(metadata.contentType),
          slug: metadata.slug,
          title: metadata.title,
          description: metadata.summary ?? null,
          sourcePath: success.path,
          sourceHash,
          visibility: toPrismaVisibility(metadata.visibility),
          published: metadata.published,
          publishedAt,
          syncedAt: new Date(),
        },
        update: {
          type: toPrismaContentType(metadata.contentType),
          slug: metadata.slug,
          title: metadata.title,
          description: metadata.summary ?? null,
          sourceHash,
          visibility: toPrismaVisibility(metadata.visibility),
          published: metadata.published,
          publishedAt,
          syncedAt: new Date(),
        },
      });

      results.push({
        path: success.path,
        operation: 'upserted',
      });
    } catch (error) {
      results.push({
        path: success.path,
        operation: 'failed',
        message: sanitizeError(error),
      });
    }
  }

  return results;
}

export async function unpublishContentPath(path: string): Promise<SyncFileResult> {
  try {
    const result = await db.contentItem.updateMany({
      where: {
        sourcePath: path,
      },
      data: {
        published: false,
        visibility: Visibility.PRIVATE,
        syncedAt: new Date(),
      },
    });

    return {
      path,
      operation: result.count > 0 ? 'unpublished' : 'skipped',
      message: result.count > 0 ? undefined : 'No derived content item exists for this path.',
    };
  } catch (error) {
    return {
      path,
      operation: 'failed',
      message: sanitizeError(error),
    };
  }
}

export async function unpublishMissingRepositoryContent(
  presentPaths: Set<string>,
): Promise<SyncFileResult[]> {
  const indexedItems = await db.contentItem.findMany({
    where: {
      OR: Object.values(SYNC_SOURCE_ROOTS).map((root) => ({
        sourcePath: {
          startsWith: `${root}/`,
        },
      })),
    },
    select: {
      sourcePath: true,
    },
  });

  const missing = indexedItems
    .map((item) => item.sourcePath)
    .filter((path) => isMarkdownPath(path) && !presentPaths.has(path));

  const results: SyncFileResult[] = [];
  for (const path of missing) {
    results.push(await unpublishContentPath(path));
  }

  return results;
}

export async function finishJob(jobId: string, result: SyncRunResult): Promise<SyncRunResult> {
  await updateSyncJobStatus(jobId, result.status, {
    finishedAt: new Date(),
    errorMessage:
      result.status === SyncStatus.SUCCESS
        ? null
        : `${result.failed} file${result.failed === 1 ? '' : 's'} failed during ${result.mode} sync.`,
    result: result as unknown as Prisma.InputJsonValue,
  });

  return result;
}

export function buildRunResult(
  mode: SyncRunResult['mode'],
  sourceRef: string | undefined,
  files: SyncFileResult[],
): SyncRunResult {
  const failed = count(files, 'failed');
  const upserted = count(files, 'upserted');
  const unpublished = count(files, 'unpublished');
  const skipped = count(files, 'skipped');
  const status =
    failed === 0 ? SyncStatus.SUCCESS : upserted > 0 || unpublished > 0 || skipped > 0 ? SyncStatus.PARTIAL : SyncStatus.FAILED;

  return {
    mode,
    status,
    sourceRef,
    scanned: files.length,
    upserted,
    unpublished,
    skipped,
    failed,
    files,
    queue: inlineQueue(),
  };
}

export function isMarkdownPath(path: string): boolean {
  return (
    (path.endsWith('.md') || path.endsWith('.mdx')) &&
    Object.values(SYNC_SOURCE_ROOTS).some((root) => path === root || path.startsWith(`${root}/`))
  );
}

function inlineQueue() {
  return {
    mode: 'inline' as const,
    message: INLINE_QUEUE_MESSAGE,
  };
}

async function loadDirectoryPolicies(): Promise<DirectoryPolicyInput[]> {
  const policies = await db.directoryPolicy.findMany({
    where: {
      syncEnabled: true,
    },
  });

  return policies.map((policy) => ({
    pathPrefix: policy.path,
    defaults: {
      contentType: policy.contentType === ContentType.BLOG ? 'blog' : 'docs',
      visibility: policy.defaultVisibility.toLowerCase() as 'private' | 'public' | 'unlisted',
    },
  }));
}

function toPrismaContentType(contentType: 'blog' | 'docs') {
  return contentType === 'blog' ? ContentType.BLOG : ContentType.DOCS;
}

function toPrismaVisibility(visibility: 'private' | 'public' | 'unlisted') {
  if (visibility === 'public') {
    return Visibility.PUBLIC;
  }

  if (visibility === 'unlisted') {
    return Visibility.UNLISTED;
  }

  return Visibility.PRIVATE;
}

function getRelativeContentPath(path: string) {
  const sourceRoot = Object.values(SYNC_SOURCE_ROOTS).find(
    (root) => path === root || path.startsWith(`${root}/`),
  );

  return sourceRoot ? path.slice(sourceRoot.length).replace(/^\/+/, '') : path;
}

function parsePublishedAt(date: string | undefined) {
  if (!date) {
    return null;
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hashContent(content: string) {
  return createHash('sha256').update(content).digest('hex');
}

function count(files: SyncFileResult[], operation: SyncFileResult['operation']) {
  return files.filter((file) => file.operation === operation).length;
}

function sanitizeError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]');
  }

  return 'Sync operation failed.';
}
