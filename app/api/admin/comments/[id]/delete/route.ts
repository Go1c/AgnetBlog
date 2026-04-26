import { withAdminRoute } from '@/lib/auth/admin';
import { softDeleteContentComment } from '@/lib/db/comment-repository';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export function POST(request: Request, context: RouteContext) {
  return deleteComment(request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return deleteComment(request, context);
}

function deleteComment(request: Request, context: RouteContext) {
  return withAdminRoute(async (actor, adminRequest) => {
    const { id } = await context.params;
    const parsed = await parseDeleteRequest(adminRequest);

    try {
      const comment = await softDeleteContentComment({
        id,
        deletedByAdminLogin: actor.githubLogin,
      });

      if (parsed.responseMode === 'redirect') {
        return redirectAfterDelete(parsed.returnTo, { ok: true });
      }

      return Response.json({
        ok: true,
        comment,
      });
    } catch {
      if (parsed.responseMode === 'redirect') {
        return redirectAfterDelete(parsed.returnTo, {
          ok: false,
          error: 'comment_not_found',
        });
      }

      return Response.json(
        {
          ok: false,
          error: 'comment_not_found',
        },
        { status: 404 },
      );
    }
  })(request);
}

async function parseDeleteRequest(request: Request): Promise<{
  responseMode: 'json' | 'redirect';
  returnTo?: string;
}> {
  const contentType = request.headers.get('content-type') ?? '';

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData();
    const rawReturnTo = formData.get('returnTo');

    return {
      responseMode: 'redirect',
      returnTo: typeof rawReturnTo === 'string' ? rawReturnTo : undefined,
    };
  }

  return {
    responseMode: 'json',
  };
}

function redirectAfterDelete(
  returnTo: string | undefined,
  result: { ok: true } | { ok: false; error: string },
) {
  const target = new URL(safeReturnPath(returnTo) ?? '/', 'https://local.invalid');

  if (result.ok) {
    target.searchParams.set('comment_deleted', '1');
  } else {
    target.searchParams.set('comment_error', result.error);
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: `${target.pathname}${target.search}${target.hash}`,
    },
  });
}

function safeReturnPath(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return undefined;
  }

  const target = new URL(trimmed, 'https://local.invalid');
  return `${target.pathname}${target.search}${target.hash}`;
}
