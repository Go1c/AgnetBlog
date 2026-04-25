import { getServerSession } from 'next-auth';

import { authOptions } from '@/auth';

export type AdminActor = {
  githubLogin: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type AdminAuthState =
  | {
      authorized: true;
      actor: AdminActor;
    }
  | {
      authorized: false;
      reason: 'not_authenticated' | 'not_allowlisted';
      githubLogin: string | null;
    };

function getAdminLoginAllowlist(): Set<string> {
  const rawLogins = process.env.ADMIN_GITHUB_LOGINS ?? '';
  const normalizedLogins = rawLogins
    .split(/[\s,]+/)
    .map((login) => login.trim().toLowerCase())
    .filter(Boolean);

  return new Set(normalizedLogins);
}

export async function getAdminAuthState(): Promise<AdminAuthState> {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const githubLogin = user?.login ?? null;

  if (!githubLogin || !user) {
    return {
      authorized: false,
      reason: 'not_authenticated',
      githubLogin: null,
    };
  }

  const allowlist = getAdminLoginAllowlist();

  if (!allowlist.has(githubLogin.toLowerCase())) {
    return {
      authorized: false,
      reason: 'not_allowlisted',
      githubLogin,
    };
  }

  return {
    authorized: true,
    actor: {
      githubLogin,
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
    },
  };
}
