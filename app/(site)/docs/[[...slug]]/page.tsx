import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/components/mdx';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import {
  routeSlugSegmentsToContentSlug,
  runtimeContentDescription,
  runtimeContentUrl,
} from '@/lib/content/runtime-content';
import {
  findReadableContentItemByTypeAndSlug,
  listPublicContentItems,
} from '@/lib/db/content-repository';
import { ContentType } from '@/lib/generated/prisma/client';
import { source } from '@/lib/source';
import { getDescription, isDirectlyReadable } from '@/lib/content/visibility';

export const dynamic = 'force-dynamic';

type DocsPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

type RuntimeDoc = Awaited<ReturnType<typeof listPublicContentItems>>[number];

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const runtimeItem = await findReadableContentItemByTypeAndSlug(
    ContentType.DOCS,
    routeSegmentsToDocsSlug(slug),
  );

  if (runtimeItem) {
    return {
      title: runtimeItem.title,
      description: runtimeContentDescription(runtimeItem),
    };
  }

  const page = source.getPage(slug);

  if (!page || !isDirectlyReadable(page)) {
    return {};
  }

  return {
    title: page.data.title,
    description: getDescription(page),
  };
}

export function generateStaticParams() {
  return source
    .getPages()
    .filter(isDirectlyReadable)
    .map((page) => ({
      slug: page.slugs,
    }));
}

export default async function Page({ params }: DocsPageProps) {
  const { slug = [] } = await params;
  const runtimeDocs = slug.length === 0 ? await listPublicContentItems(ContentType.DOCS) : [];
  const runtimeItem = await findReadableContentItemByTypeAndSlug(
    ContentType.DOCS,
    routeSegmentsToDocsSlug(slug),
  );

  if (runtimeItem) {
    return (
      <DocsPage>
        <DocsTitle>{runtimeItem.title}</DocsTitle>
        <DocsDescription>{runtimeContentDescription(runtimeItem)}</DocsDescription>
        <DocsBody>
          <MarkdownRenderer content={runtimeItem.body} sourcePath={runtimeItem.sourcePath} />
          <RuntimeDocsList docs={runtimeDocs.filter((doc) => doc.id !== runtimeItem.id)} />
        </DocsBody>
      </DocsPage>
    );
  }

  const page = source.getPage(slug);

  if (!page || !isDirectlyReadable(page)) {
    notFound();
  }

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{getDescription(page)}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
        <RuntimeDocsList docs={runtimeDocs} />
      </DocsBody>
    </DocsPage>
  );
}

function routeSegmentsToDocsSlug(slug: string[]) {
  return slug.length === 0 ? 'index' : routeSlugSegmentsToContentSlug(slug);
}

function RuntimeDocsList({ docs }: { docs: RuntimeDoc[] }) {
  const visibleDocs = docs.filter((doc) => doc.slug !== 'index');

  if (visibleDocs.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 border-t border-stone-900/10 pt-8">
      <h2 className="text-2xl font-black tracking-tight text-stone-950">公开文档</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {visibleDocs.map((doc) => (
          <Link
            className="rounded-lg border border-stone-900/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700/35 hover:shadow-md"
            href={runtimeContentUrl(doc)}
            key={doc.id}
          >
            <h3 className="text-lg font-bold text-stone-950">{doc.title || doc.slug}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
              {runtimeContentDescription(doc) || doc.sourcePath}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
