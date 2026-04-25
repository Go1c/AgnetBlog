import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MarkdownRenderer } from '@/components/markdown-renderer';
import { findContentItemById } from '@/lib/db/content-repository';
import { ContentType, Visibility } from '@/lib/generated/prisma/client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '内容详情',
};

type AdminContentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
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

const publishedOptions = [
  { label: '已发布', value: 'true' },
  { label: '草稿', value: 'false' },
] as const;

export default async function AdminContentDetailPage({
  params,
  searchParams,
}: AdminContentDetailPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const item = await findContentItemById(id);

  if (!item) {
    notFound();
  }

  const updated = getSingleParam(query.updated);
  const auditFailed = getSingleParam(query.audit_failed);
  const error = getSingleParam(query.error);
  const job = getSingleParam(query.job);
  const returnTo = `/admin/content/${encodeURIComponent(item.id)}`;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
        <Link
          className="text-sm font-semibold text-teal-700 hover:text-teal-900"
          href="/admin/content"
        >
          返回内容列表
        </Link>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-bold text-stone-950">{item.title}</h2>
            <p className="mt-2 break-all text-sm text-stone-600">{item.sourcePath}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
              {getContentTypeLabel(item.type)}
            </span>
            <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
              {getVisibilityLabel(item.visibility)}
            </span>
            <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
              {item.published ? '已发布' : '草稿'}
            </span>
          </div>
        </div>

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
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-950">权限与发布</h3>
          <form
            action={`/api/admin/content/${encodeURIComponent(item.id)}/metadata`}
            className="mt-5 space-y-5"
            method="post"
          >
            <input name="returnTo" type="hidden" value={returnTo} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-stone-700">
                标题
                <input
                  className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
                  defaultValue={item.title}
                  name="title"
                  required
                />
              </label>
              <label className="text-sm font-medium text-stone-700">
                Slug
                <input
                  className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
                  defaultValue={item.slug}
                  name="slug"
                  required
                />
              </label>
              <label className="text-sm font-medium text-stone-700">
                可见性
                <select
                  className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
                  defaultValue={toFrontmatterVisibility(item.visibility)}
                  name="visibility"
                >
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
                  defaultValue={item.published ? 'true' : 'false'}
                  name="published"
                >
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
                  defaultValue={toFrontmatterContentType(item.type)}
                  name="contentType"
                >
                  {contentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-stone-700">
                标签
                <input
                  className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
                  defaultValue={item.tags.join(', ')}
                  name="tags"
                  placeholder="多个标签用英文逗号分隔"
                />
              </label>
              <label className="text-sm font-medium text-stone-700">
                发布日期
                <input
                  className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
                  defaultValue={formatDateInput(item.publishedAt)}
                  name="date"
                  type="date"
                />
              </label>
              <label className="text-sm font-medium text-stone-700 md:col-span-2">
                摘要
                <textarea
                  className="mt-1 min-h-24 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm leading-6 text-stone-900"
                  defaultValue={item.description ?? ''}
                  name="summary"
                />
              </label>
            </div>
            <button
              className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
              type="submit"
            >
              保存权限与元数据
            </button>
          </form>
        </section>

        <aside className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-950">来源与同步</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-stone-950">内容 ID</dt>
              <dd className="mt-1 break-all text-stone-600">{item.id}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-950">GitHub 路径</dt>
              <dd className="mt-1 break-all text-stone-600">{item.sourcePath}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-950">Source Hash</dt>
              <dd className="mt-1 break-all text-stone-600">{item.sourceHash ?? '无'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-950">最近同步</dt>
              <dd className="mt-1 text-stone-600">{formatDateTime(item.syncedAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-950">数据库更新时间</dt>
              <dd className="mt-1 text-stone-600">{formatDateTime(item.updatedAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-950">资源</dt>
              <dd className="mt-1 text-stone-600">
                {item.assets.length} 个附件，{item.docsNavNodes.length} 个文档导航节点
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-stone-950">正文预览</h3>
        <div className="mt-5 border-t border-stone-900/10 pt-5">
          <MarkdownRenderer content={item.body} />
        </div>
      </section>

      <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
        <details>
          <summary className="cursor-pointer text-lg font-bold text-stone-950">Markdown 源文</summary>
          <pre className="mt-5 max-h-[520px] overflow-auto rounded-md bg-stone-950 p-4 text-sm leading-6 text-stone-100">
            <code>{item.body?.trim() ? item.body : '这篇内容还没有正文。'}</code>
          </pre>
        </details>
      </section>
    </div>
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

function getContentTypeLabel(contentType: ContentType) {
  return contentType === ContentType.DOCS ? '文档' : '博客';
}

function getVisibilityLabel(visibility: Visibility) {
  if (visibility === Visibility.PUBLIC) {
    return '公开';
  }

  if (visibility === Visibility.UNLISTED) {
    return '隐藏链接';
  }

  return '私有';
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDateInput(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : '';
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return '无';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value);
}
