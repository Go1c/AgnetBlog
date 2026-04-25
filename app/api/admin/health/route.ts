import { withAdminRoute } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export const GET = withAdminRoute((actor) => {
  return Response.json({
    ok: true,
    admin: actor,
  });
});
