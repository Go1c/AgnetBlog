import { getDescription, isRssEligible } from '@/lib/content/visibility';
import { blog } from '@/lib/source';

function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    'http://localhost:3000';

  return configuredUrl.replace(/\/$/, '');
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function toRssDate(value?: string | Date) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toUTCString();
}

export function GET() {
  const siteUrl = getSiteUrl();
  const posts = blog
    .getPages()
    .filter(isRssEligible)
    .sort((a, b) => {
      const left = a.data.date ? new Date(a.data.date).getTime() : 0;
      const right = b.data.date ? new Date(b.data.date).getTime() : 0;
      return right - left;
    });

  const items = posts
    .map((post) => {
      const url = `${siteUrl}${post.url}`;
      const description = getDescription(post);
      const pubDate = toRssDate(post.data.date);

      return [
        '<item>',
        `<title>${escapeXml(post.data.title)}</title>`,
        `<link>${escapeXml(url)}</link>`,
        `<guid>${escapeXml(url)}</guid>`,
        description ? `<description>${escapeXml(description)}</description>` : '',
        pubDate ? `<pubDate>${escapeXml(pubDate)}</pubDate>` : '',
        '</item>',
      ]
        .filter(Boolean)
        .join('');
    })
    .join('');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    '<title>AgnetBlog</title>',
    '<description>Public blog posts published from Markdown.</description>',
    `<link>${escapeXml(siteUrl)}</link>`,
    items,
    '</channel>',
    '</rss>',
  ].join('');

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
    },
  });
}
