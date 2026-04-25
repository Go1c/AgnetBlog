import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-16">
      <section className="grid gap-10 rounded-[2rem] border border-stone-900/10 bg-white/70 p-8 shadow-2xl shadow-stone-900/5 backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">
            Markdown 优先发布
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-tight text-stone-950 md:text-7xl">
            个人笔记，也要有真正的后台。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
            AgnetBlog 用 Next.js 和 Fumadocs 发布你的 Markdown 笔记，同时保留后台权限、
            GitHub 同步、审计日志和 Agent 可用的管理接口。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/blog"
              className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              查看博客
            </Link>
            <Link
              href="/docs"
              className="rounded-full border border-stone-950/15 bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:border-stone-950/40"
            >
              阅读文档
            </Link>
            <Link
              href="/search"
              className="rounded-full border border-stone-950/15 bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:border-stone-950/40"
            >
              搜索
            </Link>
          </div>
        </div>
        <div className="rounded-[1.5rem] bg-stone-950 p-6 text-stone-100">
          <p className="text-sm font-medium text-teal-200">当前能力</p>
          <ul className="mt-6 space-y-4 text-sm leading-6 text-stone-300">
            <li>前台、后台和 API 都运行在同一个 Next.js 应用里。</li>
            <li>博客和文档都从 Markdown / MDX 内容生成。</li>
            <li>支持 PostgreSQL、GitHub 同步、后台管理和 Agent API。</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

