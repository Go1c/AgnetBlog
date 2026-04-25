# AgnetBlog

AgnetBlog 是一个 Markdown 优先的个人发布平台。它使用 Next.js App Router、
Fumadocs、Prisma、PostgreSQL、GitHub 同步和带权限范围的 Agent API。

线上地址示例：

```text
https://blog.lumio.games
```

后台入口：

```text
https://blog.lumio.games/admin
```

## 这个项目有什么

- 公开首页、博客列表、文档页和搜索页。
- GitHub OAuth 后台登录。
- 后台内容管理、同步任务、目录规则、AI 令牌和配置说明页。
- GitHub 笔记仓库同步。
- PostgreSQL 保存同步后的标题、正文、标签、可见性、同步任务、AI 令牌 hash 和审计日志。
- Agent API，让外部 Agent 用受控 token 读取内容、触发同步或写回元数据。

## 快速上线顺序

按这个顺序配置，最不容易漏：

1. 在 Zeabur 创建 Web 服务，连接这个 GitHub 代码仓库。
2. 在 Zeabur 同一个项目里创建 PostgreSQL 服务。
3. 在 GitHub 创建 OAuth App。
4. 在 GitHub 创建一个用于同步笔记仓库的 fine-grained token。
5. 在 Zeabur Web 服务里填写环境变量。
6. 在 Zeabur Web 服务 Shell 里运行 `npx prisma db push`。
7. 重新部署 Web 服务。
8. 打开 `/admin`，用 GitHub 登录。
9. 进入 `/admin/setup`，按页面检查配置。
10. 让笔记仓库 push 一次触发 webhook，或调用同步接口跑一次全量同步。
11. 打开 `/blog`，确认看到的是你笔记仓库里 `content/blog` 的公开文章。

## Zeabur 构建命令

Web 服务使用：

```bash
npm install
npm run db:generate
npm run build
npm run start
```

第一次连接数据库后，进入 Zeabur Web 服务 Shell 运行：

```bash
npx prisma db push
```

这个命令会创建 `ContentItem`、`AiToken`、`AuditLog`、`SyncJob` 等表。
以后代码更新新增了数据库字段，也要再跑一次这个命令。

## 中文配置速查：必须配置哪些环境变量

下面这些变量建议全部配置在 Zeabur Web 服务里。变量名必须保持英文。

### 基础站点

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://blog.lumio.games` | 公开站点地址。用于 sitemap、feed 和页面链接。 |
| `NEXTAUTH_URL` | `https://blog.lumio.games` | NextAuth 登录回调地址基准。建议线上必填。 |

### 数据库

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | `${POSTGRES_CONNECTION_STRING}` | PostgreSQL 连接串。没有它，`/admin/content`、`/admin/ai-tokens` 等需要数据库的页面会报错。 |

在 Zeabur 里，如果 PostgreSQL 和 Web 服务在同一个项目，通常可以直接填：

```env
DATABASE_URL=${POSTGRES_CONNECTION_STRING}
```

### 后台登录

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `AUTH_SECRET` | 随机长字符串 | NextAuth 会话签名密钥。生产环境必须配置。 |
| `AUTH_GITHUB_ID` | GitHub OAuth Client ID | GitHub OAuth App 的 Client ID。 |
| `AUTH_GITHUB_SECRET` | GitHub OAuth Client Secret | GitHub OAuth App 的 Client Secret。 |
| `ADMIN_GITHUB_LOGINS` | `Go1c` | 允许进入后台的 GitHub 用户名。多个用户名用逗号分隔。 |

生成 `AUTH_SECRET`：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### GitHub 笔记同步

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `GITHUB_NOTES_OWNER` | `Go1c` | 笔记仓库 owner。仓库 URL 是 `https://github.com/Go1c/notes` 时，这里填 `Go1c`。 |
| `GITHUB_NOTES_REPO` | `notes` | 笔记仓库名。仓库 URL 是 `https://github.com/Go1c/notes` 时，这里填 `notes`。 |
| `GITHUB_NOTES_BRANCH` | `main` | 笔记仓库分支。 |
| `GITHUB_WRITE_TOKEN` | `github_pat_...` | 可读写笔记仓库内容的 GitHub token。同步和后台写回元数据都需要。 |
| `GITHUB_WEBHOOK_SECRET` | 随机长字符串 | GitHub Webhook 签名密钥。 |

