import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { CommentSection } from '@/components/comments/comment-section';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { ShareButton } from '@/components/share/share-button';
import { formatFrontmatterDate } from '@/lib/content/visibility';
import {
  routeSlugSegmentsToContentSlug,
  runtimeContentDate,
  runtimeContentDescription,
  runtimeContentUrl,
} from '@/lib/content/runtime-content';
import { findReadableContentItemByTypeAndSlug } from '@/lib/db/content-repository';
import { listContentShares, ShareAccessMode } from '@/lib/db/share-repository';
import { ContentType } from '@/lib/generated/prisma/client';

export const dynamic = 'force-dynamic';

type BlogPostPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const item = await findReadableContentItemByTypeAndSlug(
    ContentType.BLOG,
    routeSlugSegmentsToContentSlug(slug),
  );

  if (!item) {
    return {};
  }

  return {
    title: item.title,
    description: runtimeContentDescription(item),
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug = [] } = await params;
  const item = await findReadableContentItemByTypeAndSlug(
    ContentType.BLOG,
    routeSlugSegmentsToContentSlug(slug),
  );

  if (!item) {
    notFound();
  }

  const [shares, baseUrl] = await Promise.all([
    listContentShares(item.id),
    getRequestBaseUrl(),
  ]);
  const canonicalUrl = `${baseUrl}${runtimeContentUrl(item)}`;
  const shortShareUrl = getActiveLinkShareUrl(shares, baseUrl);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-7 shadow-xl shadow-stone-900/5 md:p-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">
            {formatFrontmatterDate(runtimeContentDate(item))}
          </p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <h1 className="text-4xl font-black tracking-tight text-stone-950">
              {item.title}
            </h1>
            <ShareButton shortUrl={shortShareUrl} title={item.title} url={canonicalUrl} />
          </div>
          <p className="mt-4 text-lg leading-8 text-stone-700">
            {runtimeContentDescription(item)}
          </p>
        </div>
        <DocsBody>
          <MarkdownRenderer content={item.body} sourcePath={item.sourcePath} />
        </DocsBody>
        <CommentSection contentItemId={item.id} returnTo={runtimeContentUrl(item)} />
      </article>
    </main>
  );
}

async function getRequestBaseUrl() {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

function getActiveLinkShareUrl(
  shares: Awaited<ReturnType<typeof listContentShares>>,
  baseUrl: string,
) {
  const share = shares.find(
    (candidate) => !candidate.revokedAt && candidate.accessMode === ShareAccessMode.LINK,
  );

  return share ? `${baseUrl}/s/${encodeURIComponent(share.token)}` : null;
}
