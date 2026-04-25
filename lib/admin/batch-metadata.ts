import { safeAdminReturnPath } from './metadata-redirect';

type BatchMetadataPatch = {
  visibility?: 'private' | 'public' | 'unlisted';
  contentType?: 'blog' | 'docs';
  published?: boolean;
};

export type BatchMetadataParseResult =
  | {
      ok: true;
      contentIds: string[];
      patch: BatchMetadataPatch;
      returnTo?: string;
    }
  | {
      ok: false;
      error:
        | 'empty_metadata_patch'
        | 'invalid_metadata'
        | 'no_content_selected';
      returnTo?: string;
    };

const visibilityValues = new Set(['private', 'public', 'unlisted']);
const contentTypeValues = new Set(['blog', 'docs']);

export function parseBatchMetadataForm(formData: FormData): BatchMetadataParseResult {
  const returnToValue = formData.get('returnTo');
  const returnTo =
    typeof returnToValue === 'string' ? safeAdminReturnPath(returnToValue) : undefined;
  const contentIds = uniqueContentIds(formData.getAll('contentId'));

  if (contentIds.length === 0) {
    return {
      ok: false,
      error: 'no_content_selected',
      returnTo,
    };
  }

  const patch: BatchMetadataPatch = {};
  const visibility = parseOptionalEnum(formData.get('visibility'), visibilityValues);
  const contentType = parseOptionalEnum(formData.get('contentType'), contentTypeValues);
  const published = parseOptionalBoolean(formData.get('published'));

  if (!visibility.ok || !contentType.ok || !published.ok) {
    return {
      ok: false,
      error: 'invalid_metadata',
      returnTo,
    };
  }

  if (visibility.value) {
    patch.visibility = visibility.value as BatchMetadataPatch['visibility'];
  }

  if (contentType.value) {
    patch.contentType = contentType.value as BatchMetadataPatch['contentType'];
  }

  if (published.value !== undefined) {
    patch.published = published.value;
  }

  if (Object.keys(patch).length === 0) {
    return {
      ok: false,
      error: 'empty_metadata_patch',
      returnTo,
    };
  }

  return {
    ok: true,
    contentIds,
    patch,
    returnTo,
  };
}

function uniqueContentIds(values: FormDataEntryValue[]) {
  return [
    ...new Set(
      values.flatMap((value) => {
        if (typeof value !== 'string') {
          return [];
        }

        const trimmed = value.trim();

        return trimmed ? [trimmed] : [];
      }),
    ),
  ];
}

function parseOptionalEnum(value: FormDataEntryValue | null, allowed: Set<string>) {
  if (typeof value !== 'string') {
    return {
      ok: true as const,
      value: undefined,
    };
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === 'keep') {
    return {
      ok: true as const,
      value: undefined,
    };
  }

  return allowed.has(trimmed)
    ? {
        ok: true as const,
        value: trimmed,
      }
    : {
        ok: false as const,
      };
}

function parseOptionalBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return {
      ok: true as const,
      value: undefined,
    };
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'keep') {
    return {
      ok: true as const,
      value: undefined,
    };
  }

  if (normalized === 'true' || normalized === 'on' || normalized === '1') {
    return {
      ok: true as const,
      value: true,
    };
  }

  if (normalized === 'false' || normalized === 'off' || normalized === '0') {
    return {
      ok: true as const,
      value: false,
    };
  }

  return {
    ok: false as const,
  };
}
