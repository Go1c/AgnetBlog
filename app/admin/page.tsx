export const metadata = {
  title: 'Admin',
};

export default function AdminPage() {
  return (
    <section className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
        Control plane
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-950">Admin</h1>
      <p className="mt-4 max-w-2xl text-stone-700">
        Future work will add GitHub OAuth, content status, sync jobs, directory
        policies, AI token management, and audit logs.
      </p>
    </section>
  );
}

