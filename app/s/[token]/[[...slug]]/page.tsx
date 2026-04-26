import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';

import { CommentSection } from '@/components/comments/comment-section';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { runtimeContentDescription } from '@/lib/content/runtime-content';
import {
  findPublishedDocsContentBySlug,
  findUsableShareByToken,
  listPublishedDocsContent,
  ShareAccessMode,
  ShareNavigationScope,
} from '@/lib/db/share-repository';
import { ContentType, type ContentItem } from '@/lib/generated/prisma/client';
import {
  createShareAccessCookieName,
  getShareAccessCookieSecret,
  verifyShareAccessCookieValue,
} from '@/lib/share/access-cookie';

export const dynamic = 'force-dynamic';

type SharePageProps = {
  params: Promise<{
    token: string;
    slug?: string[];
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  const share = await findUsableShareByToken(token);

  if (!share) {
    return {};
  }

  if (share.accessMode === ShareAccessMode.PASSWORD) {
    return {
      title: '受保护的分享',
      description: '此分享需要密码访问。',
    };
  }

  return {
    title: share.contentItem.title,
    description: runtimeContentDescription(share.contentItem),
  };
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { token, slug = [] } = await params;
  const query = (await searchParams) ?? {};
  const share = await findUsableShareByToken(token);

  if (!share) {
    notFound();
  }

  if (slug.length > 0 && share.navigationScope === ShareNavigationScope.CURRENT_ONLY) {
    notFound();
  }

  if (!(await canReadPasswordShare(token, share.accessMode))) {
    return (
      <PasswordUnlock
        error={getSingleParam(query.error)}
        returnTo={buildSharePath(token, slug)}
        token={token}
      />
    );
  }

  const item = await resolveSharedItem({
    token,
    slug,
    rootItem: share.contentItem,
    navigationScope: share.navigationScope,
  });

  if (!item) {
    notFound();
  }

  const docsNav =
    share.navigationScope === ShareNavigationScope.NAVIGABLE &&
    share.contentItem.type === ContentType.DOCS
      ? await listPublishedDocsContent()
      : [];

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-6 py-12 lg:grid-cols-[240px_minmax(0,1fr)]">
      {docsNav.length > 0 ? <SharedDocsNav docs={docsNav} token={token} /> : null}
      <article className="min-w-0 rounded-[2rem] border border-stone-900/10 bg-white/80 p-7 shadow-xl shadow-stone-900/5 md:p-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">
            Shared preview
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-stone-950">
            {item.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-stone-700">
            {runtimeContentDescription(item)}
          </p>
        </div>
        <DocsBody>
          <MarkdownRenderer content={item.body} sourcePath={item.sourcePath} />
        </DocsBody>
        <CommentSection
          contentItemId={item.id}
          returnTo={buildSharePath(token, slug)}
          shareToken={token}
        />
      </article>
    </main>
  );
}

async function canReadPasswordShare(token: string, accessMode: string) {
  if (accessMode !== ShareAccessMode.PASSWORD) {
    return true;
  }

  const secret = getShareAccessCookieSecret();
  if (!secret) {
    return false;
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(createShareAccessCookieName(token))?.value;

  return verifyShareAccessCookieValue(cookieValue, { token, secret });
}

async function resolveSharedItem({
  rootItem,
  slug,
  navigationScope,
}: {
  token: string;
  slug: string[];
  rootItem: ContentItem;
  navigationScope: string;
}) {
  if (slug.length === 0) {
    return rootItem;
  }

  if (navigationScope !== ShareNavigationScope.NAVIGABLE || rootItem.type !== ContentType.DOCS) {
    return null;
  }

  return findPublishedDocsContentBySlug(routeSegmentsToContentSlug(slug));
}

function PasswordUnlock({
  error,
  returnTo,
  token,
}: {
  error: string | undefined;
  returnTo: string;
  token: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-16">
      <section className="w-full rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-950">输入访问密码</h1>
        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            密码不正确，请重试。
          </p>
        ) : null}
        <form action={`/s/${encodeURIComponent(token)}/unlock`} className="mt-5 space-y-4" method="post">
          <input name="returnTo" type="hidden" value={returnTo} />
          <label className="block text-sm font-medium text-stone-700">
            密码
            <input
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="w-full rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
            type="submit"
          >
            解锁
          </button>
        </form>
      </section>
    </main>
  );
}

function SharedDocsNav({ docs, token }: { docs: ContentItem[]; token: string }) {
  return (
    <aside className="rounded-lg border border-stone-900/10 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
      <h2 className="text-sm font-bold text-stone-950">文档导航</h2>
      <nav className="mt-4 space-y-1">
        {docs.map((doc) => (
          <Link
            className="block rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950"
            href={doc.slug === 'index' ? `/s/${token}` : `/s/${token}/${encodeSlugPath(doc.slug)}`}
            key={doc.id}
          >
            {doc.title || doc.slug}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function buildSharePath(token: string, slug: string[]) {
  const suffix = slug.length > 0 ? `/${slug.map(encodeURIComponent).join('/')}` : '';
  return `/s/${encodeURIComponent(token)}${suffix}`;
}

function routeSegmentsToContentSlug(segments: string[]) {
  return segments.map(decodeRouteSegment).join('/');
}

function encodeSlugPath(slug: string) {
  return slug
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function decodeRouteSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
