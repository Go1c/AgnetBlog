import { cookies } from 'next/headers';

import {
  canShareAccessCommentTarget,
  isPubliclyCommentableContent,
} from '@/lib/comments/access';
import { validateCommentInput, type ValidatedCommentInput } from '@/lib/comments/validation';
import { isDirectlyReadable } from '@/lib/content/visibility';
import { createContentComment, listContentComments } from '@/lib/db/comment-repository';
import { findContentItemById } from '@/lib/db/content-repository';
import { findUsableShareByToken, ShareAccessMode } from '@/lib/db/share-repository';
import {
  createShareAccessCookieName,
  getShareAccessCookieSecret,
  verifyShareAccessCookieValue,
} from '@/lib/share/access-cookie';
import { source } from '@/lib/source';

export const dynamic = 'force-dynamic';

type ParsedCommentRequest =
  | {
      ok: true;
      input: {
        contentItemId?: unknown;
        targetKey?: unknown;
        body?: unknown;
        displayName?: unknown;
        shareToken?: unknown;
      };
      responseMode: 'json' | 'redirect';
      returnTo?: string;
    }
  | {
      ok: false;
      error: 'invalid_json' | 'invalid_body' | 'unsupported_content_type';
      responseMode: 'json' | 'redirect';
      returnTo?: string;
    };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const contentItemId = url.searchParams.get('contentItemId')?.trim();
  const targetKey = url.searchParams.get('targetKey')?.trim();

  if (!contentItemId && !targetKey) {
    return Response.json(
      {
        ok: false,
        error: 'comment_target_required',
      },
      { status: 400 },
    );
  }

  const target = await resolveReadableCommentTarget({
    contentItemId: contentItemId || null,
    targetKey: targetKey || null,
    shareToken: url.searchParams.get('shareToken'),
  });
  if (!target.ok) {
    return Response.json(
      {
        ok: false,
        error: target.error,
      },
      { status: target.status },
    );
  }

  const comments = await listContentComments(target.target);

  return Response.json({
    ok: true,
    comments,
  });
}

export async function POST(request: Request) {
  const parsed = await parseCommentRequest(request);

  if (!parsed.ok) {
    return respondToCommentRequest(request, parsed.responseMode, parsed.returnTo, {
      ok: false,
      error: parsed.error,
      status: 400,
    });
  }

  const validated = validateCommentInput(parsed.input);
  if (!validated.ok) {
    return respondToCommentRequest(request, parsed.responseMode, parsed.returnTo, {
      ok: false,
      error: validated.error,
      status: 400,
    });
  }

  const target = await resolveReadableCommentTarget({
    ...validated.data,
    shareToken: stringValue(parsed.input.shareToken),
  });
  if (!target.ok) {
    return respondToCommentRequest(request, parsed.responseMode, parsed.returnTo, {
      ok: false,
      error: target.error,
      status: target.status,
    });
  }

  const comment = await createContentComment({
    ...validated.data,
    ...target.target,
  });

  return respondToCommentRequest(request, parsed.responseMode, parsed.returnTo, {
    ok: true,
    comment,
    status: 201,
  });
}

async function parseCommentRequest(request: Request): Promise<ParsedCommentRequest> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return {
        ok: false,
        error: 'invalid_json',
        responseMode: 'json',
      };
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return {
        ok: false,
        error: 'invalid_body',
        responseMode: 'json',
      };
    }

    return {
      ok: true,
      input: body as Record<string, unknown>,
      responseMode: 'json',
    };
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData();

    return {
      ok: true,
      input: {
        contentItemId: formData.get('contentItemId'),
        targetKey: formData.get('targetKey'),
        body: formData.get('body'),
        displayName: formData.get('displayName'),
        shareToken: formData.get('shareToken'),
      },
      responseMode: 'redirect',
      returnTo: getFormString(formData, 'returnTo'),
    };
  }

  return {
    ok: false,
    error: 'unsupported_content_type',
    responseMode: 'json',
  };
}

