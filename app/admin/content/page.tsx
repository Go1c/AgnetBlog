import Link from 'next/link';

import { listContentItems } from '@/lib/db/content-repository';
import { ContentType, Visibility } from '@/lib/generated/prisma/client';
import type { Prisma } from '@/lib/generated/prisma/client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '后台内容',
};

type AdminContentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type VisibilityFilter = 'all' | 'private' | 'public' | 'unlisted';
type TypeFilter = 'all' | 'blog' | 'docs';
type PublishedFilter = 'all' | 'published' | 'draft';

type ContentFilters = {
  visibility: VisibilityFilter;
  type: TypeFilter;
  published: PublishedFilter;
  q: string;
  path: string;
};

type DirectoryNode = {
  name: string;
  path: string;
  count: number;
  children: Map<string, DirectoryNode>;
};

const adminContentItemSelect = {
  id: true,
  type: true,
  slug: true,
  title: true,
  description: true,
  tags: true,
  sourcePath: true,
  visibility: true,
  published: true,
  syncedAt: true,
  updatedAt: true,
} satisfies Prisma.ContentItemSelect;

type ContentItemForList = Prisma.ContentItemGetPayload<{
  select: typeof adminContentItemSelect;
}>;

const contentTypeOptions = [
  { label: '博客', value: 'blog' },
  { label: '文档', value: 'docs' },
] as const;

const visibilityOptions = [
  { label: '私有', value: 'private' },
  { label: '公开', value: 'public' },
  { label: '隐藏链接', value: 'unlisted' },
] as const;

const publishedOptions = [
  { label: '已发布', value: 'true' },
  { label: '草稿', value: 'false' },
] as const;

const visibilityFilterValues = ['all', 'private', 'public', 'unlisted'] as const;
const typeFilterValues = ['all', 'blog', 'docs'] as const;
const publishedFilterValues = ['all', 'published', 'draft'] as const;

