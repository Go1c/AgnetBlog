import type { Metadata } from 'next';
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
} from '@/lib/content/runtime-content';
import { findReadableContentItemByTypeAndSlug } from '@/lib/db/content-repository';
import { ContentType } from '@/lib/generated/prisma/client';
import { source } from '@/lib/source';
import { getDescription, isDirectlyReadable } from '@/lib/content/visibility';

export const dynamic = 'force-dynamic';

type DocsPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

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
      </DocsBody>
    </DocsPage>
  );
}

function routeSegmentsToDocsSlug(slug: string[]) {
  return slug.length === 0 ? 'index' : routeSlugSegmentsToContentSlug(slug);
}
