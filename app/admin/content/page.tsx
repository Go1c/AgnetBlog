import { listContentItems } from '@/lib/db/content-repository';
import { ContentType, Visibility } from '@/lib/generated/prisma/client';

export const metadata = {
  title: 'Admin Content',
};

type AdminContentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const contentTypeOptions = [
  { label: 'Blog', value: 'blog' },
  { label: 'Docs', value: 'docs' },
] as const;

const visibilityOptions = [
  { label: 'Private', value: 'private' },
  { label: 'Public', value: 'public' },
  { label: 'Unlisted', value: 'unlisted' },
] as const;

export default async function AdminContentPage({ searchParams }: AdminContentPageProps) {
  const params = (await searchParams) ?? {};
  const updated = getSingleParam(params.updated);
  const error = getSingleParam(params.error);
  const job = getSingleParam(params.job);
  const items = await listContentItems({
    orderBy: [{ updatedAt: 'desc' }],
    take: 50,
  });

  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-950">Content</h2>
          <p className="mt-2 text-sm text-stone-600">
            Edit publishing metadata in GitHub frontmatter, then sync the derived record.
          </p>
        </div>
        <div className="text-sm font-medium text-stone-600">{items.length} items</div>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          Writeback failed: {formatStatus(error)}
        </div>
      ) : null}

      {updated ? (
        <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">
          Metadata update submitted for {updated}
          {job ? `; sync job ${job} ran inline.` : '.'}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-md border border-stone-900/10">
        <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_160px] gap-3 border-b border-stone-900/10 bg-stone-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-500">
          <span>Source</span>
          <span>Visibility</span>
          <span>Type</span>
          <span>Action</span>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-600">No synced content is available yet.</p>
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
                Visibility
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
                Content type
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
                Save metadata
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
