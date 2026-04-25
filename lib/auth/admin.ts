import { getServerSession } from 'next-auth';

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

export function getAdminLoginAllowlist(): Set<string> {
  const rawLogins = process.env.ADMIN_GITHUB_LOGINS ?? '';
  const normalizedLogins = rawLogins
    .split(/[\s,]+/)
    .map((login) => login.trim().toLowerCase())
    .filter(Boolean);

  return new Set(normalizedLogins);
}

export function isAdminGitHubLoginAllowed(githubLogin: string | null): boolean {
  if (!githubLogin) {
    return false;
  }

  return getAdminLoginAllowlist().has(githubLogin.toLowerCase());
}

export async function getAdminAuthState(): Promise<AdminAuthState> {
  const { authOptions } = await import('@/auth');
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

  if (!isAdminGitHubLoginAllowed(githubLogin)) {
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

export async function requireAdmin(): Promise<AdminAuthState> {
  return getAdminAuthState();
}

export function adminUnauthorizedResponse(authState: Exclude<AdminAuthState, { authorized: true }>) {
  return Response.json(
    {
      ok: false,
      error: authState.reason,
    },
    {
      status: authState.reason === 'not_authenticated' ? 401 : 403,
    },
  );
}

export function withAdminRoute(
  handler: (actor: AdminActor, request: Request) => Response | Promise<Response>,
) {
  return async function adminRouteHandler(request: Request) {
    const authState = await requireAdmin();

    if (!authState.authorized) {
      return adminUnauthorizedResponse(authState);
    }

    return handler(authState.actor, request);
  };
}