生成 `GITHUB_WEBHOOK_SECRET`：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### Agent API

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `AI_TOKEN_PEPPER` | 随机长字符串 | AI 令牌 hash 密钥。不是 OpenAI Key，也不是 URL。 |
| `SYNC_RECONCILE_CRON` | `*/15 * * * *` | 定时全量同步表达式，供 Zeabur 定时任务或外部 cron 使用。 |

生成 `AI_TOKEN_PEPPER`：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## GitHub OAuth 怎么配置

打开 GitHub OAuth Apps：

```text
https://github.com/settings/developers
```

创建 OAuth App，填写：

```text
Application name:
AgnetBlog

Homepage URL:
https://blog.lumio.games

Authorization callback URL:
https://blog.lumio.games/api/auth/callback/github
```

创建后复制：

- Client ID -> `AUTH_GITHUB_ID`
- Client Secret -> `AUTH_GITHUB_SECRET`

如果你换了域名，把上面的 `https://blog.lumio.games` 换成你的真实域名。

## GitHub 写入 Token 怎么配置

`GITHUB_WRITE_TOKEN` 用于读取笔记仓库、同步内容、写回后台修改的 frontmatter。

建议创建 fine-grained personal access token：

1. 打开 `https://github.com/settings/personal-access-tokens/new`。
2. Token name 填 `AgnetBlog sync`。
3. Expiration 按需要选择，例如 90 days。
4. Repository access 选择 `Only select repositories`。
5. 选择你的笔记仓库，不是这个程序代码仓库，除非你把笔记也放在这里。
6. Permissions 里设置：
   - `Contents: Read and write`
   - `Metadata: Read-only`
7. 生成 token 后，复制到 Zeabur：

```env
GITHUB_WRITE_TOKEN=github_pat_xxx
```

## GitHub Webhook 怎么配置

在笔记仓库里打开：

```text
Settings -> Webhooks -> Add webhook
```

填写：

```text
Payload URL:
https://blog.lumio.games/api/webhooks/github

Content type:
application/json

Secret:
填 GITHUB_WEBHOOK_SECRET 的值

Events:
Just the push event
```

配置后，笔记仓库有 push 时，服务器会创建同步任务并尝试同步最新内容。

第一次部署完成后，即使 webhook 已经配置，也要让笔记仓库 push 一次，或调用同步接口跑一次全量同步。
否则数据库里还没有你的笔记，`/blog` 会显示为空。

## 笔记仓库内容怎么放

当前同步设计默认读取 Markdown / MDX 内容。建议笔记仓库使用类似结构：

```text
content/
  blog/
    my-first-post.mdx
  docs/
    platform.mdx
```

文章 frontmatter 示例：

```mdx
---
title: 我的第一篇文章
description: 这是一篇公开文章
summary: 这是一篇公开文章
date: 2026-04-25
updatedAt: 2026-04-25
contentType: blog
visibility: public
published: true
tags:
  - 日记
  - 示例
---

正文内容写在这里。
```

常用字段：

| 字段 | 可选值 | 说明 |
| --- | --- | --- |
| `contentType` | `blog` / `docs` | 内容类型。 |
| `visibility` | `public` / `private` / `unlisted` | 公开、私有、隐藏链接。 |
| `published` | `true` / `false` | 是否发布。 |
| `tags` | 字符串数组 | 标签。 |
| `summary` | 字符串 | 列表和搜索说明。 |

公开博客显示规则：

- 文件必须在笔记仓库的 `content/blog/` 下面。
- `contentType` 必须是 `blog`，或通过目录规则默认为 `blog`。
- `visibility` 必须是 `public` 才会出现在 `/blog` 列表。
- `published` 必须不是 `false`。
- `unlisted` 不会出现在列表里，但知道链接的人可以直接打开。
- `private` 前台不能打开，只能在后台或有权限的 Agent API 里读取。

同步成功后，公开博客从 PostgreSQL 读取你的 GitHub 笔记，不再读取这个程序仓库里的默认示例。

## 后台怎么用

配置完成后打开：

```text
https://blog.lumio.games/admin
```

后台页面：

- `/admin`：运行概览。
- `/admin/setup`：中文配置说明。
- `/admin/content`：查看内容并修改可见性、内容类型。
- `/admin/sync-jobs`：查看同步任务。
- `/admin/directory-policies`：查看目录规则入口。
- `/admin/ai-tokens`：创建和撤销 Agent API token。

## Agent API 怎么用

如果暂时不用 Agent，可以只配置 `AI_TOKEN_PEPPER`，不创建 token。

要使用 Agent API：

