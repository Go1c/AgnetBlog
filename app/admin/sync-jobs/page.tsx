export const metadata = {
  title: 'Admin Sync Jobs',
};

export default function AdminSyncJobsPage() {
  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-stone-950">Sync jobs</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">
        This page will list GitHub sync runs, webhook deliveries, reconcile jobs,
        status transitions, retry counts, and failure details after the sync
        worker branch merges.
      </p>
    </section>
  );
}
