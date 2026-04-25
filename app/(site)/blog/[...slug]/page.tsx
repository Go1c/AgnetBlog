import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Clock3,
  Tag,
} from 'lucide-react';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { formatFrontmatterDate } from '@/lib/content/visibility';
import {
  routeSlugSegmentsToContentSlug,
  runtimeContentDate,
  runtimeContentDescription,
  runtimeContentUrl,
} from '@/lib/content/runtime-content';
import {
  findReadableContentItemByTypeAndSlug,
  listPublicContentItems,
} from '@/lib/db/content-repository';
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

  const posts = await listPublicContentItems(ContentType.BLOG);
  const relatedPosts = posts
    .filter((post) => post.id !== item.id)
    .filter((post) =>
      item.tags.length === 0 ? true : post.tags.some((tag) => item.tags.includes(tag)),
    )
    .slice(0, 3);
  const readingMinutes = estimateReadingMinutes(item.body);

  return (
    <main className="min-h-screen flex-1 bg-[#f6f7f2] text-zinc-950">
      <article>
        <header className="border-b border-zinc-950/10 bg-[#101314] text-white">
          <div className="mx-auto w-full max-w-5xl px-6 py-8 md:py-12">
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-sm font-semibold text-white/72 hover:border-white/35 hover:text-white"
              href="/blog"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              返回博客
            </Link>

            <div className="mt-14 max-w-4xl">
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white/64">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  {formatFrontmatterDate(runtimeContentDate(item))}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" aria-hidden />
                  {readingMinutes} 分钟
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpenText className="h-4 w-4" aria-hidden />
                  技术笔记
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                {item.title}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
                {runtimeContentDescription(item)}
              </p>
              {item.tags.length > 0 ? (
                <div className="mt-8 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Link
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/80 hover:bg-white/16 hover:text-white"
                      href={`/blog?tag=${encodeURIComponent(tag)}`}
                      key={tag}
                    >
                      <Tag className="h-3.5 w-3.5" aria-hidden />
                      {tag}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 rounded-xl border border-zinc-950/10 bg-white p-6 shadow-sm md:p-9">
            <DocsBody>
              <MarkdownRenderer content={item.body} />
            </DocsBody>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start" aria-label="文章信息">
            <div className="rounded-xl border border-zinc-950/10 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-800">
                Article
              </h2>
              <dl className="mt-5 grid gap-4 text-sm">
                <div>
                  <dt className="text-zinc-500">发布时间</dt>
                  <dd className="mt-1 font-semibold text-zinc-950">
                    {formatFrontmatterDate(runtimeContentDate(item))}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">阅读时间</dt>
                  <dd className="mt-1 font-semibold text-zinc-950">{readingMinutes} 分钟</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Slug</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-zinc-700">{item.slug}</dd>
                </div>
              </dl>
            </div>

            <Link
              className="flex items-center justify-between rounded-xl border border-zinc-950/10 bg-[#d9f275] p-5 text-sm font-black text-zinc-950 shadow-sm hover:border-zinc-950/25"
              href="/blog"
            >
              查看全部文章
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </aside>
        </div>
      </article>

      {relatedPosts.length > 0 ? (
        <section className="border-t border-zinc-950/10 bg-white">
          <div className="mx-auto w-full max-w-5xl px-6 py-10">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-950">继续阅读</h2>
                <p className="mt-1 text-sm text-zinc-600">同主题的公开文章</p>
              </div>
              <Link
                className="hidden items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950 sm:inline-flex"
                href="/blog"
              >
                全部文章
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedPosts.map((post) => (
                <Link
                  className="group rounded-xl border border-zinc-950/10 bg-[#f6f7f2] p-5 transition hover:-translate-y-0.5 hover:border-emerald-700/35 hover:bg-white hover:shadow-lg hover:shadow-zinc-950/10"
                  href={runtimeContentUrl(post)}
                  key={post.id}
                >
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    {formatFrontmatterDate(runtimeContentDate(post))}
                  </div>
                  <h3 className="mt-3 text-lg font-black leading-snug text-zinc-950">
                    {post.title}
                  </h3>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-800">
                    阅读
                    <ArrowRight
                      className="h-4 w-4 transition group-hover:translate-x-1"
                      aria-hidden
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function estimateReadingMinutes(body: string | null | undefined) {
  const text = (body ?? '').replace(/\s+/g, '');
  return Math.max(1, Math.ceil(text.length / 500));
}
