export const metadata = {
  title: 'Admin AI Tokens',
};

export default function AdminAiTokensPage() {
  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-stone-950">AI tokens</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">
        This page will show token issuance, revocation, last-used timestamps, and
        policy scopes after the AI API and token persistence branches merge.
      </p>
    </section>
  );
}
