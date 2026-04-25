export const metadata = {
  title: 'Admin Directory Policies',
};

export default function AdminDirectoryPoliciesPage() {
  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-stone-950">Directory policies</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">
        This page will manage repository directory rules, default visibility,
        content type routing, and publish eligibility once the policy storage
        branch is available.
      </p>
    </section>
  );
}
