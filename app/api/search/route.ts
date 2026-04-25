import { searchPublicContent } from '@/lib/search/public-search';

function parseLimit(value: string | null) {
  if (!value) {
    return undefined;
  }

  const limit = Number(value);
  return Number.isInteger(limit) && limit > 0 ? limit : undefined;
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') ?? url.searchParams.get('q') ?? '';
  const tag = url.searchParams.get('tag')?.split(',').filter(Boolean);

  if (!query.trim()) {
    return Response.json([]);
  }

  return Response.json(
    searchPublicContent(query, {
      limit: parseLimit(url.searchParams.get('limit')),
      tag,
    }),
  );
}

