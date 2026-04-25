# AgnetBlog

AgnetBlog 是一个 Markdown 优先的个人发布平台。它使用 Next.js App Router、
Fumadocs、Prisma、GitHub 同步和带权限范围的 Agent API。

## 技术栈

- Next.js App Router 负责前台页面、后台页面、Webhook 和 API。
- Fumadocs MDX 负责博客和文档内容渲染。
- PostgreSQL 和 Prisma 保存内容索引、同步任务、权限、AI 令牌 hash 和审计日志。
- GitHub 笔记仓库是内容源头。
- 后台使用 GitHub OAuth 登录，并通过白名单控制访问。
- Agent API 使用独立 Bearer token，不复用后台登录会话。

## 本地开发

安装依赖：

```powershell
npm.cmd install
```

复制 `.env.example` 为 `.env.local`，然后填入你要使用的配置。至少 Prisma 命令需要
`DATABASE_URL`。

依赖、schema 或内容变化后，重新生成 Fumadocs 和 Prisma 输出：

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
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

这台 Windows 机器可能会阻止 `npm.ps1`，所以 PowerShell 里统一使用 `npm.cmd`。
Zeabur 和 Linux shell 使用普通 `npm`。

## 重要页面

- `/` 首页
- `/blog` 博客列表
- `/blog/hello-world` 示例博客
- `/docs` 文档首页
- `/admin` 后台概览
- `/admin/content` 内容元数据管理
- `/admin/setup` 中文配置说明
- `/admin/ai-tokens` AI 令牌创建和撤销
- `/api/health` 健康检查
- `/api/search` 公开搜索接口
- `/api/webhooks/github` GitHub Webhook
- `/api/ai/content` Agent 内容列表
- `/api/ai/content/[id]` Agent 内容详情和元数据写回
- `/api/ai/search` Agent 搜索
- `/api/ai/sync` Agent 同步触发
- `/api/ai/sync-jobs` Agent 同步任务列表
- `/api/ai/audit-logs` Agent 审计日志查看

## 中文配置速查

Zeabur Web 服务必须先配置这些变量：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串。Zeabur 可填 `${POSTGRES_CONNECTION_STRING}`。 |
| `AUTH_SECRET` | NextAuth 会话签名密钥。生产环境必须是随机长字符串。 |
| `AUTH_GITHUB_ID` | GitHub OAuth App 的 Client ID。 |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App 的 Client Secret。 |
| `ADMIN_GITHUB_LOGINS` | 允许进入后台的 GitHub 用户名，多个用户名用逗号分隔。 |
| `NEXTAUTH_URL` | 线上地址，例如 `https://blog.lumio.games`。 |
| `NEXT_PUBLIC_SITE_URL` | 公开站点地址，例如 `https://blog.lumio.games`。 |

GitHub 同步需要这些变量：

| 变量 | 说明 |
| --- | --- |
| `GITHUB_NOTES_OWNER` | 笔记仓库 owner，例如 `Go1c`。 |
| `GITHUB_NOTES_REPO` | 笔记仓库名，例如 `notes`。 |
| `GITHUB_NOTES_BRANCH` | 笔记仓库分支，通常是 `main`。 |
| `GITHUB_WRITE_TOKEN` | 可读写笔记仓库内容的 GitHub fine-grained token。 |
| `GITHUB_WEBHOOK_SECRET` | GitHub Webhook 签名密钥。 |

Agent API 建议配置：

| 变量 | 说明 |
| --- | --- |
| `AI_TOKEN_PEPPER` | AI 令牌 hash 密钥。不是 OpenAI Key，也不是 URL。 |
| `SYNC_RECONCILE_CRON` | 定时同步表达式，例如 `*/15 * * * *`。 |

GitHub OAuth App 的回调地址必须是：

```text
https://blog.lumio.games/api/auth/callback/github
```

第一次连接 PostgreSQL 后，需要在 Zeabur Web 服务 Shell 里运行：

```bash
npx prisma db push
```

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
