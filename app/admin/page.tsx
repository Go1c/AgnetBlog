export const metadata = {
  title: '后台',
};

export default function AdminPage() {
  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-stone-950">运行概览</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">
        这里是博客后台。你可以查看内容状态、触发 GitHub 同步、管理目录规则、
        发放 AI 令牌，并检查审计记录。
      </p>
      <dl className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-stone-900/10 p-4">
          <dt className="text-sm font-semibold text-stone-950">登录方式</dt>
          <dd className="mt-1 text-sm text-stone-600">
            使用 GitHub OAuth 登录，并通过 ADMIN_GITHUB_LOGINS 控制后台白名单。
          </dd>
        </div>
        <div className="rounded-md border border-stone-900/10 p-4">
          <dt className="text-sm font-semibold text-stone-950">页面保护</dt>
          <dd className="mt-1 text-sm text-stone-600">
            后台页面和后台 API 都会在服务端检查登录状态。
          </dd>
        </div>
      </dl>
    </section>
  );
}

