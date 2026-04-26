import { cookies } from 'next/headers';

import { findUsableShareByToken, ShareAccessMode } from '@/lib/db/share-repository';
import {
  createShareAccessCookieName,
  createShareAccessCookieValue,
  getShareAccessCookieSecret,
  SHARE_ACCESS_COOKIE_MAX_AGE_SECONDS,
} from '@/lib/share/access-cookie';
import { verifySharePassword } from '@/lib/share/password';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const contentType = request.headers.get('content-type') ?? '';
  const wantsHtml = contentType.includes('application/x-www-form-urlencoded');
  const parsed = await parseUnlockRequest(request, wantsHtml);
  const share = await findUsableShareByToken(token);

  if (!share || share.accessMode !== ShareAccessMode.PASSWORD) {
    return respondError('share_not_found', 404, wantsHtml, parsed.returnTo, token);
  }

  const passwordMatches = await verifySharePassword(parsed.password, share.passwordHash);
  if (!passwordMatches) {
    return respondError('invalid_password', 401, wantsHtml, parsed.returnTo, token);
  }

  const secret = getShareAccessCookieSecret();
  if (!secret) {
    return respondError('cookie_secret_missing', 500, wantsHtml, parsed.returnTo, token);
  }

  const expiresAt = new Date(Date.now() + SHARE_ACCESS_COOKIE_MAX_AGE_SECONDS * 1000);
  const cookieStore = await cookies();
  cookieStore.set({
    name: createShareAccessCookieName(token),
    value: createShareAccessCookieValue({ token, secret, expiresAt }),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SHARE_ACCESS_COOKIE_MAX_AGE_SECONDS,
  });

  if (wantsHtml) {
    return redirectTo(safeShareReturnPath(parsed.returnTo, token) ?? `/s/${encodeURIComponent(token)}`);
  }

  return Response.json({ ok: true });
}

async function parseUnlockRequest(request: Request, wantsHtml: boolean) {
  if (wantsHtml) {
    const formData = await request.formData();
    const password = formData.get('password');
    const returnTo = formData.get('returnTo');

    return {
      password: typeof password === 'string' ? password : '',
      returnTo: typeof returnTo === 'string' ? returnTo : undefined,
    };
  }

  if ((request.headers.get('content-type') ?? '').includes('application/json')) {
    try {
      const body = (await request.json()) as { password?: unknown; returnTo?: unknown };
      return {
        password: typeof body.password === 'string' ? body.password : '',
        returnTo: typeof body.returnTo === 'string' ? body.returnTo : undefined,
      };
    } catch {
      return { password: '', returnTo: undefined };
    }
  }

  return { password: '', returnTo: undefined };
}

function respondError(
  error: string,
  status: number,
  wantsHtml: boolean,
  returnTo: string | undefined,
  token: string,
) {
  if (wantsHtml) {
    return redirectTo(withQuery(safeShareReturnPath(returnTo, token) ?? `/s/${encodeURIComponent(token)}`, { error }));
  }

  return Response.json({ ok: false, error }, { status });
}

function redirectTo(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path },
  });
}

function safeShareReturnPath(value: string | undefined, token: string) {
  const prefix = `/s/${encodeURIComponent(token)}`;

  if (!value || value.startsWith('//') || !value.startsWith(prefix)) {
    return undefined;
  }

  return value;
}

function withQuery(path: string, params: Record<string, string>) {
  const url = new URL(path, 'http://localhost');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return `${url.pathname}${url.search}`;
}
