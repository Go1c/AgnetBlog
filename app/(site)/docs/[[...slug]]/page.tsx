import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/components/mdx';
import { source } from '@/lib/source';
import { getDescription, isDirectlyReadable } from '@/lib/content/visibility';

type DocsPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { slug = [] } = await params;
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

