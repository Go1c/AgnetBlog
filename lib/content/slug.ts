import type { ContentPipelineIssue, ContentType } from './types';

type SlugSuccess = {
  success: true;
  slug: string;
};

type SlugFailure = {
  success: false;
  errors: ContentPipelineIssue[];
};

export type SlugResult = SlugSuccess | SlugFailure;

export type SourceRootInput = string | Partial<Record<ContentType, string>>;

export function normalizeSlug(explicitSlug: string | undefined, sourcePath: string): SlugResult {
  if (explicitSlug !== undefined) {
    const normalizedExplicit = normalizeSlugPath(explicitSlug);

    if (normalizedExplicit.length > 0) {
      return {
        success: true,
        slug: normalizedExplicit,
      };
    }

    return {
      success: false,
      errors: [
        {
          code: 'invalid_explicit_slug',
          message: 'Explicit slug must contain at least one URL-safe path segment.',
          field: 'slug',
        },
      ],
    };
  }

  const normalizedDerived = normalizeSlugPath(stripExtension(normalizePath(sourcePath)));

  if (normalizedDerived.length > 0) {
    return {
      success: true,
      slug: normalizedDerived,
    };
  }

  return {
    success: false,
    errors: [
      {
        code: 'invalid_derived_slug',
        message: 'Source path must produce at least one URL-safe slug segment.',
        field: 'path',
      },
    ],
  };
}

export function resolveSlugSourcePath(options: {
  path: string;
  relativePath?: string;
  contentType: ContentType;
  sourceRoot?: SourceRootInput;
}): SlugResult {
  if (options.relativePath !== undefined) {
    return normalizeSlug(undefined, options.relativePath);
  }

  const root =
    typeof options.sourceRoot === 'string'
      ? options.sourceRoot
      : options.sourceRoot?.[options.contentType];

  if (!root) {
    return {
      success: false,
      errors: [
        {
          code: 'missing_slug_source_root',
          message:
            'Pass relativePath on the file or sourceRoot in ingest options before deriving a slug.',
          field: 'sourceRoot',
          path: options.path,
        },
      ],
    };
  }

  const relativePath = stripSourceRoot(options.path, root);

  if (!relativePath) {
    return {
      success: false,
      errors: [
        {
          code: 'source_path_outside_root',
          message: `Source path must be inside sourceRoot "${root}".`,
          field: 'sourceRoot',
          path: options.path,
        },
      ],
    };
  }

  return normalizeSlug(undefined, relativePath);
}

export function normalizeSlugPath(value: string) {
  return normalizePath(value)
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}._~-]+/gu, '')
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

function stripSourceRoot(path: string, root: string) {
  const normalizedPath = normalizePath(path);
  const normalizedRoot = normalizePath(root);

  if (normalizedPath === normalizedRoot) {
    return '';
  }

  if (!normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return undefined;
  }

  return normalizedPath.slice(normalizedRoot.length + 1);
}
