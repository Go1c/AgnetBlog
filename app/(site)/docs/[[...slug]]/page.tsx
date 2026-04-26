import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { CommentSection } from '@/components/comments/comment-section';
import { getMDXComponents } from '@/components/mdx';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { ShareButton } from '@/components/share/share-button';
import { AccentColorSelect } from '@/components/theme/accent-color-select';
import {
  routeSlugSegmentsToContentSlug,
  runtimeContentDescription,
  runtimeContentUrl,
} from '@/lib/content/runtime-content';
import {
  findReadableContentItemByTypeAndSlug,
  listPublicContentItems,
} from '@/lib/db/content-repository';
import { listContentShares, ShareAccessMode } from '@/lib/db/share-repository';
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
    const [shares, baseUrl] = await Promise.all([
      listContentShares(runtimeItem.id),
      getRequestBaseUrl(),
    ]);
    const canonicalUrl = `${baseUrl}${runtimeContentUrl(runtimeItem)}`;
    const shortShareUrl = getActiveLinkShareUrl(shares, baseUrl);

    return (
      <DocsPage>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <DocsTitle>{runtimeItem.title}</DocsTitle>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <AccentColorSelect />
            <ShareButton shortUrl={shortShareUrl} title={runtimeItem.title} url={canonicalUrl} />
          </div>
        </div>
        <DocsDescription>{runtimeContentDescription(runtimeItem)}</DocsDescription>
        <DocsBody>
          <MarkdownRenderer content={runtimeItem.body} sourcePath={runtimeItem.sourcePath} />
          <RuntimeDocsList docs={runtimeDocs.filter((doc) => doc.id !== runtimeItem.id)} />
          <CommentSection contentItemId={runtimeItem.id} returnTo={runtimeContentUrl(runtimeItem)} />
        </DocsBody>
      </DocsPage>
    );
  }

  const page = source.getPage(slug);

  if (!page || !isDirectlyReadable(page)) {
    notFound();
  }

  const MDX = page.data.body;
  const baseUrl = await getRequestBaseUrl();

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <DocsTitle>{page.data.title}</DocsTitle>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <AccentColorSelect />
          <ShareButton title={page.data.title} url={`${baseUrl}${page.url}`} />
        </div>
      </div>
      <DocsDescription>{getDescription(page)}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
        <RuntimeDocsList docs={runtimeDocs} />
        <CommentSection
          returnTo={page.url}
          targetKey={staticDocsCommentTargetKey(routeSegmentsToDocsSlug(slug))}
        />
      </DocsBody>
    </DocsPage>
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

function routeSegmentsToDocsSlug(slug: string[]) {
  return slug.length === 0 ? 'index' : routeSlugSegmentsToContentSlug(slug);
}

function staticDocsCommentTargetKey(slug: string) {
  return `docs:${slug}`;
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
