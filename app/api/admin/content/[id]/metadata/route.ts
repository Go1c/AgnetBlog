import { z } from 'zod';

import { recordAuditEvent } from '@/lib/audit/audit-service';
import { withAdminRoute } from '@/lib/auth/admin';
import { findContentItemById } from '@/lib/db/content-repository';
import { createSyncJob } from '@/lib/db/sync-job-repository';
import { ActorType, SyncStatus, SyncTrigger } from '@/lib/generated/prisma/client';
import {
  writebackFrontmatterPatch,
  type GitHubWritebackErrorCode,
} from '@/lib/github/writeback';
import { runReconciliation } from '@/lib/sync/reconcile';
import { runIncrementalSync } from '@/lib/sync/sync-service';

export const dynamic = 'force-dynamic';

const metadataPatchSchema = z
  .object({
    visibility: z.enum(['private', 'public', 'unlisted']).optional(),
    contentType: z.enum(['blog', 'docs']).optional(),
    published: z.boolean().optional(),
    summary: z.string().trim().optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
    slug: z.string().trim().min(1).optional(),
    date: z.string().trim().min(1).optional(),
    updatedAt: z.string().trim().min(1).optional(),
    docSection: z.string().trim().min(1).optional(),
    cover: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ParsedMetadataRequest =
  | {
      ok: true;
      patch: Record<string, unknown>;
      wantsHtml: boolean;
    }
  | {
      ok: false;
      error: string;
      wantsHtml: boolean;
      details?: unknown;
    };

type SafeAuditDiffSummary = {
  fields: Array<{
    field: string;
    changed: true;
  }>;
  count: number;
};

async function handleMetadataWrite(request: Request, context: RouteContext) {
  return withAdminRoute(async (actor, adminRequest) => {
    const { id } = await context.params;
    const parsed = await parseMetadataRequest(adminRequest);
    if (!parsed.ok) {
      return respondError(parsed.error, 400, parsed.wantsHtml, adminRequest.url, parsed.details);
    }

    const content = await findContentItemById(id);
    if (!content) {
      return respondError('content_not_found', 404, parsed.wantsHtml, adminRequest.url);
    }

    const writeback = await writebackFrontmatterPatch({
      path: content.sourcePath,
      patch: parsed.patch,
      actorId: actor.githubLogin,
      contentId: content.id,
      relativePath: toRelativeContentPath(content.sourcePath),
    });

    if (!writeback.ok) {
      return respondError(
        writeback.error.code,
        statusForWritebackError(writeback.error.code, writeback.error.status),
        parsed.wantsHtml,
        adminRequest.url,
        {
          message: writeback.error.message,
          details: writeback.error.details,
        },
      );
    }

    const auditDiff = toSafeAuditDiff(writeback.patch.diff);
    const audit = await recordWritebackAudit({
      actorId: actor.githubLogin,
      contentId: content.id,
      sourcePath: content.sourcePath,
      diffSummary: auditDiff,
      branch: writeback.branch,
      commitSha: writeback.commitSha,
      fileShaBefore: writeback.fileShaBefore,
      fileShaAfter: writeback.fileShaAfter,
    });

    const sync = await createAndRunWritebackSync({
      requestedBy: actor.githubLogin,
      before: writeback.parentCommitSha,
      after: writeback.commitSha,
    });

    if (parsed.wantsHtml) {
      const statusParam = audit.ok ? 'updated' : 'audit_failed';
      return Response.redirect(
        new URL(
          `/admin/content?${statusParam}=${encodeURIComponent(content.id)}&job=${encodeURIComponent(sync.jobId)}`,
          adminRequest.url,
        ),
        303,
      );
    }

    return Response.json({
      ok: true,
      contentId: content.id,
      sourcePath: content.sourcePath,
      before: writeback.patch.before,
      after: writeback.patch.after,
      diff: {
        fields: writeback.patch.diff,
      },
      audit,
      writeback: {
        branch: writeback.branch,
        commitSha: writeback.commitSha,
        fileShaBefore: writeback.fileShaBefore,
        fileShaAfter: writeback.fileShaAfter,
      },
      sync,
    });
  })(request);
}

export function POST(request: Request, context: RouteContext) {
  return handleMetadataWrite(request, context);
}

export function PATCH(request: Request, context: RouteContext) {
  return handleMetadataWrite(request, context);
}

async function parseMetadataRequest(request: Request): Promise<ParsedMetadataRequest> {
  const contentType = request.headers.get('content-type') ?? '';
  const wantsHtml = contentType.includes('application/x-www-form-urlencoded');

  if (contentType.includes('application/json')) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return {
        ok: false,
        error: 'invalid_json',
        wantsHtml,
      };
    }

    return parsePatch(body, wantsHtml);
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    const candidate: Record<string, unknown> = {};

    for (const [key, value] of formData.entries()) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        continue;
      }

      if (key === 'published') {
        const parsedBoolean = parseFormBoolean(value);
        if (!parsedBoolean.ok) {
          return {
            ok: false,
            error: 'invalid_metadata',
            wantsHtml,
          };
        }

        candidate[key] = parsedBoolean.value;
        continue;
      }

      candidate[key] = value.trim();
    }

    return parsePatch(normalizeFormPatch(candidate), wantsHtml);
  }

  return {
    ok: false,
    error: 'unsupported_content_type',
    wantsHtml,
  };
}

