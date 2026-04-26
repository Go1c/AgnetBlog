import { withAdminRoute } from '@/lib/auth/admin';
import { revokeContentShare } from '@/lib/db/share-repository';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export function POST(request: Request, context: RouteContext) {
  return withAdminRoute(async (_actor, adminRequest) => {
    const { id } = await context.params;
    const parsed = await parseRevokeRequest(adminRequest);

    try {
      const share = await revokeContentShare(id);

      if (parsed.wantsHtml) {
        return redirectTo(parsed.returnTo ?? `/admin/content/${encodeURIComponent(share.contentItemId)}`, {
          share_revoked: share.id,
        });
      }

      return Response.json({
        ok: true,
        share: {
          id: share.id,
          revokedAt: share.revokedAt,
        },
      });
    } catch {
      if (parsed.wantsHtml) {
        return redirectTo(parsed.returnTo ?? '/admin/content', { error: 'share_not_found' });
      }

      return Response.json({ ok: false, error: 'share_not_found' }, { status: 404 });
    }
  })(request);
}

async function parseRevokeRequest(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const wantsHtml = contentType.includes('application/x-www-form-urlencoded');

  if (!wantsHtml) {
    return { wantsHtml, returnTo: undefined };
  }

  const formData = await request.formData();
  const rawReturnTo = formData.get('returnTo');
  const returnTo = typeof rawReturnTo === 'string' ? safeAdminReturnPath(rawReturnTo) : undefined;

  return { wantsHtml, returnTo };
}

function redirectTo(path: string, params: Record<string, string>) {
  const url = new URL(path, 'http://localhost');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return new Response(null, {
    status: 303,
    headers: { Location: `${url.pathname}${url.search}` },
  });
}

function safeAdminReturnPath(value: string | null | undefined) {
  if (!value?.startsWith('/admin/') || value.startsWith('//')) {
    return undefined;
  }

  return value;
}
