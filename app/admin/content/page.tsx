import { listContentItems } from '@/lib/db/content-repository';
import { ContentType, Visibility } from '@/lib/generated/prisma/client';

export const metadata = {
  title: '后台内容',
};

type AdminContentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

export default async function AdminContentPage({ searchParams }: AdminContentPageProps) {
  const params = (await searchParams) ?? {};
  const updated = getSingleParam(params.updated);
  const auditFailed = getSingleParam(params.audit_failed);
  const error = getSingleParam(params.error);
  const job = getSingleParam(params.job);
  const syncError = getSingleParam(params.sync_error);
  const syncJob = getSingleParam(params.sync_job);
  const syncMode = getSingleParam(params.sync_mode);
  const syncStatus = getSingleParam(params.sync_status);
  const items = await listContentItems({
    orderBy: [{ updatedAt: 'desc' }],
    take: 50,
  });

  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-950">内容</h2>
          <p className="mt-2 text-sm text-stone-600">
            在后台修改发布元数据，系统会写回 GitHub frontmatter 并同步索引。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-medium text-stone-600">{items.length} 条内容</div>
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

      <div className="mt-6 overflow-hidden rounded-md border border-stone-900/10">
        <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_160px] gap-3 border-b border-stone-900/10 bg-stone-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-500">
          <span>来源</span>
          <span>可见性</span>
          <span>类型</span>
          <span>操作</span>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-600">还没有同步到数据库的内容。</p>
        ) : (
          items.map((item) => (
            <form
              action={`/api/admin/content/${encodeURIComponent(item.id)}/metadata`}
              className="grid grid-cols-[minmax(0,1fr)_120px_120px_160px] items-center gap-3 border-b border-stone-900/10 px-4 py-3 last:border-b-0"
              key={item.id}
              method="post"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-stone-950">{item.title}</div>
                <div className="mt-1 truncate text-xs text-stone-500">{item.sourcePath}</div>
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
              <button
                className="rounded-md bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800"
                type="submit"
              >
                保存元数据
              </button>
            </form>
          ))
        )}
      </div>
    </section>
  );
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

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}
