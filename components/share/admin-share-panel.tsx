import type {
  ContentShare,
  ShareAccessModeValue,
  ShareNavigationScopeValue,
} from '@/lib/db/share-repository';
import { ShareAccessMode, ShareNavigationScope } from '@/lib/db/share-repository';

type AdminSharePanelProps = {
  contentId: string;
  title: string;
  shares: ContentShare[];
  baseUrl: string;
};

const accessModeOptions: Array<{ label: string; value: ShareAccessModeValue }> = [
  { label: '仅链接', value: ShareAccessMode.LINK },
  { label: '密码访问', value: ShareAccessMode.PASSWORD },
];

const navigationScopeOptions: Array<{ label: string; value: ShareNavigationScopeValue }> = [
  { label: '仅当前内容', value: ShareNavigationScope.CURRENT_ONLY },
  { label: '允许文档导航', value: ShareNavigationScope.NAVIGABLE },
];

export function AdminSharePanel({ contentId, title, shares, baseUrl }: AdminSharePanelProps) {
  const activeShares = shares.filter((share) => !share.revokedAt);
  const revokedShares = shares.filter((share) => share.revokedAt);

  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-stone-950">分享链接</h3>
      <form
        action={`/api/admin/content/${encodeURIComponent(contentId)}/shares`}
        className="mt-5 space-y-4"
        method="post"
      >
        <input name="returnTo" type="hidden" value={`/admin/content/${contentId}`} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-stone-700">
            访问方式
            <select
              className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
              defaultValue={ShareAccessMode.LINK}
              name="accessMode"
            >
              {accessModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-stone-700">
            导航范围
            <select
              className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
              defaultValue={ShareNavigationScope.CURRENT_ONLY}
              name="navigationScope"
            >
              {navigationScopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium text-stone-700">
          密码
          <input
            className="mt-1 w-full rounded-md border border-stone-900/15 bg-white px-3 py-2 text-sm text-stone-900"
            name="password"
            placeholder="选择密码访问时必填"
            type="password"
          />
        </label>
        <button
          className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
          type="submit"
        >
          创建分享链接
        </button>
      </form>

      <ShareList
        baseUrl={baseUrl}
        contentId={contentId}
        emptyText="暂无有效分享链接。"
        shares={activeShares}
        title={title}
      />
      <ShareList
        baseUrl={baseUrl}
        contentId={contentId}
        emptyText="暂无已撤销链接。"
        revoked
        shares={revokedShares}
        title={title}
      />
    </section>
  );
}

function ShareList({
  baseUrl,
  contentId,
  emptyText,
  revoked = false,
  shares,
  title,
}: {
  baseUrl: string;
  contentId: string;
  emptyText: string;
  revoked?: boolean;
  shares: ContentShare[];
  title: string;
}) {
  return (
    <div className="mt-6 border-t border-stone-900/10 pt-5">
      <h4 className="text-sm font-bold text-stone-950">{revoked ? '已撤销' : '有效链接'}</h4>
      {shares.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {shares.map((share) => {
            const url = buildShareUrl(baseUrl, share.token);

            return (
              <li className="rounded-md border border-stone-900/10 p-4" key={share.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 text-sm">
                    <p className="break-all font-semibold text-stone-950">{url}</p>
                    <p className="mt-1 text-stone-600">
                      {formatAccessMode(share.accessMode)} · {formatNavigationScope(share.navigationScope)}
                    </p>
                  </div>
                  {!revoked ? (
                    <form action={`/api/admin/shares/${encodeURIComponent(share.id)}/revoke`} method="post">
                      <input name="returnTo" type="hidden" value={`/admin/content/${contentId}`} />
                      <button
                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                        type="submit"
                      >
                        撤销
                      </button>
                    </form>
                  ) : null}
                </div>
                <textarea
                  className="mt-3 min-h-16 w-full rounded-md border border-stone-900/10 bg-stone-50 px-3 py-2 text-sm text-stone-700"
                  readOnly
                  value={`${title}\n${url}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function buildShareUrl(baseUrl: string, token: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  return `${normalizedBaseUrl}/s/${encodeURIComponent(token)}`;
}

function formatAccessMode(mode: ShareAccessModeValue) {
  return mode === ShareAccessMode.PASSWORD ? '密码访问' : '仅链接';
}

function formatNavigationScope(scope: ShareNavigationScopeValue) {
  return scope === ShareNavigationScope.NAVIGABLE ? '允许文档导航' : '仅当前内容';
}
