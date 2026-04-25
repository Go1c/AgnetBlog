export const metadata = {
  title: 'Search',
  description: 'Search public blog and docs content.',
};

export default function SearchPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14">
      <h1 className="text-4xl font-black tracking-tight text-stone-950">Search</h1>
      <p className="mt-4 text-stone-700">
        Unified PostgreSQL-backed search will be implemented after the content ingest
        pipeline. Fumadocs document search is available through the docs command menu
        for the initial scaffold.
      </p>
    </main>
  );
}

