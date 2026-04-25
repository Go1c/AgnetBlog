# Next.js + Fumadocs Framework Decision

## 结论

本项目采用 **Next.js App Router + Fumadocs** 作为基础框架。

Next.js 负责全栈运行时：公开页面、管理后台、GitHub Webhook、AI API、权限校验、数据库访问和部署入口。Fumadocs 负责内容层和文档体验：Markdown/MDX 解析、文档路由、侧边栏、目录、搜索 UI 和文档布局。

这个组合比纯 Starlight、纯文档框架或纯静态站更适合当前目标，因为项目不是单一博客或文档站，而是一个带后台、权限、同步任务和 AI 管理接口的内容发布平台。

## 适用目标

该框架服务以下目标：

- 发布本地 Markdown/MDX 笔记到公开网站。
- 同时支持 `blog` 和 `docs` 两类内容。
- 支持 `public`、`private`、`unlisted` 三种可见性。
- 通过 GitHub Webhook 和计划任务同步内容。
- 用 PostgreSQL 保存派生索引、权限、导航、搜索、同步任务和审计日志。
- 提供后台管理界面，管理内容状态、目录默认策略、同步任务和 AI token。
- 提供 AI API，允许受控读取和修改发布元数据。

## 框架分工

### Next.js

Next.js 是唯一 Web Runtime，承担产品外壳和服务端能力：

- `app` 目录承载页面、布局和 Route Handlers。
- React Server Components 用于内容页、列表页和后台数据读取。
- Route Handlers 用于 `/api/webhooks/*`、`/api/admin/*` 和 `/api/ai/*`。
- Server Actions 可用于后台表单提交，但 v1 优先使用显式 API，降低调试成本。
- Middleware 或服务端 guard 统一处理后台鉴权和可见性过滤。
- 与 Prisma、PostgreSQL、Auth.js、GitHub API 集成。

### Fumadocs

Fumadocs 作为内容和文档层，不作为整个产品框架：

- 使用 `fumadocs-mdx` 定义 `docs` 和 `blog` 内容集合。
- 使用 `fumadocs-ui` 提供文档布局、侧边栏、TOC、搜索弹窗和文档主题基础。
- Docs 区优先使用 Fumadocs 的页面树和布局。
- Blog 区复用 Fumadocs MDX 的内容处理能力，但页面设计由项目自定义。
- 搜索 v1 可以先用 PostgreSQL 全文搜索作为统一搜索；文档区也可接入 Fumadocs 的 Orama 搜索组件。若两套搜索体验冲突，以统一搜索页为准。

## 推荐目录结构

```txt
F:/AI/AgnetBlog
├─ app/
│  ├─ (site)/
│  │  ├─ page.tsx
│  │  ├─ blog/
│  │  │  ├─ page.tsx
│  │  │  └─ [...slug]/page.tsx
│  │  ├─ docs/
│  │  │  ├─ [[...slug]]/page.tsx
│  │  │  └─ layout.tsx
│  │  └─ search/page.tsx
│  ├─ admin/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ content/page.tsx
│  │  ├─ sync-jobs/page.tsx
│  │  ├─ directory-policies/page.tsx
│  │  └─ ai-tokens/page.tsx
│  ├─ api/
│  │  ├─ webhooks/github/route.ts
│  │  ├─ admin/
│  │  ├─ ai/
│  │  └─ health/route.ts
│  ├─ layout.tsx
│  └─ globals.css
├─ content/
│  ├─ blog/
│  └─ docs/
├─ lib/
│  ├─ auth/
│  ├─ content/
│  ├─ github/
│  ├─ permissions/
│  ├─ search/
│  ├─ sync/
│  └─ db.ts
├─ prisma/
│  └─ schema.prisma
├─ source.config.ts
├─ next.config.mjs
├─ package.json
└─ devDoc/
```

说明：

