import type { MetadataRoute } from 'next';
import { isSitemapEligible } from '@/lib/content/visibility';
import { blog, source } from '@/lib/source';

function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    'http://localhost:3000';

  return configuredUrl.replace(/\/$/, '');
}

function toDate(value?: string | Date) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const staticRoutes: MetadataRoute.Sitemap = ['/', '/blog'].map((route) => ({
    url: `${siteUrl}${route}`,
  }));
  const docsIndex = source.getPage([]);
  const docsIndexRoute =
    docsIndex && isSitemapEligible(docsIndex)
      ? [
          {
            url: `${siteUrl}${docsIndex.url}`,
            lastModified: toDate(docsIndex.data.updatedAt ?? docsIndex.data.date),
          },
        ]
      : [];

  const blogRoutes = blog
    .getPages()
    .filter(isSitemapEligible)
    .map((page) => ({
      url: `${siteUrl}${page.url}`,
      lastModified: toDate(page.data.updatedAt ?? page.data.date),
    }));

  const docsRoutes = source
    .getPages()
    .filter((page) => page.url !== docsIndex?.url)
    .filter(isSitemapEligible)
    .map((page) => ({
      url: `${siteUrl}${page.url}`,
      lastModified: toDate(page.data.updatedAt ?? page.data.date),
    }));

  return [...staticRoutes, ...docsIndexRoute, ...blogRoutes, ...docsRoutes];
}
