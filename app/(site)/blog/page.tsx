import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Code2,
  Cpu,
  Eye,
  FileText,
  FolderOpen,
  Home,
  Layers3,
  Mail,
  MessageCircle,
  Rss,
  Search,
  Server,
  Sparkles,
  Star,
  Tag,
  UserRound,
  Zap,
} from 'lucide-react';
import { formatFrontmatterDate } from '@/lib/content/visibility';
import {
  runtimeContentDate,
  runtimeContentDescription,
  runtimeContentUrl,
} from '@/lib/content/runtime-content';
import { listPublicContentItems } from '@/lib/db/content-repository';
import { ContentType } from '@/lib/generated/prisma/client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'CodeNote 技术博客',
  description: '记录技术、思考世界的个人技术博客。',
};

type BlogArticle = {
  title: string;
  description: string;
  href: string;
  category: string;
  tags: string[];
  date: string;
  readTime: string;
  views: string;
  comments: string;
  gradient: string;
  icon: LucideIcon;
};

type BlogPost = Awaited<ReturnType<typeof listPublicContentItems>>[number];

const navItems = [
  { label: '首页', href: '/blog', icon: Home },
  { label: '文章', href: '#articles', icon: FileText },
  { label: '分类', href: '#categories', icon: FolderOpen },
  { label: '标签', href: '#tags', icon: Tag },
  { label: '归档', href: '#archive', icon: Archive },
  { label: '关于', href: '#about', icon: UserRound },
];

const fallbackArticles: BlogArticle[] = [
  {
    title: '构建高性能 React 应用的实践指南',
    description:
      '从渲染策略、状态拆分到缓存边界，梳理大型前端应用在真实业务里的性能优化方法。',
    href: '#articles',
    category: '前端开发',
    tags: ['React', '性能优化'],
    date: '2026.04.20',
    readTime: '12 分钟',
    views: '8.4k',
    comments: '32',
    gradient: 'from-[#667eea] to-[#764ba2]',
    icon: Code2,
  },
  {
    title: 'Next.js 16 中的 Server Components 工作流',
    description: '围绕数据获取、缓存失效和组件边界，整理一套可维护的全栈页面组织方式。',
    href: '#articles',
    category: '前端',
    tags: ['Next.js', 'RSC'],
    date: '2026.04.18',
    readTime: '9 分钟',
    views: '6.1k',
    comments: '18',
    gradient: 'from-[#4facfe] to-[#00f2fe]',
    icon: Layers3,
  },
  {
    title: '服务端架构里的任务队列设计',
    description: '从幂等、重试、死信队列到观测指标，拆解后台异步任务系统的稳定性设计。',
    href: '#articles',
    category: '后端',
    tags: ['架构', '队列'],
    date: '2026.04.15',
    readTime: '11 分钟',
    views: '5.8k',
    comments: '24',
    gradient: 'from-[#f093fb] to-[#f5576c]',
    icon: Server,
  },
  {
    title: '用 TypeScript 打造可靠的领域模型',
    description: '通过类型收窄、不可变数据和边界校验，把业务规则沉淀成可测试的代码结构。',
    href: '#articles',
    category: '编程语言',
    tags: ['TypeScript', '建模'],
    date: '2026.04.10',
    readTime: '8 分钟',
    views: '4.7k',
    comments: '16',
    gradient: 'from-[#fa709a] to-[#fee140]',
    icon: Cpu,
  },
  {
    title: '开发者工具链的自动化清单',
    description: '把 lint、typecheck、预览和发布检查串起来，让每次提交都有稳定的质量反馈。',
    href: '#articles',
    category: '工具',
    tags: ['DevOps', '效率'],
    date: '2026.04.06',
    readTime: '7 分钟',
    views: '3.9k',
    comments: '11',
    gradient: 'from-[#667eea] to-[#4facfe]',
    icon: Zap,
  },
];

const categories = [
  { name: '前端开发', count: 15, color: 'bg-[#667eea]' },
  { name: '后端架构', count: 12, color: 'bg-[#f5576c]' },
  { name: '编程语言', count: 8, color: 'bg-[#00c2ff]' },
  { name: 'DevOps', count: 5, color: 'bg-[#f6b73c]' },
];

const tags = ['React', 'Next.js', 'TypeScript', 'Node.js', '架构', '性能优化', 'CSS', 'Docker'];

const projects = [
  { name: 'mdx-publisher', stars: '1.8k', description: 'Markdown 内容发布流水线' },
  { name: 'react-lab', stars: '940', description: '前端实验组件集合' },
  { name: 'ops-notes', stars: '520', description: '工程化实践笔记' },
];

