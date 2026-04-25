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

type ManualSyncRedirectResult = {
  error?: string;
  jobId?: string;
  mode?: string;
  status?: string;
  scanned?: number;
  upserted?: number;
  deleted?: number;
  skipped?: number;
  failed?: number;
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

export function buildManualSyncRedirectLocation(
  returnTo: string | undefined,
  result: ManualSyncRedirectResult,
) {
  const target = new URL(safeReturnPath(returnTo) ?? '/admin/sync-jobs', 'https://local.invalid');

  if (result.error) {
    target.searchParams.set('sync_error', result.error);
  }

  if (result.jobId) {
    target.searchParams.set('sync_job', result.jobId);
  }

  if (result.mode) {
    target.searchParams.set('sync_mode', result.mode);
  }

  if (result.status) {
    target.searchParams.set('sync_status', result.status);
  }

  if (result.scanned !== undefined) {
    target.searchParams.set('sync_scanned', String(result.scanned));
  }

  if (result.upserted !== undefined) {
    target.searchParams.set('sync_upserted', String(result.upserted));
  }

  if (result.deleted !== undefined) {
    target.searchParams.set('sync_deleted', String(result.deleted));
  }

  if (result.skipped !== undefined) {
    target.searchParams.set('sync_skipped', String(result.skipped));
  }

  if (result.failed !== undefined) {
    target.searchParams.set('sync_failed', String(result.failed));
  }

  return `${target.pathname}${target.search}`;
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

function safeReturnPath(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed?.startsWith('/') || trimmed.startsWith('//')) {
    return undefined;
  }

  return trimmed;
}
