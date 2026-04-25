import Link from 'next/link';
import { blog } from '@/lib/source';
import {
  formatFrontmatterDate,
  getDescription,
  isPublicListable,
} from '@/lib/content/visibility';

export const metadata = {
  title: 'Blog',
  description: 'Public blog posts published from Markdown.',
};

export default function BlogIndexPage() {
  const posts = blog
    .getPages()
    .filter(isPublicListable)
    .sort((a, b) => {
      const left = a.data.date ? new Date(a.data.date).getTime() : 0;
      const right = b.data.date ? new Date(b.data.date).getTime() : 0;
      return right - left;
    });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
          Blog
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-950 md:text-5xl">
          Public notes
        </h1>
      </div>
      <div className="grid gap-5">
        {posts.map((post) => (
          <Link
            key={post.url}
            href={post.url}
            className="rounded-3xl border border-stone-900/10 bg-white/75 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700/30 hover:shadow-md"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              <span>{formatFrontmatterDate(post.data.date)}</span>
              {post.data.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
            <h2 className="mt-3 text-2xl font-bold text-stone-950">{post.data.title}</h2>
            <p className="mt-3 max-w-3xl text-stone-700">{getDescription(post)}</p>
          </Link>
        ))}
      </div>
      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-900/20 bg-white/60 p-6 text-stone-600">
          No public blog posts yet.
        </p>
      ) : null}
    </main>
  );
}