- `content/` 是构建和本地开发时的内容目录。v1 可以先把 GitHub notes repo 同步到这里，后续再优化为临时工作目录或直接按 GitHub snapshot 解析。
- `source.config.ts` 定义 Fumadocs 的 `docs` 集合和自定义 `blog` 集合。
- `lib/content/` 负责把 Markdown frontmatter、目录默认策略和数据库派生索引连接起来。
- `app/(site)/docs` 复用 Fumadocs UI；`app/(site)/blog` 自建视觉和列表体验。

## 路由设计

### 公开站点

| 路由 | 责任 |
| --- | --- |
| `/` | 首页，展示个人介绍、精选文章、最近内容和入口 |
| `/blog` | 博客列表，支持分页、标签和时间排序 |
| `/blog/[...slug]` | 博客详情页 |
| `/docs` | 文档首页 |
| `/docs/[...slug]` | 文档详情页，使用 Fumadocs 文档布局 |
| `/search` | 全站搜索，只展示 public 内容 |

### 后台

| 路由 | 责任 |
| --- | --- |
| `/admin` | 后台概览 |
| `/admin/content` | 内容列表、状态检查、可见性管理 |
| `/admin/sync-jobs` | 同步任务、日志和手动重试 |
| `/admin/directory-policies` | 目录默认策略 |
| `/admin/ai-tokens` | AI token 发行、撤销和 scope 管理 |

### API

| 路由 | 责任 |
| --- | --- |
| `/api/health` | 健康检查 |
| `/api/webhooks/github` | GitHub push webhook |
| `/api/admin/*` | 后台管理 API |
| `/api/ai/*` | AI 受控 API |
| `/api/search` | 可选：统一搜索 API |

## 内容模型

Markdown/MDX frontmatter 继续使用原计划中的发布字段：

```yaml
title: string
date: YYYY-MM-DD
updatedAt: YYYY-MM-DD
summary: string
tags:
  - string
contentType: blog | docs
visibility: private | public | unlisted
slug: string
docSection: string
cover: string
published: boolean
```

处理规则：

- 文件 frontmatter 是文件级事实来源。
- 目录策略只提供默认值。
- 文件 frontmatter 覆盖目录策略。
- 数据库只保存派生索引，不成为隐藏的发布状态来源。
- 后台或 AI 修改元数据时，必须写回 Markdown/MDX 文件，再触发重新索引。

## 可见性规则

| Visibility | 直接访问 | 列表页 | 搜索 | Sitemap/RSS | 后台 |
| --- | --- | --- | --- | --- | --- |
| `public` | 允许 | 展示 | 展示 | 展示 | 展示 |
| `unlisted` | 允许 | 不展示 | 不展示 | 不展示 | 展示 |
| `private` | 禁止 | 不展示 | 不展示 | 不展示 | 展示 |

所有公开查询必须经过统一 guard。不要在页面、API 和搜索中分散写过滤条件。

## 数据库职责

PostgreSQL 只保存运行时索引和管理数据：

- `ContentItem`：内容路径、slug、类型、可见性、标题、摘要、标签、日期、渲染状态、repo SHA。
- `DirectoryPolicy`：目录前缀、默认内容类型、默认可见性、是否进入列表和搜索。
- `SyncJob`：触发来源、commit 范围、状态、开始结束时间、错误摘要。
- `DocsNavNode`：文档导航覆盖配置。
- `AiToken`：token hash、scope、创建者、撤销状态、最近使用时间。
- `AuditLog`：actor、动作、目标、diff 摘要和时间。

## 同步流程

```txt
GitHub push
  ↓
/api/webhooks/github
  ↓
验证签名和分支
  ↓
创建 SyncJob
  ↓
拉取变更文件或仓库快照
  ↓
解析 Markdown/MDX + frontmatter
  ↓
应用目录默认策略
  ↓
更新 ContentItem / 搜索索引 / DocsNav
  ↓
记录成功、失败和审计信息
```

计划任务每 15 分钟执行一次 reconciliation，用来修复漏掉的 webhook、删除文件和索引不一致。