function parsePatch(body: unknown, wantsHtml: boolean): ParsedMetadataRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      error: 'invalid_body',
      wantsHtml,
    };
  }

  const parsed = metadataPatchSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'invalid_metadata',
      wantsHtml,
      details: parsed.error.flatten(),
    };
  }

  if (Object.keys(parsed.data).length === 0) {
    return {
      ok: false,
      error: 'empty_metadata_patch',
      wantsHtml,
    };
  }

  return {
    ok: true,
    patch: parsed.data,
    wantsHtml,
  };
}

function normalizeFormPatch(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (key === 'tags' && typeof value === 'string') {
        return [
          key,
          value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        ];
      }

      return [key, value];
    }),
  );
}

function parseFormBoolean(value: string):
  | {
      ok: true;
      value: boolean;
    }
  | {
      ok: false;
    } {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === 'on' || normalized === '1') {
    return {
      ok: true,
      value: true,
    };
  }

  if (normalized === 'false' || normalized === 'off' || normalized === '0') {
    return {
      ok: true,
      value: false,
    };
  }

  return {
    ok: false,
  };
}

function toSafeAuditDiff(
  diff: Array<{
    field: string;
  }>,
): SafeAuditDiffSummary {
  return {
    count: diff.length,
    fields: diff.map((entry) => ({
      field: entry.field,
      changed: true,
    })),
  };
}

async function recordWritebackAudit(input: {
  actorId: string;
  contentId: string;
  sourcePath: string;
  diffSummary: SafeAuditDiffSummary;
  branch: string;
  commitSha: string;
  fileShaBefore: string;
  fileShaAfter?: string;
}): Promise<{ ok: true } | { ok: false; error: 'audit_failed' }> {
  try {
    await recordAuditEvent({
      actor: {
        type: ActorType.ADMIN,
        id: input.actorId,
      },
      action: 'content.metadata.writeback',
      target: {
        type: 'content',
        id: input.contentId,
        path: input.sourcePath,
      },
      diff: input.diffSummary,
      metadata: {
        branch: input.branch,
        commitSha: input.commitSha,
        fileShaBefore: input.fileShaBefore,
        fileShaAfter: input.fileShaAfter,
      },
    });

    return {
      ok: true,
    };
  } catch {
    return {
      ok: false,
      error: 'audit_failed',
    };
  }
}

async function createAndRunWritebackSync(input: {
  requestedBy: string;
  before?: string;
  after: string;
}) {
  const canIncremental = Boolean(input.before);
  const job = await createSyncJob({
    trigger: SyncTrigger.MANUAL,
    status: SyncStatus.QUEUED,
    requestedBy: input.requestedBy,
    sourceRef: input.after,
    result: {
      mode: canIncremental ? 'incremental' : 'reconcile',
      queue: {
        mode: 'inline',
        message: 'No background queue is configured; sync executed inline in the request.',
      },
    },
  });

  const result =
    canIncremental && input.before
      ? await runIncrementalSync({
          jobId: job.id,
          before: input.before,
          after: input.after,
        })
      : await runReconciliation({
          jobId: job.id,
          sourceRef: input.after,
          reason: 'GitHub writeback response did not include a parent commit; reconciliation ran inline.',
        });

  return {
    jobId: job.id,
    mode: result.mode,
    status: result.status,
    queue: result.queue,
  };
}

function toRelativeContentPath(sourcePath: string) {
  return sourcePath.replace(/^content\/(?:blog|docs)\/?/, '');
}

function respondError(
  error: string,
  status: number,
  wantsHtml: boolean,
  requestUrl: string,
  details?: unknown,
) {
  if (wantsHtml) {
    return Response.redirect(
      new URL(`/admin/content?error=${encodeURIComponent(error)}`, requestUrl),
      303,
    );
  }

  return Response.json(
    {
      ok: false,
      error,
      details,
    },
    { status },
  );
}

function statusForWritebackError(code: GitHubWritebackErrorCode, githubStatus?: number) {
  if (code === 'validation_error') {
    return 400;
  }

  if (code === 'conflict') {
    return 409;
  }

  if (code === 'not_found') {
    return 404;
  }

  if (code === 'unauthorized' || code === 'rate_limited') {
    return githubStatus ?? (code === 'unauthorized' ? 401 : 403);
  }

  if (code === 'missing_config') {
    return 500;
  }

  return 502;
}
