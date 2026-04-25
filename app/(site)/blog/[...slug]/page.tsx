import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { formatFrontmatterDate } from '@/lib/content/visibility';
import {
  routeSlugSegmentsToContentSlug,
  runtimeContentDate,
  runtimeContentDescription,
} from '@/lib/content/runtime-content';
import { findReadableContentItemByTypeAndSlug } from '@/lib/db/content-repository';
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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-7 shadow-xl shadow-stone-900/5 md:p-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">
            {formatFrontmatterDate(runtimeContentDate(item))}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-stone-950">
            {item.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-stone-700">
            {runtimeContentDescription(item)}
          </p>
        </div>
        <DocsBody>
          <MarkdownRenderer content={item.body} />
        </DocsBody>
      </article>
    </main>
  );
}
