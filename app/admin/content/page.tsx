import Link from 'next/link';

import { listContentItems } from '@/lib/db/content-repository';
import { ContentType, Visibility } from '@/lib/generated/prisma/client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '后台内容',
};

type AdminContentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ContentItemForList = Awaited<ReturnType<typeof listContentItems>>[number];
type VisibilityFilter = 'all' | 'private' | 'public' | 'unlisted';
type TypeFilter = 'all' | 'blog' | 'docs';
type PublishedFilter = 'all' | 'published' | 'draft';

type ContentFilters = {
  visibility: VisibilityFilter;
  type: TypeFilter;
  published: PublishedFilter;
};

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
  const syncJob = getSingleParam(params.sync_job);
  const syncMode = getSingleParam(params.sync_mode);
  const syncScanned = getSingleParam(params.sync_scanned);
  const syncStatus = getSingleParam(params.sync_status);
  const syncUpserted = getSingleParam(params.sync_upserted);
  const filters = parseFilters(params);
  const allItems = await listContentItems({
    orderBy: [{ updatedAt: 'desc' }, { syncedAt: 'desc' }],
  });
  const items = filterContentItems(allItems, filters);
  const counts = countContentItems(allItems);
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
            <input name="returnTo" type="hidden" value="/admin/content" />
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

      <form className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]" method="get">
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

      <div className="mt-6 overflow-hidden rounded-md border border-stone-900/10">
        <div className="hidden grid-cols-[minmax(0,1.5fr)_120px_120px_120px_130px_180px] gap-3 border-b border-stone-900/10 bg-stone-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-500 md:grid">
          <span>来源</span>
          <span>可见性</span>
          <span>发布状态</span>
          <span>类型</span>
          <span>同步时间</span>
          <span>操作</span>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-600">
            {allItems.length === 0 ? '还没有同步到数据库的内容。' : '当前筛选下没有内容。'}
          </p>
        ) : (
          items.map((item) => (
            <form
              action={`/api/admin/content/${encodeURIComponent(item.id)}/metadata`}
              className="grid gap-3 border-b border-stone-900/10 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.5fr)_120px_120px_120px_130px_180px] md:items-center"
              key={item.id}
              method="post"
            >
              <input name="returnTo" type="hidden" value={listReturnTo} />
              <div className="min-w-0">
                <Link
                  className="block truncate text-sm font-semibold text-stone-950 hover:text-teal-800"
                  href={`/admin/content/${encodeURIComponent(item.id)}`}
                >
                  {item.title}
                </Link>
                <div className="mt-1 truncate text-xs text-stone-500">{item.sourcePath}</div>
                <div className="mt-1 text-xs text-stone-500">
                  {item.body?.trim() ? `${item.body.length} 个字符` : '未同步正文'}
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
    </section>
  );
}

function parseFilters(params: Record<string, string | string[] | undefined>): ContentFilters {
  return {
    visibility: getFilter(params.visibility, visibilityFilterValues, 'all'),
    type: getFilter(params.type, typeFilterValues, 'all'),
    published: getFilter(params.published, publishedFilterValues, 'all'),
  };
}

function filterContentItems(items: ContentItemForList[], filters: ContentFilters) {
  return items.filter((item) => {
    const visibilityMatches =
      filters.visibility === 'all' || toFrontmatterVisibility(item.visibility) === filters.visibility;
    const typeMatches = filters.type === 'all' || toFrontmatterContentType(item.type) === filters.type;
    const publishedMatches =
      filters.published === 'all' ||
      (filters.published === 'published' ? item.published : !item.published);

    return visibilityMatches && typeMatches && publishedMatches;
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

function buildAdminContentPath(filters: ContentFilters) {
  const target = new URL('/admin/content', 'https://local.invalid');

  if (filters.visibility !== 'all') {
    target.searchParams.set('visibility', filters.visibility);
  }

  if (filters.type !== 'all') {
    target.searchParams.set('type', filters.type);
  }

  if (filters.published !== 'all') {
    target.searchParams.set('published', filters.published);
  }

  return `${target.pathname}${target.search}`;
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
