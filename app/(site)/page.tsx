import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-16">
      <section className="grid gap-10 rounded-[2rem] border border-stone-900/10 bg-white/70 p-8 shadow-2xl shadow-stone-900/5 backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">
            Markdown-first publishing
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-tight text-stone-950 md:text-7xl">
            Personal notes with a real control plane.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
            AgnetBlog is a Next.js + Fumadocs baseline for publishing local notes as a
            blog and docs site, while leaving room for admin permissions, GitHub sync,
            audit logs, and AI-managed metadata.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/blog"
              className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              View blog
            </Link>
            <Link
              href="/docs"
              className="rounded-full border border-stone-950/15 bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:border-stone-950/40"
            >
              Read docs
            </Link>
            <Link
              href="/search"
              className="rounded-full border border-stone-950/15 bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:border-stone-950/40"
            >
              Search
            </Link>
          </div>
        </div>
        <div className="rounded-[1.5rem] bg-stone-950 p-6 text-stone-100">
          <p className="text-sm font-medium text-teal-200">v1 foundation</p>
          <ul className="mt-6 space-y-4 text-sm leading-6 text-stone-300">
            <li>Next.js App Router as the only runtime.</li>
            <li>Fumadocs MDX for docs and blog content collections.</li>
            <li>PostgreSQL/Prisma, GitHub sync, admin, and AI APIs planned next.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