export default async function AdminContentPage({ searchParams }: AdminContentPageProps) {
  const params = (await searchParams) ?? {};
  const updated = getSingleParam(params.updated);
  const auditFailed = getSingleParam(params.audit_failed);
  const error = getSingleParam(params.error);
  const job = getSingleParam(params.job);
  const syncError = getSingleParam(params.sync_error);
  const syncFailed = getSingleParam(params.sync_failed);
  const syncDeleted = getSingleParam(params.sync_deleted);
  const syncJob = getSingleParam(params.sync_job);
  const syncMode = getSingleParam(params.sync_mode);
  const syncScanned = getSingleParam(params.sync_scanned);
  const syncSkipped = getSingleParam(params.sync_skipped);
  const syncStatus = getSingleParam(params.sync_status);
  const syncUpserted = getSingleParam(params.sync_upserted);
  const batchUpdated = getSingleParam(params.batch_updated);
  const batchFailed = getSingleParam(params.batch_failed);
  const batchAuditFailed = getSingleParam(params.batch_audit_failed);
  const filters = parseFilters(params);
  const allItems = await listContentItems({
    select: adminContentItemSelect,
    orderBy: [{ updatedAt: 'desc' }, { syncedAt: 'desc' }],
  });
  const items = filterContentItems(allItems, filters);
  const counts = countContentItems(allItems);
  const directoryTree = buildDirectoryTree(allItems);
  const listReturnTo = buildAdminContentPath(filters);

  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-950">内容</h2>
          <p className="mt-2 text-sm text-stone-600">
            这里显示数据库里同步到的全部笔记。你可以查看正文、调整发布状态、控制公开/私有权限，并把修改写回 GitHub。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-medium text-stone-600">
            当前 {items.length} 条 / 全部 {allItems.length} 条
          </div>
          <form action="/api/admin/sync" method="post">
            <input name="returnTo" type="hidden" value={listReturnTo} />
            <button
              className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              type="submit"
            >
              立即同步
            </button>
          </form>
        </div>
      </div>

      {syncError ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          同步失败：{formatStatus(syncError)}
        </div>
      ) : null}

      {syncStatus ? (
        <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">
          手动同步已执行：{formatStatus(syncStatus)}
          {syncMode ? `，模式 ${formatStatus(syncMode)}` : ''}
          {syncScanned ? `，扫描 ${syncScanned} 个文件` : ''}
          {syncUpserted ? `，写入 ${syncUpserted} 个` : ''}
          {syncDeleted ? `，删除 ${syncDeleted} 个` : ''}
          {syncSkipped ? `，跳过 ${syncSkipped} 个未变更文件` : ''}
          {syncFailed ? `，失败 ${syncFailed} 个` : ''}
          {syncJob ? `，任务 ${syncJob}。` : '。'}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          写回失败：{formatStatus(error)}
        </div>
      ) : null}

      {auditFailed ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {auditFailed} 的元数据已同步，但审计记录写入失败
          {job ? `，同步任务为 ${job}。` : '。'}
        </div>
      ) : null}

      {updated ? (
        <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">
          {updated} 的元数据更新已提交
          {job ? `，同步任务 ${job} 已执行。` : '。'}
        </div>
      ) : null}

      {batchUpdated ? (
        <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">
          批量修改已提交：成功 {batchUpdated} 条
          {batchFailed ? `，失败 ${batchFailed} 条` : ''}
          {batchAuditFailed ? `，审计记录失败 ${batchAuditFailed} 条` : ''}
          {job ? `，同步任务 ${job} 已执行。` : '。'}
        </div>
      ) : null}

      <form className="mt-6 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto]" method="get">
        {filters.path ? <input name="path" type="hidden" value={filters.path} /> : null}
        <label className="text-sm font-medium text-stone-700">
          模糊搜索
          <input
            className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
            defaultValue={filters.q}
            name="q"
            placeholder="标题、路径、slug、标签"
            type="search"
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          可见性
          <select
            className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
            defaultValue={filters.visibility}
            name="visibility"
          >
            <option value="all">全部可见性 ({counts.all})</option>
            <option value="private">私有 ({counts.private})</option>
            <option value="public">公开 ({counts.public})</option>
            <option value="unlisted">隐藏链接 ({counts.unlisted})</option>
          </select>
        </label>
        <label className="text-sm font-medium text-stone-700">
          类型
          <select
            className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
            defaultValue={filters.type}
            name="type"
          >
            <option value="all">全部类型 ({counts.all})</option>
            <option value="blog">博客 ({counts.blog})</option>
            <option value="docs">文档 ({counts.docs})</option>
          </select>
        </label>
        <label className="text-sm font-medium text-stone-700">
          发布状态
          <select
            className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
            defaultValue={filters.published}
            name="published"
          >
            <option value="all">全部状态 ({counts.all})</option>
            <option value="published">已发布 ({counts.published})</option>
            <option value="draft">草稿 ({counts.draft})</option>
          </select>
        </label>
        <button
          className="self-end rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
          type="submit"
        >
          筛选
        </button>
        <Link
          className="self-end rounded-md border border-stone-900/15 px-4 py-2 text-center text-sm font-semibold text-stone-800 hover:border-teal-700/40 hover:text-teal-800"
          href="/admin/content"
        >
          清除
        </Link>
      </form>

      <form
        action="/api/admin/content/batch-metadata"
        className="mt-4 grid gap-3 rounded-md border border-stone-900/10 bg-stone-50/70 p-4 md:grid-cols-[auto_1fr_1fr_1fr_auto]"
        id="batch-content-form"
        method="post"
      >
        <input name="returnTo" type="hidden" value={listReturnTo} />
        <div className="self-end text-sm font-bold text-stone-950">批量修改</div>
        <label className="text-sm font-medium text-stone-700">
          可见性
          <select
            className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
            defaultValue="keep"
            name="visibility"
          >
            <option value="keep">保持不变</option>
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-stone-700">
          发布状态
          <select
            className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
            defaultValue="keep"
            name="published"
          >
            <option value="keep">保持不变</option>
            {publishedOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-stone-700">
          类型
          <select
            className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
            defaultValue="keep"
            name="contentType"
          >
            <option value="keep">保持不变</option>
            {contentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="self-end rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
          type="submit"
        >
          批量保存
        </button>
      </form>

      <div className="mt-6 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-md border border-stone-900/10 bg-stone-50/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-stone-950">目录</h3>
            <Link
              className="text-xs font-semibold text-teal-800 hover:text-teal-950"
              href={buildAdminContentPath(filters, { path: '' })}
            >
              全部
            </Link>
          </div>
          <nav className="max-h-[640px] overflow-auto pr-1 text-sm" aria-label="内容目录">
            {renderDirectoryNode(directoryTree, filters)}
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-1 text-sm text-stone-600 md:flex-row md:items-center md:justify-between">
            <div>
              当前目录：
              <span className="font-semibold text-stone-900">
                {filters.path || '全部'}
              </span>
            </div>
            <div>
              匹配 {items.length} 条 / 全部 {allItems.length} 条
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-stone-900/10">
            <div className="hidden grid-cols-[44px_minmax(0,1.6fr)_120px_120px_120px_130px_180px] gap-3 border-b border-stone-900/10 bg-stone-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-500 md:grid">
              <span>选择</span>
              <span>标题/来源</span>
              <span>可见性</span>
              <span>发布状态</span>
              <span>类型</span>
              <span>同步时间</span>
              <span>操作</span>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-stone-600">
                {allItems.length === 0 ? '还没有同步到数据库的内容。' : '当前条件下没有内容。'}
              </p>
            ) : (
              items.map((item) => (
                <form
                  action={`/api/admin/content/${encodeURIComponent(item.id)}/metadata`}
                  className="grid gap-3 border-b border-stone-900/10 px-4 py-3 last:border-b-0 md:grid-cols-[44px_minmax(0,1.6fr)_120px_120px_120px_130px_180px] md:items-center"
                  key={item.id}
                  method="post"
                >
                  <input name="returnTo" type="hidden" value={listReturnTo} />
                  <input
                    aria-label={`选择 ${item.title || item.sourcePath}`}
                    className="h-4 w-4 rounded border-stone-900/20 text-teal-700"
                    form="batch-content-form"
                    name="contentId"
                    type="checkbox"
                    value={item.id}
                  />
                  <div className="min-w-0">
                    <Link
                      className="block truncate text-sm font-semibold text-stone-950 hover:text-teal-800"
                      href={`/admin/content/${encodeURIComponent(item.id)}`}
                    >
                      {item.title || '未命名'}
                    </Link>
                    <div className="mt-1 truncate text-xs text-stone-500">{item.sourcePath}</div>
                    <div className="mt-1 truncate text-xs text-stone-500">
                      {item.description || item.slug}
                    </div>
                  </div>
                  <label className="sr-only" htmlFor={`visibility-${item.id}`}>
                    可见性
                  </label>
                  <select
                    className="w-full rounded-md border border-stone-900/15 bg-white px-2 py-2 text-sm text-stone-900"
                    defaultValue={toFrontmatterVisibility(item.visibility)}
                    id={`visibility-${item.id}`}
                    name="visibility"
                  >
                    {visibilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`published-${item.id}`}>
                    发布状态
                  </label>
                  <select
                    className="w-full rounded-md border border-stone-900/15 bg-white px-2 py-2 text-sm text-stone-900"
                    defaultValue={item.published ? 'true' : 'false'}
                    id={`published-${item.id}`}
                    name="published"
                  >
                    {publishedOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`contentType-${item.id}`}>
                    内容类型
                  </label>
                  <select
                    className="w-full rounded-md border border-stone-900/15 bg-white px-2 py-2 text-sm text-stone-900"
                    defaultValue={toFrontmatterContentType(item.type)}
                    id={`contentType-${item.id}`}
                    name="contentType"
                  >
                    {contentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-stone-500">{formatDateTime(item.syncedAt)}</div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="rounded-md border border-stone-900/15 px-3 py-2 text-sm font-semibold text-stone-800 hover:border-teal-700/40 hover:text-teal-800"
                      href={`/admin/content/${encodeURIComponent(item.id)}`}
                    >
                      查看正文
                    </Link>
                    <button
                      className="rounded-md bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800"
                      type="submit"
                    >
                      保存
                    </button>
                  </div>
                </form>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function parseFilters(params: Record<string, string | string[] | undefined>): ContentFilters {
  return {
    visibility: getFilter(params.visibility, visibilityFilterValues, 'all'),
    type: getFilter(params.type, typeFilterValues, 'all'),
    published: getFilter(params.published, publishedFilterValues, 'all'),
    q: normalizeFreeTextParam(params.q),
    path: normalizePathParam(params.path),
  };
}

function filterContentItems(items: ContentItemForList[], filters: ContentFilters) {
  const searchTokens = tokenizeSearch(filters.q);

  return items.filter((item) => {
    const visibilityMatches =
      filters.visibility === 'all' || toFrontmatterVisibility(item.visibility) === filters.visibility;
    const typeMatches = filters.type === 'all' || toFrontmatterContentType(item.type) === filters.type;
    const publishedMatches =
      filters.published === 'all' ||
      (filters.published === 'published' ? item.published : !item.published);
    const pathMatches =
      !filters.path || item.sourcePath === filters.path || item.sourcePath.startsWith(`${filters.path}/`);
    const searchMatches = matchesSearch(item, searchTokens);

    return visibilityMatches && typeMatches && publishedMatches && pathMatches && searchMatches;
  });
}

function countContentItems(items: ContentItemForList[]) {
  return {
    all: items.length,
    private: items.filter((item) => item.visibility === Visibility.PRIVATE).length,
    public: items.filter((item) => item.visibility === Visibility.PUBLIC).length,
    unlisted: items.filter((item) => item.visibility === Visibility.UNLISTED).length,
    blog: items.filter((item) => item.type === ContentType.BLOG).length,
    docs: items.filter((item) => item.type === ContentType.DOCS).length,
    published: items.filter((item) => item.published).length,
    draft: items.filter((item) => !item.published).length,
  };
}

function buildDirectoryTree(items: ContentItemForList[]): DirectoryNode {
  const root: DirectoryNode = {
    name: '全部',
    path: '',
    count: items.length,
    children: new Map(),
  };

  for (const item of items) {
    const segments = item.sourcePath.split('/').filter(Boolean).slice(0, -1);
    let current = root;

    for (const segment of segments) {
      const path = current.path ? `${current.path}/${segment}` : segment;
      const existing = current.children.get(segment);
      const child =
        existing ??
        {
          name: segment,
          path,
          count: 0,
          children: new Map<string, DirectoryNode>(),
        };

      child.count += 1;
      current.children.set(segment, child);
      current = child;
    }
  }

  return root;
}

function renderDirectoryNode(root: DirectoryNode, filters: ContentFilters) {
  const children = sortDirectoryNodes([...root.children.values()]);

  return (
    <ul className="space-y-1">
      <li>
        <Link
          className={directoryLinkClass(filters.path === '')}
          href={buildAdminContentPath(filters, { path: '' })}
        >
          <span className="truncate">全部内容</span>
          <span className="text-xs text-stone-500">{root.count}</span>
        </Link>
      </li>
      {children.map((child) => (
        <DirectoryTreeItem filters={filters} key={child.path} node={child} />
      ))}
    </ul>
  );
}

function DirectoryTreeItem({ node, filters }: { node: DirectoryNode; filters: ContentFilters }) {
  const children = sortDirectoryNodes([...node.children.values()]);
  const isSelected = filters.path === node.path;
  const isOpen =
    isSelected || Boolean(filters.path && filters.path.startsWith(`${node.path}/`));
  const link = (
    <Link
      className={directoryLinkClass(isSelected)}
      href={buildAdminContentPath(filters, { path: node.path })}
    >
      <span className="truncate">{node.name}</span>
      <span className="text-xs text-stone-500">{node.count}</span>
    </Link>
  );

  if (children.length === 0) {
    return <li>{link}</li>;
  }

  return (
    <li>
      <details open={isOpen}>
        <summary className="list-none">
          {link}
        </summary>
        <ul className="mt-1 space-y-1 border-l border-stone-900/10 pl-3">
          {children.map((child) => (
            <DirectoryTreeItem filters={filters} key={child.path} node={child} />
          ))}
        </ul>
      </details>
    </li>
  );
}

function sortDirectoryNodes(nodes: DirectoryNode[]) {
  return nodes.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

function directoryLinkClass(selected: boolean) {
  return [
    'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 font-medium',
    selected
      ? 'bg-teal-700 text-white [&_span:last-child]:text-teal-50'
      : 'text-stone-700 hover:bg-white hover:text-teal-800',
  ].join(' ');
}

function buildAdminContentPath(
  filters: ContentFilters,
  overrides: Partial<ContentFilters> = {},
) {
  const next = {
    ...filters,
    ...overrides,
  };
  const target = new URL('/admin/content', 'https://local.invalid');

  if (next.q) {
    target.searchParams.set('q', next.q);
  }

  if (next.path) {
    target.searchParams.set('path', next.path);
  }

  if (next.visibility !== 'all') {
    target.searchParams.set('visibility', next.visibility);
  }

  if (next.type !== 'all') {
    target.searchParams.set('type', next.type);
  }

  if (next.published !== 'all') {
    target.searchParams.set('published', next.published);
  }

  return `${target.pathname}${target.search}`;
}

function matchesSearch(item: ContentItemForList, tokens: string[]) {
  if (tokens.length === 0) {
    return true;
  }

  const haystack = normalizeSearchText(
    [
      item.title,
      item.description,
      item.slug,
      item.sourcePath,
      toFrontmatterContentType(item.type),
      toFrontmatterVisibility(item.visibility),
      item.published ? 'published 已发布' : 'draft 草稿',
      item.tags.join(' '),
    ]
      .filter(Boolean)
      .join(' '),
  );

  return tokens.every((token) => haystack.includes(token) || isSubsequence(token, haystack));
}

function tokenizeSearch(value: string) {
  return value
    .split(/\s+/)
    .map(normalizeSearchText)
    .filter(Boolean);
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[\s/_.,:;()[\]{}'"`-]+/g, '');
}

function isSubsequence(needle: string, haystack: string) {
  let index = 0;

  for (const character of haystack) {
    if (character === needle[index]) {
      index += 1;
      if (index === needle.length) {
        return true;
      }
    }
  }

  return needle.length === 0;
}

function toFrontmatterVisibility(visibility: Visibility) {
  if (visibility === Visibility.PUBLIC) {
    return 'public';
  }

  if (visibility === Visibility.UNLISTED) {
    return 'unlisted';
  }

  return 'private';
}

function toFrontmatterContentType(contentType: ContentType) {
  return contentType === ContentType.DOCS ? 'docs' : 'blog';
}

function getFilter<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
) {
  const single = getSingleParam(value);
  return allowed.includes(single as T) ? (single as T) : fallback;
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeFreeTextParam(value: string | string[] | undefined) {
  return getSingleParam(value)?.trim().slice(0, 120) ?? '';
}

function normalizePathParam(value: string | string[] | undefined) {
  return (getSingleParam(value) ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return '未同步';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value);
}