function respondToCommentRequest(
  request: Request,
  responseMode: 'json' | 'redirect',
  returnTo: string | undefined,
  result:
    | {
        ok: true;
        comment: Awaited<ReturnType<typeof createContentComment>>;
        status: number;
      }
    | {
        ok: false;
        error: string;
        status: number;
      },
) {
  if (responseMode === 'redirect') {
    return new Response(null, {
      status: 303,
      headers: {
        Location: buildCommentRedirectLocation(request, returnTo, result),
      },
    });
  }

  if (result.ok) {
    return Response.json(
      {
        ok: true,
        comment: result.comment,
      },
      { status: result.status },
    );
  }

  return Response.json(
    {
      ok: false,
      error: result.error,
    },
    { status: result.status },
  );
}

function buildCommentRedirectLocation(
  request: Request,
  returnTo: string | undefined,
  result: { ok: true } | { ok: false; error: string },
) {
  const target = new URL(
    safeReturnPath(returnTo) ?? safeReferrerPath(request) ?? '/',
    'https://local.invalid',
  );

  if (result.ok) {
    target.searchParams.set('comment', 'posted');
  } else {
    target.searchParams.set('comment_error', result.error);
  }

  return `${target.pathname}${target.search}${target.hash}`;
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

type ResolvedCommentTarget =
  | {
      ok: true;
      target:
        | {
            contentItemId: string;
            targetKey?: never;
          }
        | {
            contentItemId?: never;
            targetKey: string;
          };
    }
  | {
      ok: false;
      error: 'content_not_found' | 'comments_forbidden';
      status: 403 | 404;
    };

async function resolveReadableCommentTarget(
  input: Pick<ValidatedCommentInput, 'contentItemId' | 'targetKey'> & {
    shareToken?: string | null;
  },
): Promise<ResolvedCommentTarget> {
  if (input.contentItemId) {
    const content = await findContentItemById(input.contentItemId);
    if (!content) {
      return { ok: false, error: 'content_not_found', status: 404 };
    }

    if (!(await canAccessContentComments({ content, shareToken: input.shareToken }))) {
      return { ok: false, error: 'comments_forbidden', status: 403 };
    }

    return { ok: true, target: { contentItemId: content.id } };
  }

  if (input.targetKey && isReadableStaticDocsTarget(input.targetKey)) {
    return { ok: true, target: { targetKey: input.targetKey } };
  }

  return { ok: false, error: 'comments_forbidden', status: 403 };
}

async function canAccessContentComments({
  content,
  shareToken,
}: {
  content: NonNullable<Awaited<ReturnType<typeof findContentItemById>>>;
  shareToken?: string | null;
}) {
  if (isPubliclyCommentableContent(content)) {
    return true;
  }

  const normalizedToken = shareToken?.trim();
  if (!normalizedToken) {
    return false;
  }

  const share = await findUsableShareByToken(normalizedToken);
  if (!share) {
    return false;
  }

  return canShareAccessCommentTarget({
    content,
    share,
    hasPasswordAccess: await hasPasswordShareAccess(normalizedToken, share.accessMode),
  });
}

async function hasPasswordShareAccess(token: string, accessMode: ShareAccessMode) {
  if (accessMode !== ShareAccessMode.PASSWORD) {
    return true;
  }

  const secret = getShareAccessCookieSecret();
  if (!secret) {
    return false;
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(createShareAccessCookieName(token))?.value;

  return verifyShareAccessCookieValue(cookieValue, { token, secret });
}

function isReadableStaticDocsTarget(targetKey: string) {
  const slug = parseStaticDocsTargetKey(targetKey);
  if (slug === null) {
    return false;
  }

  const page = source.getPage(slug === 'index' ? [] : slug.split('/'));
  return Boolean(page && isDirectlyReadable(page));
}

function parseStaticDocsTargetKey(targetKey: string) {
  const prefix = 'docs:';
  if (!targetKey.startsWith(prefix)) {
    return null;
  }

  const slug = targetKey.slice(prefix.length).trim();
  return slug.length > 0 ? slug : null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function safeReturnPath(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return undefined;
  }

  const target = new URL(trimmed, 'https://local.invalid');
  return `${target.pathname}${target.search}${target.hash}`;
}

function safeReferrerPath(request: Request) {
  const referrer = request.headers.get('referer');
  if (!referrer) {
    return undefined;
  }

  try {
    const requestUrl = new URL(request.url);
    const referrerUrl = new URL(referrer);
    if (referrerUrl.origin !== requestUrl.origin) {
      return undefined;
    }

    return `${referrerUrl.pathname}${referrerUrl.search}${referrerUrl.hash}`;
  } catch {
    return undefined;
  }
}
