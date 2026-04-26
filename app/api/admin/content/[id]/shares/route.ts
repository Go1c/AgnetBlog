import { withAdminRoute } from '@/lib/auth/admin';
import { findContentItemById } from '@/lib/db/content-repository';
import {
  createContentShare,
  ShareAccessMode,
  ShareNavigationScope,
  type ShareAccessModeValue,
  type ShareNavigationScopeValue,
} from '@/lib/db/share-repository';
import { hashSharePassword } from '@/lib/share/password';
import { generateShortShareToken } from '@/lib/share/short-token';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ParsedShareRequest =
  | {
      ok: true;
      wantsHtml: boolean;
      returnTo?: string;
      accessMode: ShareAccessModeValue;
      navigationScope: ShareNavigationScopeValue;
      password: string | null;
    }
  | {
      ok: false;
      wantsHtml: boolean;
      returnTo?: string;
      error: string;
    };

export function POST(request: Request, context: RouteContext) {
  return withAdminRoute(async (actor, adminRequest) => {
    const { id } = await context.params;
    const parsed = await parseShareRequest(adminRequest);

    if (!parsed.ok) {
      return respondError(parsed.error, 400, parsed);
    }

    const content = await findContentItemById(id);
    if (!content) {
      return respondError('content_not_found', 404, parsed);
    }

    const passwordHash =
      parsed.accessMode === ShareAccessMode.PASSWORD
        ? await hashSharePassword(parsed.password ?? '')
        : null;
    const share = await createShareWithUniqueToken({
      contentItemId: content.id,
      accessMode: parsed.accessMode,
      navigationScope: parsed.navigationScope,
      passwordHash,
      createdByLogin: actor.githubLogin,
    });

    if (parsed.wantsHtml) {
      return redirectTo(parsed.returnTo ?? `/admin/content/${encodeURIComponent(content.id)}`, {
        share_created: share.id,
      });
    }

    return Response.json({
      ok: true,
      share: {
        id: share.id,
        contentItemId: share.contentItemId,
        token: share.token,
        url: absoluteShareUrl(adminRequest, share.token),
        accessMode: share.accessMode,
        navigationScope: share.navigationScope,
        revokedAt: share.revokedAt,
        createdAt: share.createdAt,
      },
    });
  })(request);
}

async function parseShareRequest(request: Request): Promise<ParsedShareRequest> {
  const contentType = request.headers.get('content-type') ?? '';
  const wantsHtml = contentType.includes('application/x-www-form-urlencoded');

  if (contentType.includes('application/json')) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return { ok: false, wantsHtml, error: 'invalid_json' };
    }

    return parseShareFields(body, wantsHtml);
  }

  if (wantsHtml) {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    const returnTo = stringValue(body.returnTo);

    return withReturnTo(parseShareFields(body, wantsHtml), safeAdminReturnPath(returnTo));
  }

  return { ok: false, wantsHtml, error: 'unsupported_content_type' };
}

function parseShareFields(body: unknown, wantsHtml: boolean): ParsedShareRequest {
  if (!isRecord(body)) {
    return { ok: false, wantsHtml, error: 'invalid_share_request' };
  }

  const accessMode = stringValue(body.accessMode);
  const navigationScope = stringValue(body.navigationScope);
  const password = stringValue(body.password)?.trim() ?? null;

  if (!isShareAccessMode(accessMode) || !isShareNavigationScope(navigationScope)) {
    return { ok: false, wantsHtml, error: 'invalid_share_request' };
  }

  if (accessMode === ShareAccessMode.PASSWORD && !password) {
    return { ok: false, wantsHtml, error: 'password_required' };
  }

  return {
    ok: true,
    wantsHtml,
    accessMode,
    navigationScope,
    password,
  };
}

async function createShareWithUniqueToken(input: {
  contentItemId: string;
  accessMode: ShareAccessModeValue;
  navigationScope: ShareNavigationScopeValue;
  passwordHash: string | null;
  createdByLogin: string | null;
}) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await createContentShare({
        ...input,
        token: generateShortShareToken(),
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('share_token_create_failed');
}

function respondError(
  error: string,
  status: number,
  parsed: Pick<ParsedShareRequest, 'wantsHtml' | 'returnTo'>,
) {
  if (parsed.wantsHtml) {
    return redirectTo(parsed.returnTo ?? '/admin/content', { error });
  }

  return Response.json({ ok: false, error }, { status });
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

function withReturnTo(parsed: ParsedShareRequest, returnTo: string | undefined) {
  return { ...parsed, returnTo };
}

function safeAdminReturnPath(value: string | null | undefined) {
  if (!value?.startsWith('/admin/')) {
    return undefined;
  }

  return value.startsWith('//') ? undefined : value;
}

function absoluteShareUrl(request: Request, token: string) {
  return new URL(`/s/${encodeURIComponent(token)}`, request.url).toString();
}

function isShareAccessMode(value: string | null): value is ShareAccessModeValue {
  return value === ShareAccessMode.LINK || value === ShareAccessMode.PASSWORD;
}

function isShareNavigationScope(value: string | null): value is ShareNavigationScopeValue {
  return (
    value === ShareNavigationScope.CURRENT_ONLY ||
    value === ShareNavigationScope.NAVIGABLE
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}