export default async function BlogIndexPage() {
  const posts = await safeListPublicBlogPosts();
  const runtimeArticles = posts.map((post, index): BlogArticle => {
    const fallback = fallbackArticles[index % fallbackArticles.length];

    return {
      title: post.title,
      description: runtimeContentDescription(post),
      href: runtimeContentUrl(post),
      category: post.tags[0] ?? fallback.category,
      tags: post.tags.length > 0 ? post.tags.slice(0, 2) : fallback.tags,
      date: formatFrontmatterDate(runtimeContentDate(post)),
      readTime: `${Math.max(4, Math.ceil((post.body?.length ?? 800) / 420))} 分钟`,
      views: fallback.views,
      comments: fallback.comments,
      gradient: fallback.gradient,
      icon: fallback.icon,
    };
  });
  const articles =
    runtimeArticles.length > 0
      ? [...runtimeArticles, ...fallbackArticles].slice(0, fallbackArticles.length)
      : fallbackArticles;
  const [featuredArticle, ...noteArticles] = articles;

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1a1a2e] [font-family:Inter,'Noto_Sans_SC',system-ui,sans-serif]">
      <Sidebar />
      <div className="lg:ml-[220px]">
        <TopBar />
        <section className="mx-auto flex min-h-[670px] w-full max-w-[881px] flex-col justify-center px-6 py-16 sm:px-10 lg:px-14">
          <div className="max-w-[680px]">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#eef0f2] bg-white px-4 py-2 text-xs font-semibold text-[#667eea] shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden />
              已更新 42 篇文章 · 持续输出中
            </p>
            <h1 className="mt-8 max-w-[650px] text-5xl font-black leading-[1.1] text-[#1a1a2e] sm:text-6xl lg:text-[64px]">
              记录技术，思考世界。
            </h1>
            <p className="mt-7 max-w-[580px] text-base leading-8 text-[#6b7280] sm:text-lg">
              分享前端开发、后端架构与性能优化实践，把项目里的思考、踩坑和复盘整理成可长期参考的技术笔记。
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="#articles"
                className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#667eea] to-[#764ba2] px-6 text-sm font-bold text-white shadow-lg shadow-[#667eea]/25 transition hover:-translate-y-0.5"
              >
                开始阅读
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="#about"
                className="inline-flex h-12 items-center rounded-[10px] border border-[#eef0f2] bg-white px-6 text-sm font-bold text-[#1a1a2e] shadow-sm transition hover:border-[#667eea]/40"
              >
                关于我
              </Link>
            </div>
          </div>

          <dl className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['42', '技术文章'],
              ['52k+', '总阅读量'],
              ['15', '开源项目'],
              ['3.2k', 'GitHub Stars'],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-[14px] border border-[#eef0f2] bg-white/85 p-5 shadow-sm"
              >
                <dt className="text-3xl font-black text-[#1a1a2e]">{value}</dt>
                <dd className="mt-1 text-xs font-semibold text-[#9ca3af]">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto w-full max-w-[881px] px-6 pb-16 sm:px-10 lg:px-14">
          <SectionHeader eyebrow="Editor Pick" title="本周编辑推荐" action="查看全部" />
          <FeaturedArticle article={featuredArticle} />
        </section>

        <section
          id="articles"
          className="mx-auto grid w-full max-w-[881px] gap-8 px-6 pb-16 sm:px-10 lg:grid-cols-[minmax(0,489px)_280px] lg:px-14"
        >
          <div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <SectionTitle eyebrow="Notes" title="技术笔记" />
              <div className="flex rounded-[10px] border border-[#eef0f2] bg-white p-1 text-xs font-bold text-[#6b7280] shadow-sm">
                {['全部', '前端', '后端', '工具'].map((item, index) => (
                  <button
                    key={item}
                    className={`h-8 rounded-[8px] px-3 ${
                      index === 0
                        ? 'bg-[#1a1a2e] text-white'
                        : 'text-[#6b7280] transition hover:text-[#1a1a2e]'
                    }`}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 grid gap-5">
              {noteArticles.map((article) => (
                <ArticleCard key={article.title} article={article} />
              ))}
            </div>

            <Link
              href="#archive"
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#eef0f2] bg-white px-5 text-sm font-bold text-[#667eea] shadow-sm transition hover:border-[#667eea]/40"
            >
              加载更多
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <RightRail articles={articles} />
        </section>

        <footer className="mx-auto flex min-h-[83px] w-full max-w-[881px] flex-col justify-center border-t border-[#eef0f2] px-6 py-6 text-sm text-[#9ca3af] sm:px-10 lg:px-14">
          <p>© 2026 CodeNote · 用心记录技术成长</p>
          <p className="mt-1 text-xs">Built with ♥ by 张小码</p>
        </footer>
      </div>
    </main>
  );
}

async function safeListPublicBlogPosts(): Promise<BlogPost[]> {
  try {
    return await listPublicContentItems(ContentType.BLOG);
  } catch {
    return [];
  }
}

function Sidebar() {
  return (
    <aside className="border-b border-[#eef0f2] bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-[220px] lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col px-5 py-6">
        <Link href="/blog" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-gradient-to-br from-[#667eea] to-[#764ba2] text-sm font-black text-white">
            C
          </span>
          <span>
            <span className="block text-lg font-black text-[#1a1a2e]">CodeNote</span>
            <span className="block text-xs font-semibold text-[#9ca3af]">Tech Blog</span>
          </span>
        </Link>

        <nav className="mt-8 grid gap-1 sm:grid-cols-3 lg:grid-cols-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex h-10 items-center gap-3 rounded-[8px] px-3 text-sm font-bold transition ${
                  index === 0
                    ? 'bg-[#f5f5f7] text-[#667eea]'
                    : 'text-[#6b7280] hover:bg-[#f5f5f7] hover:text-[#1a1a2e]'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div id="categories" className="mt-8 hidden lg:block">
          <p className="text-xs font-black uppercase text-[#9ca3af]">Categories</p>
          <div className="mt-4 grid gap-3">
            {categories.map((category) => (
              <div key={category.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-[#6b7280]">
                  <span className={`h-2 w-2 rounded-full ${category.color}`} />
                  {category.name}
                </span>
                <span className="text-xs font-bold text-[#9ca3af]">{category.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div id="about" className="mt-8 rounded-[14px] border border-[#eef0f2] bg-[#f5f5f7] p-4 lg:mt-auto">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#f093fb] to-[#f5576c] text-sm font-black text-white">
              张
            </div>
            <div>
              <p className="text-sm font-black text-[#1a1a2e]">张小码</p>
              <p className="text-xs font-semibold text-[#9ca3af]">全栈工程师</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {[Code2, Rss, Mail].map((Icon) => (
              <Link
                key={Icon.displayName}
                href="#about"
                className="grid h-8 w-8 place-items-center rounded-[8px] bg-white text-[#6b7280] transition hover:text-[#667eea]"
                aria-label="社交链接"
              >
                <Icon className="h-4 w-4" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#eef0f2] bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] w-full max-w-[881px] items-center justify-between gap-4 px-6 sm:px-10 lg:px-14">
        <div className="relative hidden flex-1 sm:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            className="h-11 w-full max-w-[360px] rounded-[10px] border border-[#eef0f2] bg-[#f5f5f7] pl-11 pr-4 text-sm font-semibold text-[#1a1a2e] outline-none transition placeholder:text-[#9ca3af] focus:border-[#667eea]/50 focus:bg-white"
            placeholder="搜索文章、标签或项目"
            type="search"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#6b7280]">
          <span className="hidden sm:inline">Follow</span>
          {[Code2, Rss].map((Icon) => (
            <Link
              key={Icon.displayName}
              href="#about"
              className="grid h-9 w-9 place-items-center rounded-[8px] border border-[#eef0f2] bg-white text-[#6b7280] transition hover:text-[#667eea]"
              aria-label="关注 CodeNote"
            >
              <Icon className="h-4 w-4" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action: string;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <SectionTitle eyebrow={eyebrow} title={title} />
      <Link href="#articles" className="text-sm font-bold text-[#667eea]">
        {action}
      </Link>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-[#9ca3af]">{eyebrow}</p>
      <h2 className="mt-1 text-[28px] font-black leading-[1.5] text-[#1a1a2e]">{title}</h2>
    </div>
  );
}

function FeaturedArticle({ article }: { article: BlogArticle }) {
  return (
    <Link
      href={article.href}
      className="group grid overflow-hidden rounded-[20px] border border-[#eef0f2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#1a1a2e]/10 lg:grid-cols-[1fr_0.9fr]"
    >
      <ArticleVisual article={article} large />
      <div className="flex min-h-[360px] flex-col justify-center p-8 sm:p-10">
        <span className="inline-flex w-fit rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-black text-[#667eea]">
          {article.category}
        </span>
        <h3 className="mt-5 text-[26px] font-black leading-[1.25] text-[#1a1a2e]">
          {article.title}
        </h3>
        <p className="mt-4 text-sm leading-7 text-[#6b7280]">{article.description}</p>
        <MetaRow article={article} className="mt-6" />
        <span className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#667eea]">
          阅读全文
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function ArticleCard({ article }: { article: BlogArticle }) {
  return (
    <Link
      href={article.href}
      className="group grid gap-4 rounded-[16px] border border-[#eef0f2] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1a1a2e]/10 sm:grid-cols-[150px_1fr]"
    >
      <ArticleVisual article={article} />
      <div className="min-w-0 py-1">
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[11px] font-black text-[#667eea]"
            >
              {tag}
            </span>
          ))}
        </div>
        <h3 className="mt-3 text-lg font-black leading-[1.38] text-[#1a1a2e]">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6b7280]">
          {article.description}
        </p>
        <MetaRow article={article} className="mt-4" compact />
      </div>
    </Link>
  );
}

function ArticleVisual({ article, large = false }: { article: BlogArticle; large?: boolean }) {
  const Icon = article.icon;

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${article.gradient} ${
        large ? 'min-h-[320px]' : 'min-h-[150px] rounded-[12px]'
      }`}
    >
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(135deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="absolute left-6 top-6 grid h-12 w-12 place-items-center rounded-[14px] bg-white/20 text-white backdrop-blur">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="absolute bottom-6 left-6 right-6 rounded-[14px] bg-white/18 p-4 backdrop-blur">
        <div className="mb-3 flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/55" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
        </div>
        <div className="space-y-2">
          <span className="block h-2 rounded-full bg-white/80" />
          <span className="block h-2 w-4/5 rounded-full bg-white/55" />
          <span className="block h-2 w-2/3 rounded-full bg-white/35" />
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  article,
  className = '',
  compact = false,
}: {
  article: BlogArticle;
  className?: string;
  compact?: boolean;
}) {
  const items = [
    { icon: CalendarDays, label: article.date },
    { icon: Clock3, label: article.readTime },
    { icon: Eye, label: article.views },
    { icon: MessageCircle, label: article.comments },
  ];

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#9ca3af] ${className}`}
    >
      {items.slice(0, compact ? 3 : items.length).map((item) => {
        const Icon = item.icon;
        return (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

function RightRail({ articles }: { articles: BlogArticle[] }) {
  return (
    <aside className="grid content-start gap-5">
      <section className="rounded-[16px] border border-[#eef0f2] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white">
            <Mail className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-black text-[#1a1a2e]">订阅更新</h3>
            <p className="text-xs font-semibold text-[#9ca3af]">每周技术笔记直达邮箱</p>
          </div>
        </div>
        <form className="mt-5 grid gap-3">
          <input
            className="h-11 rounded-[10px] border border-[#eef0f2] bg-[#f5f5f7] px-4 text-sm font-semibold outline-none placeholder:text-[#9ca3af] focus:border-[#667eea]/50 focus:bg-white"
            placeholder="your@email.com"
            type="email"
          />
          <button
            className="h-11 rounded-[10px] bg-[#1a1a2e] text-sm font-black text-white transition hover:bg-[#2c2c44]"
            type="button"
          >
            立即订阅
          </button>
        </form>
      </section>

      <section className="rounded-[16px] border border-[#eef0f2] bg-white p-5 shadow-sm">
        <h3 className="text-base font-black text-[#1a1a2e]">热门文章</h3>
        <div className="mt-4 grid gap-4">
          {articles.slice(0, 4).map((article, index) => (
            <Link key={article.title} href={article.href} className="flex gap-3">
              <span className="text-sm font-black text-[#667eea]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>
                <span className="block text-sm font-bold leading-5 text-[#1a1a2e]">
                  {article.title}
                </span>
                <span className="mt-1 block text-xs font-semibold text-[#9ca3af]">
                  {article.views} 阅读
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="tags" className="rounded-[16px] border border-[#eef0f2] bg-white p-5 shadow-sm">
        <h3 className="text-base font-black text-[#1a1a2e]">标签云</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag}
              href="#tags"
              className="rounded-full border border-[#eef0f2] bg-[#f5f5f7] px-3 py-1.5 text-xs font-bold text-[#6b7280] transition hover:border-[#667eea]/40 hover:text-[#667eea]"
            >
              #{tag}
            </Link>
          ))}
        </div>
      </section>

      <section id="archive" className="rounded-[16px] border border-[#eef0f2] bg-white p-5 shadow-sm">
        <h3 className="text-base font-black text-[#1a1a2e]">开源项目</h3>
        <div className="mt-4 grid gap-3">
          {projects.map((project) => (
            <Link
              key={project.name}
              href="#archive"
              className="rounded-[12px] border border-[#eef0f2] bg-[#f5f5f7] p-4 transition hover:border-[#667eea]/40"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-black text-[#1a1a2e]">
                  {project.name}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9ca3af]">
                  <Star className="h-3.5 w-3.5 fill-[#f6b73c] text-[#f6b73c]" aria-hidden />
                  {project.stars}
                </span>
              </span>
              <span className="mt-2 block text-xs font-semibold text-[#6b7280]">
                {project.description}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[16px] border border-[#eef0f2] bg-gradient-to-br from-[#667eea] to-[#764ba2] p-5 text-white shadow-sm">
        <BookOpen className="h-7 w-7" aria-hidden />
        <h3 className="mt-4 text-base font-black">持续整理技术体系</h3>
        <p className="mt-2 text-sm leading-6 text-white/75">
          从项目实践中提炼可复用的方法，形成长期更新的工程笔记。
        </p>
      </section>
    </aside>
  );
}
