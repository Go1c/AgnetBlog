export const metadata = {
  title: 'Admin',
};

export default function AdminPage() {
  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-stone-950">Operational overview</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">
        This protected shell is ready for content status, sync job telemetry,
        directory policy controls, AI token management, and audit data as the
        dependent branches merge.
      </p>
      <dl className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-stone-900/10 p-4">
          <dt className="text-sm font-semibold text-stone-950">Auth mode</dt>
          <dd className="mt-1 text-sm text-stone-600">
            GitHub OAuth with ADMIN_GITHUB_LOGINS allowlist.
          </dd>
        </div>
        <div className="rounded-md border border-stone-900/10 p-4">
          <dt className="text-sm font-semibold text-stone-950">Route protection</dt>
          <dd className="mt-1 text-sm text-stone-600">
            Server-side guard in the admin layout and admin API handlers.
          </dd>
        </div>
      </dl>
    </section>
  );
}

