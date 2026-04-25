import Link from 'next/link';
import type { ReactNode } from 'react';

import { getAdminAuthState } from '@/lib/auth/admin';

const navItems = [
  { href: '/admin', label: '概览' },
  { href: '/admin/content', label: '内容' },
  { href: '/admin/sync-jobs', label: '同步任务' },
  { href: '/admin/directory-policies', label: '目录规则' },
  { href: '/admin/ai-tokens', label: 'AI 令牌' },
  { href: '/admin/setup', label: '配置说明' },
];

function AdminAccessDenied({
  reason,
  githubLogin,
}: {
  reason: 'not_authenticated' | 'not_allowlisted';
  githubLogin: string | null;
}) {
  const signInHref = `/api/auth/signin?callbackUrl=${encodeURIComponent('/admin')}`;
  const isNotAllowlisted = reason === 'not_allowlisted';

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-6 py-10">
      <section className="w-full rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-700">后台访问被拒绝</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-950">
          {reason === 'not_authenticated'
            ? '请使用已授权的 GitHub 账号登录'
            : '当前 GitHub 账号不在后台白名单里'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-700">
          {!isNotAllowlisted
            ? '后台需要先配置 GitHub OAuth，并把你的 GitHub 用户名写入 ADMIN_GITHUB_LOGINS。'
            : `当前登录账号是 ${githubLogin ?? '未知 GitHub 账号'}，但它不在 ADMIN_GITHUB_LOGINS 里。请退出后切换到已授权账号。`}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {!isNotAllowlisted ? (
            <Link
              className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white"
              href={signInHref}
            >
              登录
            </Link>
          ) : null}
          <Link
            className={
              isNotAllowlisted
                ? 'rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-md border border-stone-900/15 px-4 py-2 text-sm font-semibold text-stone-800'
            }
            href="/api/auth/signout"
          >
            {isNotAllowlisted ? '退出并切换账号' : '退出登录'}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authState = await getAdminAuthState();

  if (!authState.authorized) {
    return (
      <AdminAccessDenied
        githubLogin={authState.githubLogin}
        reason={authState.reason}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <header className="mb-6 border-b border-stone-900/10 pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">后台</p>
            <h1 className="mt-1 text-3xl font-bold text-stone-950">控制台</h1>
          </div>
          <div className="text-sm text-stone-600">
            当前账号{' '}
            <span className="font-semibold text-stone-900">
              {authState.actor.githubLogin}
            </span>
          </div>
        </div>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="后台栏目">
          {navItems.map((item) => (
            <Link
              className="rounded-md border border-stone-900/10 bg-white px-3 py-2 text-sm font-semibold text-stone-800 hover:border-teal-700/40 hover:text-teal-800"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </main>
  );
}

