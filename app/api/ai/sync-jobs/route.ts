import { recordAiAuditEvent } from '@/lib/ai/audit';
import { requireAiScopes } from '@/lib/ai/guard';
import { listSyncJobs } from '@/lib/db/sync-job-repository';
import { SyncStatus } from '@/lib/generated/prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAiScopes(request, ['content:read']);
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const status = parseSyncStatus(url.searchParams.get('status'));
  const limit = clampLimit(url.searchParams.get('limit'), 20, 100);
  const jobs = await listSyncJobs({
    where: status ? { status } : undefined,
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
  const audit = await recordAiAuditEvent({
    tokenId: guard.actor.tokenId,
    action: 'sync_jobs.read',
    target: {
      type: 'sync_jobs',
      id: 'collection',
    },
    metadata: {
      count: jobs.length,
      status,
      limit,
    },
  });
  if (!audit.ok) {
    return Response.json(
      {
        ok: false,
        error: audit.error,
      },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    jobs,
  });
}

function parseSyncStatus(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();

  return Object.values(SyncStatus).find((status) => status === normalized);
}

function clampLimit(value: string | null, fallback: number, max: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}
