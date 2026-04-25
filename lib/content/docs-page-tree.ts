import type { Folder, Item, Node, Root } from 'fumadocs-core/page-tree';

import { runtimeContentUrl, type RuntimeContentItem } from '@/lib/content/runtime-content';

type RuntimeDocTreeItem = Pick<
  RuntimeContentItem,
  'type' | 'slug' | 'title' | 'description'
>;

export function buildDocsPageTree({
  publicUrls,
  runtimeDocs,
  staticTree,
}: {
  publicUrls: Set<string>;
  runtimeDocs: RuntimeDocTreeItem[];
  staticTree: Root;
}) {
  const pageTree = filterPageTree(staticTree, publicUrls);
  const runtimeNodes = runtimeDocs
    .map(runtimeDocToPageTreeItem)
    .filter((node) => node.url !== '/docs' && !publicUrls.has(node.url));

  if (runtimeNodes.length === 0) {
    return pageTree;
  }

  return {
    ...pageTree,
    children: [
      ...pageTree.children,
      {
        $id: 'runtime-docs',
        type: 'folder',
        name: '公开文档',
        defaultOpen: true,
        children: runtimeNodes,
      } satisfies Folder,
    ],
  } satisfies Root;
}

function hasPublicContent(node: Node) {
  return node.type === 'page' || node.type === 'folder';
}

function filterChildren(children: Node[], publicUrls: Set<string>) {
  const filtered = children
    .map((child) => filterNode(child, publicUrls))
    .filter((child): child is Node => child !== null);

  return filtered.filter((node, index) => {
    if (node.type !== 'separator') {
      return true;
    }

    const nextSeparatorIndex = filtered.findIndex(
      (next, nextIndex) => nextIndex > index && next.type === 'separator',
    );
    const groupEnd = nextSeparatorIndex === -1 ? filtered.length : nextSeparatorIndex;

    return filtered.slice(index + 1, groupEnd).some(hasPublicContent);
  });
}

function filterNode(node: Node, publicUrls: Set<string>): Node | null {
  if (node.type === 'page') {
    return publicUrls.has(node.url) ? node : null;
  }

  if (node.type === 'separator') {
    return node;
  }

  const index = node.index && publicUrls.has(node.index.url) ? node.index : undefined;
  const children = filterChildren(node.children, publicUrls);

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
    children: filterChildren(tree.children, publicUrls),
    fallback: tree.fallback ? filterPageTree(tree.fallback, publicUrls) : undefined,
  };
}

function runtimeDocToPageTreeItem(doc: RuntimeDocTreeItem) {
  return {
    $id: `runtime-doc:${doc.slug}`,
    type: 'page',
    name: doc.title || doc.slug,
    url: runtimeContentUrl(doc),
    description: doc.description ?? undefined,
  } satisfies Item;
}