## 搜索策略

v1 推荐使用 PostgreSQL 全文搜索作为统一搜索来源：

- 搜索范围只包含 `public` 内容。
- 搜索字段包括标题、摘要、标签和正文纯文本。
- 结果显示内容类型、标签、摘要和更新时间。
- `unlisted` 和 `private` 不进入公开搜索索引。

Fumadocs 自带搜索可以保留在文档区，但不要让它绕过统一可见性规则。若短期内无法安全过滤 Fumadocs 搜索索引，则先关闭 Fumadocs 内置搜索，使用 `/search` 作为唯一入口。

## 后台与权限

后台使用 GitHub OAuth 登录，v1 只保留单一 `admin` 角色。

权限策略：

- `/admin` 和 `/api/admin/*` 必须验证 GitHub 身份和 allowlist。
- `/api/ai/*` 使用独立 AI token，不复用管理员 session。
- AI token 必须有 scope，例如 `content:read`、`content:write-metadata`、`sync:trigger`、`audit:read`。
- AI 默认不能读取 `private` 内容，除非 token 明确授权。
- 所有写操作必须进入审计日志。

## 技术栈基线

| 层级 | 选择 |
| --- | --- |
| Web Runtime | Next.js App Router |
| UI | React + Tailwind CSS |
| Docs UI | Fumadocs UI |
| Content Pipeline | Fumadocs MDX + 自定义 ingest service |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Auth.js + GitHub OAuth |
| Search | PostgreSQL full-text search，Fumadocs search 视可见性安全性接入 |
| Hosting | Zeabur |
| Source of Truth | GitHub notes repo |

## v1 实施顺序

1. 初始化 Next.js、TypeScript、Tailwind CSS、Fumadocs、Prisma 和基础目录。
2. 配置 `source.config.ts`，定义 `docs` 和 `blog` 内容集合。
3. 建立 Prisma schema：内容、目录策略、同步任务、AI token 和审计日志。
4. 实现 Markdown/MDX ingest pipeline，把内容解析为数据库派生索引。
5. 实现公开博客和文档页面，先只展示 `public` 内容。
6. 实现 GitHub webhook 和计划同步任务。
7. 实现后台登录、内容列表和同步任务查看。
8. 实现目录策略、元数据写回 GitHub 和审计日志。
9. 实现统一搜索。
10. 实现 AI token 和 AI API。
11. 完成 Zeabur 部署配置、环境变量文档和故障排查文档。

## 需要延后的能力

以下能力不进入 v1，避免框架搭建阶段过重：

- 多管理员角色和细粒度人类 RBAC。
- 多租户或多站点。
- 独立搜索引擎，例如 Meilisearch、Algolia 或 Typesense。
- 在线正文编辑器。
- 评论系统。
- 复杂版本历史 UI。
- 图片 CDN 和资产处理流水线。

## 风险与约束

- Fumadocs 更偏文档体验，博客页需要自定义设计，不要强行套文档布局。
- Fumadocs 搜索索引必须确认能过滤 `private` 和 `unlisted`，否则禁用内置搜索。
- 数据库不能成为发布状态的隐藏来源，否则会破坏 Git-first 模型。
- GitHub 写回需要处理冲突、分支保护、commit 身份和失败重试。
- Zeabur 上的计划任务和 Web Runtime 需要明确运行方式，避免同步任务阻塞页面请求。
- 如果内容量变大，构建期 MDX 扫描和运行时数据库索引要分层优化。

## 官方参考

- Next.js App Router: https://nextjs.org/docs/app
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware
- Next.js MDX: https://nextjs.org/docs/app/guides/mdx
- Fumadocs Next.js installation: https://www.fumadocs.dev/docs/manual-installation/next
- Fumadocs MDX: https://www.fumadocs.dev/docs/mdx
- Fumadocs collections: https://www.fumadocs.dev/docs/mdx/collections
- Fumadocs search: https://www.fumadocs.dev/docs/search
