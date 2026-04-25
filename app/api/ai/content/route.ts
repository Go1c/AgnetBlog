import { requireAiScopes } from '@/lib/ai/guard';
import { recordAiAuditEvent } from '@/lib/ai/audit';
import { hasAiScope } from '@/lib/ai/scopes';
import { canReadContent, serializeContentItem } from '@/lib/ai/content';
import { listContentItems } from '@/lib/db/content-repository';
import { ContentType } from '@/lib/generated/prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAiScopes(request, ['content:read']);
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const requestedType = parseContentType(url.searchParams.get('type'));
  const limit = clampLimit(url.searchParams.get('limit'), 50, 100);
  const includePrivate = hasAiScope(guard.actor.scopes, 'content:read-private');
  const items = await listContentItems({
    orderBy: [{ updatedAt: 'desc' }],
    take: includePrivate ? limit : Math.max(limit * 3, 100),
  });
  const visibleItems = items
    .filter((item) => canReadContent(item, includePrivate))
    .filter((item) => !requestedType || item.type === requestedType)
    .slice(0, limit)
    .map(serializeContentItem);
  const audit = await recordAiAuditEvent({
    tokenId: guard.actor.tokenId,
    action: 'content.list',
    target: {
      type: 'content_collection',
      id: 'all',
    },
    metadata: {
      count: visibleItems.length,
      includePrivate,
      contentType: requestedType?.toLowerCase(),
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
    items: visibleItems,
  });
}

function parseContentType(value: string | null) {
  if (value === 'blog') {
    return ContentType.BLOG;
  }

  if (value === 'docs') {
    return ContentType.DOCS;
  }

  return undefined;
}

function clampLimit(value: string | null, fallback: number, max: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}
