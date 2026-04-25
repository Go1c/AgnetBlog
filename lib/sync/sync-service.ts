import { createHash } from 'node:crypto';

import { ingestContentFiles } from '@/lib/content/ingest';
import type { DirectoryPolicyInput, IngestFileInput } from '@/lib/content/types';
import { db } from '@/lib/db';
import { upsertContentItem } from '@/lib/db/content-repository';
import { updateSyncJobStatus } from '@/lib/db/sync-job-repository';
import { compareCommits, fetchFileContent, listRepoTree } from '@/lib/github/client';
import { ContentType, SyncStatus, Visibility } from '@/lib/generated/prisma/client';
import type { Prisma } from '@/lib/generated/prisma/client';
import {
  SYNC_SOURCE_ROOTS,
  type IncrementalSyncInput,
  type ReconcileSyncInput,
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

  try {
    if (!input.before || ZERO_COMMIT.test(input.before)) {
      return failJob(
        input.jobId,
        'incremental',
        input.after,
        'Incremental sync requires a valid before commit.',
      );
    }

    const comparison = await compareCommits(input.before, input.after);
    if (!comparison.ok) {
      return failJob(input.jobId, 'incremental', input.after, comparison.error.message);
    }

    if (!comparison.data.filesComplete) {
      return runReconciliationSync({
        jobId: input.jobId,
        sourceRef: input.after,
        reason: comparison.data.incompleteReason ?? 'GitHub compare completeness is unknown.',
      });
    }

    const results: SyncFileResult[] = [];
    const upsertFiles: MarkdownFile[] = [];

    for (const file of comparison.data.files) {
      const previousWasMarkdown = Boolean(
        file.previousFilename && isMarkdownPath(file.previousFilename),
      );
      const currentIsMarkdown = isMarkdownPath(file.filename);

      if (previousWasMarkdown && file.previousFilename) {
        results.push(await deleteDerivedContentPath(file.previousFilename));
      }

      if (!currentIsMarkdown) {
        continue;
      }

      if (file.status === 'removed') {
        results.push(await deleteDerivedContentPath(file.filename));
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
  } catch (error) {
    return failJob(input.jobId, 'incremental', input.after, sanitizeError(error));
  }
}

export async function runReconciliationSync(input: ReconcileSyncInput): Promise<SyncRunResult> {
  await updateSyncJobStatus(input.jobId, SyncStatus.RUNNING, {
    startedAt: new Date(),
    errorMessage: null,
  });

  try {
    const tree = await listRepoTree(input.sourceRef);
    if (!tree.ok) {
      return failJob(input.jobId, 'reconcile', input.sourceRef, tree.error.message, [
        {
          path: '(repository-tree)',
          operation: 'failed',
          message: tree.error.message,
        },
      ]);
    }

    if (tree.data.truncated) {
      return failJob(
        input.jobId,
        'reconcile',
        input.sourceRef,
        'GitHub tree response was truncated; reconciliation did not modify missing content.',
      );
    }

    const markdownFiles = tree.data.tree.filter(
      (item) => item.type === 'blob' && isMarkdownPath(item.path),
    );
    const results: SyncFileResult[] = [];
    const files: MarkdownFile[] = [];

    if (input.reason) {
      results.push({
        path: '(compare)',
        operation: 'skipped',
        message: input.reason,
      });
    }

    for (const item of markdownFiles) {
      const content = await fetchFileContent(item.path, input.sourceRef);
      if (!content.ok) {
        results.push({
          path: item.path,
          operation: 'failed',
          message: content.error.message,
        });
        continue;
      }

      files.push({
        path: item.path,
        content: content.data,
        sourceHash: item.sha,
      });
    }

    results.push(...(await ingestAndUpsertMarkdownFiles(files)));
    results.push(
      ...(await deleteMissingRepositoryContent(new Set(markdownFiles.map((item) => item.path)))),
    );

    return finishJob(input.jobId, buildRunResult('reconcile', input.sourceRef, results));
  } catch (error) {
    return failJob(input.jobId, 'reconcile', input.sourceRef, sanitizeError(error));
  }
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

export async function deleteDerivedContentPath(path: string): Promise<SyncFileResult> {
  try {
    const result = await db.contentItem.deleteMany({
      where: {
        sourcePath: path,
      },
    });

    return {
      path,
      operation: result.count > 0 ? 'deleted' : 'skipped',
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

export async function deleteMissingRepositoryContent(
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
    results.push(await deleteDerivedContentPath(path));
  }

  return results;
}

export async function finishJob(jobId: string, result: SyncRunResult): Promise<SyncRunResult> {
  const firstFailureMessage = result.files.find(
    (file) => file.operation === 'failed' && file.message,
  )?.message;

  await updateSyncJobStatus(jobId, result.status, {
    finishedAt: new Date(),
    errorMessage:
      result.status === SyncStatus.SUCCESS
        ? null
        : firstFailureMessage ??
          `${result.failed} file${result.failed === 1 ? '' : 's'} failed during ${result.mode} sync.`,
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
  const deleted = count(files, 'deleted');
  const unpublished = count(files, 'unpublished');
  const skipped = count(files, 'skipped');
  const status =
    failed === 0
      ? SyncStatus.SUCCESS
      : upserted > 0 || deleted > 0 || unpublished > 0 || skipped > 0
        ? SyncStatus.PARTIAL
        : SyncStatus.FAILED;

  return {
    mode,
    status,
    sourceRef,
    scanned: files.length,
    upserted,
    deleted,
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

function failJob(
  jobId: string,
  mode: SyncRunResult['mode'],
  sourceRef: string | undefined,
  message: string,
  files: SyncFileResult[] = [],
) {
  const failedFiles =
    files.length > 0 ? files : [{ path: `(${mode})`, operation: 'failed' as const, message }];

  return finishJob(jobId, {
    mode,
    sourceRef,
    scanned: failedFiles.length,
    upserted: count(failedFiles, 'upserted'),
    deleted: count(failedFiles, 'deleted'),
    unpublished: count(failedFiles, 'unpublished'),
    skipped: count(failedFiles, 'skipped'),
    failed: Math.max(1, count(failedFiles, 'failed')),
    files: failedFiles,
    queue: inlineQueue(),
    status: SyncStatus.FAILED,
  });
}

function sanitizeError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]');
  }

  return 'Sync operation failed.';
}
