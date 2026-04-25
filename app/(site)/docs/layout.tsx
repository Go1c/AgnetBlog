import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { buildDocsPageTree } from '@/lib/content/docs-page-tree';
import { ContentType } from '@/lib/generated/prisma/client';
import { baseOptions } from '@/lib/layout.shared';
import { listPublicContentItems } from '@/lib/db/content-repository';
import { source } from '@/lib/source';
import { isPublicListable } from '@/lib/content/visibility';

export const dynamic = 'force-dynamic';

export default async function DocsRootLayout({ children }: { children: ReactNode }) {
  const publicUrls = new Set(source.getPages().filter(isPublicListable).map((page) => page.url));
  const runtimeDocs = await listPublicContentItems(ContentType.DOCS);
  const pageTree = buildDocsPageTree({
    publicUrls,
    runtimeDocs,
    staticTree: source.pageTree,
  });

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      {children}
    </DocsLayout>
  );
}
