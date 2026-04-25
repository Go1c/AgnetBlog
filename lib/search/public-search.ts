import type { ContentType } from '@/lib/content/types';
import { getDescription, isPublicSearchable } from '@/lib/content/visibility';
import { blog, source } from '@/lib/source';

export type PublicSearchResult = {
  id: string;
  type: 'page';
  content: string;
  url: string;
  breadcrumbs: string[];
  title: string;
  description: string;
  contentType: ContentType;
  tags: string[];
};

type SearchablePage = {
  url: string;
  data: {
    title?: string;
    description?: string;
    summary?: string;
    tags?: string[];
    contentType?: ContentType;
    visibility?: 'private' | 'public' | 'unlisted';
    published?: boolean;
  };
};

type SearchOptions = {
  limit?: number;
  tag?: string[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getSearchText(page: SearchablePage) {
  return [
    page.data.title,
    page.data.description,
    page.data.summary,
    ...(page.data.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function scorePage(page: SearchablePage, terms: string[]) {
  const title = normalize(page.data.title ?? '');
  const tags = (page.data.tags ?? []).map(normalize);
  const text = getSearchText(page);

  if (!terms.every((term) => text.includes(term))) {
    return 0;
  }

  return terms.reduce((score, term) => {
    if (title === term) {
      return score + 20;
    }

    if (title.includes(term)) {
      return score + 10;
    }

    if (tags.some((tag) => tag.includes(term))) {
      return score + 6;
    }

    return score + 1;
  }, 0);
}

function toSearchResult(page: SearchablePage): PublicSearchResult {
  const contentType = page.data.contentType ?? (page.url.startsWith('/blog') ? 'blog' : 'docs');
  const title = page.data.title ?? page.url;
  const description = getDescription(page);

  return {
    id: page.url,
    type: 'page',
    content: description ? `${title}\n${description}` : title,
    url: page.url,
    breadcrumbs: [contentType === 'blog' ? 'Blog' : 'Docs'],
    title,
    description,
    contentType,
    tags: page.data.tags ?? [],
  };
}

export function getPublicSearchEntries() {
  return [...blog.getPages(), ...source.getPages()].filter(isPublicSearchable);
}

export function searchPublicContent(query: string, options: SearchOptions = {}) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return [];
  }

  const tags = options.tag?.map(normalize).filter(Boolean) ?? [];

  return getPublicSearchEntries()
    .filter((page) => {
      if (tags.length === 0) {
        return true;
      }

      const pageTags = (page.data.tags ?? []).map(normalize);
      return tags.some((tag) => pageTags.includes(tag));
    })
    .map((page) => ({
      page,
      score: scorePage(page, terms),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.page.url.localeCompare(b.page.url))
    .slice(0, options.limit ?? 20)
    .map((result) => toSearchResult(result.page));
}
