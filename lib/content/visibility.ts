import type { Visibility } from './types';

type PublishablePage = {
  data: {
    description?: string;
    summary?: string;
    date?: string | Date;
    visibility?: Visibility;
    published?: boolean;
  };
};

export function formatFrontmatterDate(value?: string | Date) {
  if (!value) {
    return 'Undated';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

export function getDescription(page: PublishablePage) {
  return page.data.description ?? page.data.summary ?? '';
}

export function isPublicListable(page: PublishablePage) {
  return page.data.published !== false && (page.data.visibility ?? 'public') === 'public';
}

export function isDirectlyReadable(page: PublishablePage) {
  const visibility = page.data.visibility ?? 'public';

  return page.data.published !== false && visibility !== 'private';
}
