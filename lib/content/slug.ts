export function normalizeSlug(explicitSlug: string | undefined, sourcePath: string) {
  if (explicitSlug) {
    const normalizedExplicit = normalizeSlugPath(explicitSlug);

    if (normalizedExplicit.length > 0) {
      return normalizedExplicit;
    }
  }

  return normalizeSlugPath(stripExtension(normalizePath(sourcePath)));
}

export function normalizeSlugPath(value: string) {
  return normalizePath(value)
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .replace(/[A-Z]/g, (letter) => letter.toLowerCase())
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9._~-]+/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean)
    .join('/');
}

export function stripExtension(path: string) {
  return path.replace(/\.[^/.]+$/, '');
}

function normalizePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}
