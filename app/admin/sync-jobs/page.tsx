export const metadata = {
  title: '后台同步任务',
};

export default function AdminSyncJobsPage() {
  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-stone-950">同步任务</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">
        这里会展示 GitHub 同步记录、Webhook 触发记录、全量校准任务、
        状态变化、重试次数和失败原因。
      </p>
    </section>
  );
}
