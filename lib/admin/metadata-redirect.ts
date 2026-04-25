type MetadataRedirectResult =
  | { error: string }
  | { statusParam: 'updated' | 'audit_failed'; contentId: string; jobId?: string };

export function buildMetadataRedirectLocation(
  returnTo: string | undefined,
  result: MetadataRedirectResult,
) {
  const target = new URL(safeAdminReturnPath(returnTo) ?? '/admin/content', 'https://local.invalid');

  if ('error' in result) {
    target.searchParams.set('error', result.error);
  } else {
    target.searchParams.set(result.statusParam, result.contentId);

    if (result.jobId) {
      target.searchParams.set('job', result.jobId);
    }
  }

  return `${target.pathname}${target.search}`;
}

export function safeAdminReturnPath(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return undefined;
  }

  const target = new URL(trimmed, 'https://local.invalid');
  const isAdminPath = target.pathname === '/admin' || target.pathname.startsWith('/admin/');

  if (!isAdminPath) {
    return undefined;
  }

  return `${target.pathname}${target.search}`;
}
