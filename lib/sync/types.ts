import type { ContentPipelineIssue } from '@/lib/content/types';
import type { SyncStatus } from '@/lib/generated/prisma/client';

export const SYNC_SOURCE_ROOTS = {
  blog: 'content/blog',
  docs: 'content/docs',
} as const;

export type SyncMode = 'incremental' | 'reconcile';

export type SyncFileOperation = 'upserted' | 'unpublished' | 'skipped' | 'failed';

export type SyncFileResult = {
  path: string;
  operation: SyncFileOperation;
  message?: string;
  issues?: ContentPipelineIssue[];
};

export type SyncRunResult = {
  mode: SyncMode;
  status: Extract<SyncStatus, 'SUCCESS' | 'PARTIAL' | 'FAILED'>;
  sourceRef?: string;
  scanned: number;
  upserted: number;
  unpublished: number;
  skipped: number;
  failed: number;
  files: SyncFileResult[];
  queue: {
    mode: 'inline';
    message: string;
  };
};

export type IncrementalSyncInput = {
  jobId: string;
  before: string | null;
  after: string;
};

export type ReconcileSyncInput = {
  jobId: string;
  sourceRef?: string;
};

export type GitHubPushPayload = {
  ref?: string;
  before?: string;
  after?: string;
  repository?: {
    full_name?: string;
  };
  pusher?: {
    name?: string;
    email?: string;
  };
};

export type ManualSyncRequest = {
  mode?: SyncMode;
  before?: string;
  after?: string;
};
