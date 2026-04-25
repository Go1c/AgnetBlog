import { getAdminAuthState } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authState = await getAdminAuthState();

  if (!authState.authorized) {
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

  return Response.json({
    ok: true,
    admin: authState.actor,
  });
}
