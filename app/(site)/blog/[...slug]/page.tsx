import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { blog } from '@/lib/source';
import {
  formatFrontmatterDate,
  getDescription,
  isDirectlyReadable,
} from '@/lib/content/visibility';
import { getMDXComponents } from '@/components/mdx';

type BlogPostPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const page = blog.getPage(slug);

  if (!page || !isDirectlyReadable(page)) {
    return {};
  }

  return {
    title: page.data.title,
    description: getDescription(page),
  };
}

export function generateStaticParams() {
  return blog.getPages().map((page) => ({
    slug: page.slugs,
  }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug = [] } = await params;
  const page = blog.getPage(slug);

  if (!page || !isDirectlyReadable(page)) {
    notFound();
  }

  const MDX = page.data.body;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-7 shadow-xl shadow-stone-900/5 md:p-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">
            {formatFrontmatterDate(page.data.date)}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-stone-950">
            {page.data.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-stone-700">{getDescription(page)}</p>
        </div>
        <DocsBody>
          <MDX components={getMDXComponents()} />
        </DocsBody>
      </article>
    </main>
  );
}
