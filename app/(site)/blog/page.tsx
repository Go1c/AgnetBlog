import Link from 'next/link';
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
  description: '从 Markdown 发布的公开博客文章。',
};

export default async function BlogIndexPage() {
  const posts = await listPublicContentItems(ContentType.BLOG);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
          博客
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-950 md:text-5xl">
          公开笔记
        </h1>
      </div>
      <div className="grid gap-5">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={runtimeContentUrl(post)}
            className="rounded-3xl border border-stone-900/10 bg-white/75 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700/30 hover:shadow-md"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              <span>{formatFrontmatterDate(runtimeContentDate(post))}</span>
              {post.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
            <h2 className="mt-3 text-2xl font-bold text-stone-950">{post.title}</h2>
            <p className="mt-3 max-w-3xl text-stone-700">{runtimeContentDescription(post)}</p>
          </Link>
        ))}
      </div>
      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-900/20 bg-white/60 p-6 text-stone-600">
          还没有公开博客。
        </p>
      ) : null}
    </main>
  );
}