1. 进入 `/admin/ai-tokens`。
2. 输入令牌名称。
3. 勾选权限范围。
4. 创建后复制 token。它只显示一次。
5. 调用 `/api/ai/*` 时使用 Bearer token。

示例：

```bash
curl https://blog.lumio.games/api/ai/content \
  -H "Authorization: Bearer agnet_ai_xxx"
```

权限范围：

| Scope | 作用 |
| --- | --- |
| `content:read` | 读取公开内容。 |
| `content:read-private` | 读取私有内容。 |
| `content:write-metadata` | 修改内容元数据并写回 GitHub。 |
| `sync:trigger` | 触发同步。 |
| `audit:read` | 读取审计日志。 |

## 本地开发

安装依赖：

```powershell
npm.cmd install
```

复制 `.env.example` 为 `.env.local`，按需填写变量。

生成 Fumadocs 和 Prisma 输出：

```powershell
npx.cmd fumadocs-mdx
npm.cmd run db:generate
```

启动开发服务器：

```powershell
npm.cmd run dev
```

常用检查：

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

PowerShell 里使用 `npm.cmd`，Zeabur 和 Linux shell 使用普通 `npm`。

## 常见问题

### `/admin` 打不开，提示 server configuration

通常是这些变量缺失或填错：

- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `NEXTAUTH_URL`

还要确认 GitHub OAuth callback URL 是：

```text
https://blog.lumio.games/api/auth/callback/github
```

### 登录后提示没有权限

检查 `ADMIN_GITHUB_LOGINS`。它必须填你的 GitHub 用户名，不是邮箱。

例如：

```env
ADMIN_GITHUB_LOGINS=Go1c
```

### `/admin/content` 或 `/admin/ai-tokens` 打不开

通常是数据库没有配置或没有建表：

```env
DATABASE_URL=${POSTGRES_CONNECTION_STRING}
```

然后在 Zeabur Web 服务 Shell 运行：

```bash
npx prisma db push
```

### 创建 AI 令牌失败

检查：

```env
AI_TOKEN_PEPPER=<随机长字符串>
```

### GitHub 同步失败

检查：

- `GITHUB_NOTES_OWNER`
- `GITHUB_NOTES_REPO`
- `GITHUB_NOTES_BRANCH`
- `GITHUB_WRITE_TOKEN`
- `GITHUB_WEBHOOK_SECRET`

`GITHUB_WRITE_TOKEN` 必须对笔记仓库有 `Contents: Read and write` 权限。

### `/blog` 还是看不到我的笔记

按顺序检查：

1. 线上重新部署后，已经在 Zeabur Web 服务 Shell 运行 `npx prisma db push`。
2. 已经进入后台触发过一次全量同步，或笔记仓库 push 后 webhook 成功触发。
3. `/admin/content` 里能看到你的笔记记录。
4. 文章在笔记仓库的 `content/blog/` 目录下。
5. frontmatter 里是 `contentType: blog`、`visibility: public`、`published: true`。

如果 `/admin/content` 能看到内容但 `/blog` 没有，通常是文章仍是 `private`、`unlisted` 或 `published: false`。

触发同步有两种方式：

- 最简单：改动笔记仓库任意 Markdown 文件并 push，让 GitHub webhook 自动触发。
- 用接口：登录后台后，在同域页面的浏览器控制台执行
  `fetch('/api/admin/sync', { method: 'POST' }).then(r => r.json()).then(console.log)`。

## 重要页面和接口

- `/` 首页
- `/blog` 博客列表
- `/docs` 文档首页
- `/search` 搜索页
- `/admin` 后台概览
- `/admin/setup` 中文配置说明
- `/admin/content` 内容元数据管理
- `/admin/ai-tokens` AI 令牌管理
- `/api/health` 健康检查
- `/api/webhooks/github` GitHub Webhook
- `/api/ai/content` Agent 内容列表
- `/api/ai/search` Agent 搜索
- `/api/ai/sync` Agent 同步触发
- `/api/ai/audit-logs` Agent 审计日志

## 并行开发

并行 Agent 工作请使用项目内 `.worktrees/`，该目录已被 Git 忽略。

示例：

```powershell
git worktree add .worktrees/agent-sync -b agent/sync-pipeline
```

每个 Agent 必须拥有互不重叠的文件范围，并通过 review 合并。

## 部署与运维

- Zeabur 中文部署说明：`devDoc/2026-04-25-zeabur-deploy-runbook.md`
- 测试策略：`devDoc/2026-04-25-testing-strategy.md`
