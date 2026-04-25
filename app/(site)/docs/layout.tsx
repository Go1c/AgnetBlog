import type { ReactNode } from 'react';
import type { Folder, Node, Root } from 'fumadocs-core/page-tree';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { isPublicListable } from '@/lib/content/visibility';

function filterNode(node: Node, publicUrls: Set<string>): Node | null {
  if (node.type === 'page') {
    return publicUrls.has(node.url) ? node : null;
  }

  if (node.type === 'separator') {
    return node;
  }

  const index = node.index && publicUrls.has(node.index.url) ? node.index : undefined;
  const children = node.children
    .map((child) => filterNode(child, publicUrls))
    .filter((child): child is Node => child !== null);

  if (!index && children.length === 0) {
    return null;
  }

  return {
    ...node,
    index,
    children,
  } satisfies Folder;
}

function filterPageTree(tree: Root, publicUrls: Set<string>): Root {
  return {
    ...tree,
    children: tree.children
      .map((node) => filterNode(node, publicUrls))
      .filter((node): node is Node => node !== null),
    fallback: tree.fallback ? filterPageTree(tree.fallback, publicUrls) : undefined,
  };
}

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  const publicUrls = new Set(source.getPages().filter(isPublicListable).map((page) => page.url));
  const pageTree = filterPageTree(source.pageTree, publicUrls);

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      {children}
    </DocsLayout>
  );
}

