import Link from 'next/link';
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Clock3,
  Rss,
  Search,
  Sparkles,
  Tag,
} from 'lucide-react';
import { formatFrontmatterDate } from '@/lib/content/visibility';
import {
  runtimeContentDate,
  runtimeContentDescription,
  runtimeContentUrl,
} from '@/lib/content/runtime-content';
import { listPublicContentItems } from '@/lib/db/content-repository';
import { ContentType } from '@/lib/generated/prisma/client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '博客',
  description: '技术博客、工程笔记和产品构建记录。',
};

type BlogIndexPageProps = {
  searchParams?: Promise<{
    q?: string;
    tag?: string;
  }>;
};

type BlogPost = Awaited<ReturnType<typeof listPublicContentItems>>[number];

export default async function BlogIndexPage({ searchParams }: BlogIndexPageProps) {
  const { q = '', tag = '' } = (await searchParams) ?? {};
  const query = q.trim();
  const activeTag = tag.trim();
  const posts = await listPublicContentItems(ContentType.BLOG);
  const tags = getTagCounts(posts);
  const featuredPost = posts[0];
  const filteredPosts = filterPosts(posts, {
    query,
    tag: activeTag,
    featuredPostId: featuredPost?.id,
  });
  const totalReadingMinutes = posts.reduce(
    (total, post) => total + estimateReadingMinutes(post.body),
    0,
  );

  return (
    <main className="min-h-screen flex-1 bg-[#f6f7f2] text-zinc-950">
      <section className="border-b border-zinc-950/10 bg-[#101314] text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-10">
          <div>
            <nav className="flex flex-wrap items-center gap-2 text-sm text-white/64" aria-label="主导航">
              <Link className="hover:text-white" href="/">
                首页
              </Link>
              <span>/</span>
              <span className="text-white">Blog</span>
              <Link
                className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-white/80 hover:border-white/35 hover:text-white sm:ml-4"
                href="/feed.xml"
              >
                <Rss className="h-4 w-4" aria-hidden />
                RSS
              </Link>
            </nav>

            <div className="mt-16 max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-sm font-semibold text-emerald-100">
                <Sparkles className="h-4 w-4" aria-hidden />
                Engineering Notes
              </p>
              <h1 className="mt-5 text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
                技术博客与构建记录
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
                记录系统设计、Next.js 实践、内容管线、Agent 工作流和产品迭代中的关键决策。
              </p>
            </div>
          </div>

          <aside className="grid content-end gap-4 lg:pt-24" aria-label="博客统计">
            <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/12 bg-white/[0.06]">
              <Stat label="文章" value={posts.length} />
              <Stat label="标签" value={tags.length} />
              <Stat label="分钟" value={totalReadingMinutes} />
            </div>
            <form
              action="/blog"
              className="flex min-h-14 items-center gap-3 rounded-xl border border-white/12 bg-white px-4 text-zinc-950 shadow-2xl shadow-black/20"
            >
              {activeTag ? <input name="tag" type="hidden" value={activeTag} /> : null}
              <Search className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-zinc-500"
                defaultValue={query}
                name="q"
                placeholder="搜索标题、摘要、标签"
                type="search"
              />
              <button
                className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                type="submit"
              >
                搜索
              </button>
            </form>
          </aside>
        </div>
      </section>

      <section className="border-b border-zinc-950/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-6 py-4">
          <Link
            className={tagLinkClass(!activeTag)}
            href={buildBlogHref({ query })}
          >
            全部
          </Link>
          {tags.map((item) => (
            <Link
              className={tagLinkClass(activeTag === item.tag)}
              href={buildBlogHref({ query, tag: item.tag })}
              key={item.tag}
            >
              <Tag className="h-3.5 w-3.5" aria-hidden />
              {item.tag}
              <span className="text-xs opacity-70">{item.count}</span>
            </Link>
          ))}
          {(query || activeTag) ? (
            <Link
              className="ml-auto rounded-full border border-zinc-950/15 px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-950/35 hover:text-zinc-950"
              href="/blog"
            >
              清除筛选
            </Link>
          ) : null}
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {featuredPost ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Link
              className="group min-h-[360px] overflow-hidden rounded-xl border border-zinc-950/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-700/35 hover:shadow-xl hover:shadow-zinc-950/10"
              href={runtimeContentUrl(featuredPost)}
            >
              <div className="grid h-full lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="p-7 md:p-9">
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-zinc-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" aria-hidden />
                      {formatFrontmatterDate(runtimeContentDate(featuredPost))}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" aria-hidden />
                      {estimateReadingMinutes(featuredPost.body)} 分钟
                    </span>
                  </div>
                  <p className="mt-10 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
                    Featured
                  </p>
                  <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-tight text-zinc-950 md:text-5xl">
                    {featuredPost.title}
                  </h2>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
                    {runtimeContentDescription(featuredPost)}
                  </p>
                  <div className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-zinc-950">
                    阅读文章
                    <ArrowRight
                      className="h-4 w-4 transition group-hover:translate-x-1"
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="hidden border-l border-zinc-950/10 bg-[#d9f275] p-6 lg:block">
                  <div className="flex h-full flex-col justify-between rounded-lg border border-zinc-950/20 bg-zinc-950 p-5 text-white">
                    <div className="space-y-3 font-mono text-xs text-emerald-200">
                      <p>const note = await publish()</p>
                      <p className="text-white/60">pipeline.sync()</p>
                      <p className="text-amber-200">visibility.public()</p>
                    </div>
                    <div>
                      <BookOpenText className="h-10 w-10 text-[#d9f275]" aria-hidden />
                      <p className="mt-4 text-sm leading-6 text-white/72">
                        Markdown 驱动，数据库索引，前后台统一发布。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            <aside className="rounded-xl border border-zinc-950/10 bg-zinc-950 p-6 text-white">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[#d9f275]">
                Topics
              </h2>
              <div className="mt-6 grid gap-3">
                {tags.slice(0, 6).map((item) => (
                  <Link
                    className="flex items-center justify-between rounded-lg border border-white/12 px-4 py-3 text-sm font-semibold text-white/80 hover:border-[#d9f275]/60 hover:text-white"
                    href={buildBlogHref({ query, tag: item.tag })}
                    key={item.tag}
                  >
                    <span>{item.tag}</span>
                    <span className="text-white/45">{item.count}</span>
                  </Link>
                ))}
                {tags.length === 0 ? (
                  <p className="text-sm leading-6 text-white/60">同步公开文章后会在这里显示主题。</p>
                ) : null}
              </div>
            </aside>
          </section>
        ) : null}

        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-950">最新文章</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {query || activeTag
                  ? `当前筛选匹配 ${filteredPosts.length} 篇`
                  : `共 ${posts.length} 篇公开文章`}
              </p>
            </div>
            <Link
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950"
              href="/search"
            >
              全站搜索
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {filteredPosts.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-950/20 bg-white p-8 text-zinc-600">
              {posts.length === 0 ? '还没有公开博客。' : '当前筛选下没有文章。'}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      className="group rounded-xl border border-zinc-950/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-700/35 hover:shadow-xl hover:shadow-zinc-950/10"
      href={runtimeContentUrl(post)}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" aria-hidden />
          {formatFrontmatterDate(runtimeContentDate(post))}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-4 w-4" aria-hidden />
          {estimateReadingMinutes(post.body)} 分钟
        </span>
      </div>
      <h3 className="mt-5 text-2xl font-black leading-tight tracking-tight text-zinc-950">
        {post.title}
      </h3>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-600">
        {runtimeContentDescription(post)}
      </p>
      {post.tags.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {post.tags.slice(0, 4).map((tag) => (
            <span
              className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-6 flex items-center gap-2 text-sm font-bold text-emerald-800">
        打开
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-white/12 px-4 py-4 last:border-r-0">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/48">
        {label}
      </div>
    </div>
  );
}

function getTagCounts(posts: BlogPost[]) {
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag, 'zh-CN'));
}

function filterPosts(
  posts: BlogPost[],
  filters: { query: string; tag: string; featuredPostId?: string },
) {
  const tokens = filters.query.toLowerCase().split(/\s+/).filter(Boolean);

  return posts.filter((post) => {
    if (!filters.query && !filters.tag && post.id === filters.featuredPostId) {
      return false;
    }

    const tagMatches = !filters.tag || post.tags.includes(filters.tag);
    const haystack = [
      post.title,
      post.description,
      post.slug,
      post.tags.join(' '),
      runtimeContentDescription(post),
    ]
      .join(' ')
      .toLowerCase();
    const queryMatches = tokens.every((token) => haystack.includes(token));

    return tagMatches && queryMatches;
  });
}

function estimateReadingMinutes(body: string | null | undefined) {
  const text = (body ?? '').replace(/\s+/g, '');
  return Math.max(1, Math.ceil(text.length / 500));
}

function tagLinkClass(active: boolean) {
  return [
    'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold',
    active
      ? 'bg-zinc-950 text-white'
      : 'border border-zinc-950/10 bg-white text-zinc-700 hover:border-emerald-700/35 hover:text-emerald-800',
  ].join(' ');
}

function buildBlogHref({ query, tag }: { query?: string; tag?: string }) {
  const target = new URL('/blog', 'https://local.invalid');

  if (query) {
    target.searchParams.set('q', query);
  }

  if (tag) {
    target.searchParams.set('tag', tag);
  }

  return `${target.pathname}${target.search}`;
}
