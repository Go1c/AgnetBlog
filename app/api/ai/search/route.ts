import { canReadContent, contentUrl } from '@/lib/ai/content';
import { requireAiScopes } from '@/lib/ai/guard';
import { recordAiAuditEvent } from '@/lib/ai/audit';
import { hasAiScope } from '@/lib/ai/scopes';
import { listContentItems } from '@/lib/db/content-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAiScopes(request, ['content:read']);
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('query') ?? url.searchParams.get('q') ?? '';
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return Response.json({
      ok: true,
      results: [],
    });
  }

  const limit = clampLimit(url.searchParams.get('limit'), 20, 100);
  const includePrivate = hasAiScope(guard.actor.scopes, 'content:read-private');
  const items = await listContentItems({
    orderBy: [{ updatedAt: 'desc' }],
    take: includePrivate ? 500 : 250,
  });
  const results = items
    .filter((item) => canReadContent(item, includePrivate))
    .map((item) => ({
      item,
      score: scoreItem(item, terms),
    }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title))
    .slice(0, limit)
    .map((result) => ({
      id: result.item.id,
      title: result.item.title,
      description: result.item.description,
      url: contentUrl(result.item),
      sourcePath: result.item.sourcePath,
      contentType: result.item.type.toLowerCase(),
      visibility: result.item.visibility.toLowerCase(),
      published: result.item.published,
      score: result.score,
    }));
  const audit = await recordAiAuditEvent({
    tokenId: guard.actor.tokenId,
    action: 'content.search',
    target: {
      type: 'content_search',
      id: 'query',
    },
    metadata: {
      count: results.length,
      includePrivate,
      queryLength: query.trim().length,
      terms: terms.length,
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
    results,
  });
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreItem(
  item: {
    title: string;
    description: string | null;
    slug: string;
    sourcePath: string;
  },
  terms: string[],
) {
  const title = normalize(item.title);
  const haystack = [item.title, item.description, item.slug, item.sourcePath]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!terms.every((term) => haystack.includes(term))) {
    return 0;
  }

  return terms.reduce((score, term) => {
    if (title === term) {
      return score + 20;
    }

    if (title.includes(term)) {
      return score + 10;
    }

    if (item.slug.includes(term)) {
      return score + 5;
    }

    return score + 1;
  }, 0);
}

function clampLimit(value: string | null, fallback: number, max: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}
