import type { ManualSyncRequest } from '@/lib/sync/types';

type ManualSyncParseOptions = {
  allowFormRedirect?: boolean;
};

export type ManualSyncParseResult =
  | {
      ok: true;
      data: ManualSyncRequest;
      responseMode: 'json' | 'redirect';
      returnTo?: string;
    }
  | {
      ok: false;
      error: string;
      responseMode: 'json' | 'redirect';
      returnTo?: string;
    };

export async function parseManualSyncRequest(
  request: Request,
  options: ManualSyncParseOptions = {},
): Promise<ManualSyncParseResult> {
  const text = await request.text();
  const contentType = request.headers.get('content-type') ?? '';
  const isForm = contentType.includes('application/x-www-form-urlencoded');
  const responseMode = isForm && options.allowFormRedirect ? 'redirect' : 'json';

  if (text.trim().length === 0) {
    return {
      ok: true,
      data: {},
      responseMode,
    };
  }

  if (isForm) {
    const form = new URLSearchParams(text);
    const parsed = parseManualSyncRecord({
      mode: emptyToUndefined(form.get('mode')),
      before: emptyToUndefined(form.get('before')),
      after: emptyToUndefined(form.get('after')),
    });
    const returnTo = safeReturnPath(form.get('returnTo'));

    return parsed.ok
      ? {
          ...parsed,
          responseMode,
          returnTo,
        }
      : {
          ...parsed,
          responseMode,
          returnTo,
        };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      error: 'invalid_json',
      responseMode,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      error: 'invalid_body',
      responseMode,
    };
  }

  return {
    ...parseManualSyncRecord(parsed as Record<string, unknown>),
    responseMode,
  };
}

function parseManualSyncRecord(
  candidate: Record<string, unknown>,
): { ok: true; data: ManualSyncRequest } | { ok: false; error: string } {
  if (
    candidate.mode !== undefined &&
    candidate.mode !== 'reconcile' &&
    candidate.mode !== 'incremental'
  ) {
    return {
      ok: false,
      error: 'invalid_mode',
    };
  }

  if (candidate.before !== undefined && typeof candidate.before !== 'string') {
    return {
      ok: false,
      error: 'invalid_before',
    };
  }

  if (candidate.after !== undefined && typeof candidate.after !== 'string') {
    return {
      ok: false,
      error: 'invalid_after',
    };
  }

  return {
    ok: true,
    data: {
      mode: candidate.mode,
      before: candidate.before,
      after: candidate.after,
    } as ManualSyncRequest,
  };
}

function emptyToUndefined(value: string | null) {
  return value?.trim() || undefined;
}

function safeReturnPath(value: string | null) {
  const trimmed = value?.trim();

  if (!trimmed?.startsWith('/') || trimmed.startsWith('//')) {
    return undefined;
  }

  return trimmed;
}
