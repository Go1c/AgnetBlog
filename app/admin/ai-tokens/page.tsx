import { redirect } from 'next/navigation';

import { parseAiScopes } from '@/lib/ai/scopes';
import {
  AiTokenConfigError,
  AiTokenInputError,
  createAiToken,
  listAiTokens,
  revokeAiToken,
} from '@/lib/ai/token';
import { getAdminAuthState } from '@/lib/auth/admin';
import { db } from '@/lib/db';

import {
  TokenCreationForm,
  type CreateTokenState,
} from './token-creation-form';

export const metadata = {
  title: '后台 AI 令牌',
};

type AdminAiTokensPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAiTokensPage({ searchParams }: AdminAiTokensPageProps) {
  const params = (await searchParams) ?? {};
  const error = getSingleParam(params.error);
  const tokens = await listAiTokens();

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-950">AI 令牌</h2>
            <p className="mt-2 text-sm text-stone-600">
              发放带权限范围的 Bearer token，供 Agent 调用内容、同步和审计 API。
            </p>
          </div>
          <div className="text-sm font-medium text-stone-600">
            已发放 {tokens.length} 个
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            令牌操作失败：{formatStatus(error)}
          </div>
        ) : null}

        <TokenCreationForm action={createTokenAction} />
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-900/10 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(180px,1.4fr)_160px_110px] gap-3 border-b border-stone-900/10 bg-stone-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-500">
          <span>名称</span>
          <span>权限范围</span>
          <span>最近使用</span>
          <span>操作</span>
        </div>
        {tokens.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-600">还没有发放 AI 令牌。</p>
        ) : (
          tokens.map((token) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_minmax(180px,1.4fr)_160px_110px] items-center gap-3 border-b border-stone-900/10 px-4 py-3 last:border-b-0"
              key={token.id}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-stone-950">
                  {token.name}
                </div>
                <div className="mt-1 text-xs text-stone-500">
                  {token.revokedAt ? `已撤销：${formatDate(token.revokedAt)}` : `创建于：${formatDate(token.createdAt)}`}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {token.scopes.map((scope) => (
                  <span
                    className="rounded-md border border-stone-900/10 bg-stone-50 px-2 py-1 text-xs font-medium text-stone-700"
                    key={scope}
                  >
                    {scope}
                  </span>
                ))}
              </div>
              <div className="text-sm text-stone-600">
                {token.lastUsedAt ? formatDate(token.lastUsedAt) : '从未使用'}
              </div>
              <form action={revokeTokenAction}>
                <input name="id" type="hidden" value={token.id} />
                <button
                  className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={Boolean(token.revokedAt)}
                  type="submit"
                >
                  撤销
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

async function createTokenAction(
  _state: CreateTokenState,
  formData: FormData,
): Promise<CreateTokenState> {
  'use server';

  const authState = await getAdminAuthState();
  if (!authState.authorized) {
    return {
      ok: false,
      error: 'unauthorized',
    };
  }

  const name = formData.get('name');
  const parsedScopes = parseAiScopes(formData.getAll('scopes'));
  if (typeof name !== 'string' || name.trim().length === 0 || !parsedScopes.ok) {
    return {
      ok: false,
      error: 'invalid_token_request',
    };
  }

  try {
    const admin = await db.adminUser.upsert({
      where: {
        githubLogin: authState.actor.githubLogin,
      },
      update: {
        email: authState.actor.email,
        displayName: authState.actor.name,
        imageUrl: authState.actor.image,
      },
      create: {
        githubLogin: authState.actor.githubLogin,
        email: authState.actor.email,
        displayName: authState.actor.name,
        imageUrl: authState.actor.image,
      },
    });
    const created = await createAiToken({
      name,
      scopes: parsedScopes.scopes,
      createdByAdminId: admin.id,
    });

    return {
      ok: true,
      token: created.token,
      name: created.record.name,
      scopes: created.record.scopes,
    };
  } catch (error) {
    if (error instanceof AiTokenConfigError) {
      return {
        ok: false,
        error: 'missing_ai_token_pepper',
      };
    }

    if (error instanceof AiTokenInputError) {
      return {
        ok: false,
        error: 'invalid_token_request',
      };
    }

    throw error;
  }
}

async function revokeTokenAction(formData: FormData) {
  'use server';

  const authState = await getAdminAuthState();
  if (!authState.authorized) {
    redirect('/admin/ai-tokens?error=unauthorized');
  }

  const id = formData.get('id');
  if (typeof id !== 'string' || id.trim().length === 0) {
    redirect('/admin/ai-tokens?error=invalid_token_request');
  }

  await revokeAiToken(id);
  redirect('/admin/ai-tokens?revoked=1');
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 16).replace('T', ' ');
}
