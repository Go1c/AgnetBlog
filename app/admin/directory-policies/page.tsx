export const metadata = {
  title: '后台目录规则',
};

export default function AdminDirectoryPoliciesPage() {
  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-stone-950">目录规则</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">
        这里用于管理仓库目录默认规则，包括默认可见性、内容类型归类、
        是否参与发布和是否参与搜索。
      </p>
    </section>
  );
}
