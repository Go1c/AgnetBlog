import { z } from 'zod';

import { recordAuditEvent } from '@/lib/audit/audit-service';
import { withAdminRoute } from '@/lib/auth/admin';
import { findContentItemById } from '@/lib/db/content-repository';
import { createSyncJob } from '@/lib/db/sync-job-repository';
import { ActorType, SyncStatus, SyncTrigger } from '@/lib/generated/prisma/client';
import { writebackFrontmatterPatch } from '@/lib/github/writeback';
import { runIncrementalSync } from '@/lib/sync/sync-service';
import { runReconciliation } from '@/lib/sync/reconcile';

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
        writeback.error.status ?? 400,
        parsed.wantsHtml,
        adminRequest.url,
        {
          message: writeback.error.message,
          details: writeback.error.details,
        },
      );
    }

    const diffSummary = {
      fields: writeback.patch.diff,
    };

    await recordAuditEvent({
      actor: {
        type: ActorType.ADMIN,
        id: actor.githubLogin,
      },
      action: 'content.metadata.writeback',
      target: {
        type: 'content',
        id: content.id,
        path: content.sourcePath,
      },
      diff: diffSummary,
      metadata: {
        branch: writeback.branch,
        commitSha: writeback.commitSha,
        fileShaBefore: writeback.fileShaBefore,
        fileShaAfter: writeback.fileShaAfter,
      },
    });

    const sync = await createAndRunWritebackSync({
      requestedBy: actor.githubLogin,
      before: writeback.parentCommitSha,
      after: writeback.commitSha,
    });

    if (parsed.wantsHtml) {
      return Response.redirect(
        new URL(
          `/admin/content?updated=${encodeURIComponent(content.id)}&job=${encodeURIComponent(sync.jobId)}`,
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
      diff: diffSummary,
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

      candidate[key] = key === 'published' ? parseBoolean(value) : value.trim();
    }

    return parsePatch(candidate, wantsHtml);
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

  const normalized = normalizePatch(body as Record<string, unknown>);
  const parsed = metadataPatchSchema.safeParse(normalized);
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

function normalizePatch(input: Record<string, unknown>) {
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

      if (key === 'published' && typeof value === 'string') {
        return [key, parseBoolean(value)];
      }

      return [key, value];
    }),
  );
}

function parseBoolean(value: string) {
  return value === 'true' || value === 'on' || value === '1';
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
