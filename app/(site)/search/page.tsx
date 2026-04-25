import Link from 'next/link';
import { searchPublicContent } from '@/lib/search/public-search';

export const metadata = {
  title: 'Search',
  description: 'Search public blog and docs content.',
};

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams;
  const query = q.trim();
  const results = query ? searchPublicContent(query) : [];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14">
      <h1 className="text-4xl font-black tracking-tight text-stone-950">Search</h1>
      <form action="/search" className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search public blog and docs"
          className="min-h-12 flex-1 rounded-2xl border border-stone-900/15 bg-white px-4 text-stone-950 outline-none transition focus:border-teal-700"
        />
        <button
          type="submit"
          className="min-h-12 rounded-2xl bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          Search
        </button>
      </form>

      {query ? (
        <div className="mt-8 grid gap-4">
          {results.map((result) => (
            <Link
              key={result.url}
              href={result.url}
              className="rounded-2xl border border-stone-900/10 bg-white/75 p-5 shadow-sm transition hover:border-teal-700/30 hover:shadow-md"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                {result.contentType}
              </div>
              <h2 className="mt-2 text-xl font-bold text-stone-950">{result.title}</h2>
              {result.description ? (
                <p className="mt-2 text-stone-700">{result.description}</p>
              ) : null}
              {result.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {result.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
          {results.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-900/20 bg-white/60 p-6 text-stone-600">
              No public results found.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-stone-700">
          Search includes public blog posts and docs metadata.
        </p>
      )}
    </main>
  );
}

