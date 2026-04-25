# Zeabur 中文部署说明

这份说明覆盖当前 Next.js、Prisma、GitHub 同步、后台和 Agent API 的部署配置。

## 服务

在 Zeabur 项目里创建两个服务：

- Node.js Web 服务：运行 Next.js 应用。
- PostgreSQL 服务：保存内容索引、同步任务、AI 令牌和审计日志。

Node.js 使用 20 或更新版本。应用的运行时配置全部来自环境变量。

## 构建和启动

Zeabur Web 服务使用这些命令：

```bash
npm install
npm run db:generate
npm run build
npm run start
```

`npm run start` 会先执行 `prisma db push`，再执行 `next start`。

第一次上线前，以及 Prisma schema 变化后，需要运行一次：

```bash
npx prisma db push
```

当前仓库还没有 Prisma migration 文件，部署时以 `prisma/schema.prisma` 为准。

## 环境变量

在 Zeabur Web 服务里配置这些变量：

| 变量 | 作用 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 公开站点地址，例如 `https://blog.lumio.games`。 |
| `NEXTAUTH_URL` | NextAuth 登录回调使用的站点地址，例如 `https://blog.lumio.games`。 |
| `DATABASE_URL` | PostgreSQL 连接串。Zeabur 可填 `${POSTGRES_CONNECTION_STRING}`。 |
| `AUTH_SECRET` | NextAuth 会话签名密钥。用随机长字符串。 |
| `AUTH_GITHUB_ID` | GitHub OAuth App 的 Client ID。 |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App 的 Client Secret。 |
| `ADMIN_GITHUB_LOGINS` | 后台白名单 GitHub 用户名，多个值用逗号或空格分隔。 |
| `GITHUB_NOTES_OWNER` | 笔记仓库 owner。 |
| `GITHUB_NOTES_REPO` | 笔记仓库名称。 |
| `GITHUB_NOTES_BRANCH` | 笔记仓库分支，默认 `main`。 |
| `GITHUB_WRITE_TOKEN` | 用于读取、同步和写回元数据的 GitHub token。 |
| `GITHUB_WEBHOOK_SECRET` | GitHub Webhook 签名密钥。 |
| `AI_TOKEN_PEPPER` | AI Bearer token 的 hash 密钥。 |
| `SYNC_RECONCILE_CRON` | 定时全量校准表达式，供 Zeabur 定时任务或外部 cron 使用。 |

不要在不同环境复用 `AUTH_SECRET`、`GITHUB_WEBHOOK_SECRET` 或 `AI_TOKEN_PEPPER`。

## PostgreSQL 初始化

1. 在 Zeabur 创建 PostgreSQL 服务。
2. 在 Web 服务中设置 `DATABASE_URL=${POSTGRES_CONNECTION_STRING}`。
3. 进入 Web 服务 Shell，运行 `npx prisma db push`。
4. 部署时运行 `npm run db:generate` 再运行 `npm run build`。

数据库保存同步后的标题、正文、标签、可见性、同步任务、AI 令牌 hash 和审计日志。Markdown frontmatter 仍是发布元数据的源头。

## GitHub OAuth

在 GitHub 创建 OAuth App，回调地址填写：

```text
https://blog.lumio.games/api/auth/callback/github
```

如果换域名，就把 `blog.lumio.games` 替换为你的域名。

创建后：

- Client ID 填入 `AUTH_GITHUB_ID`。
- Client Secret 填入 `AUTH_GITHUB_SECRET`。
- 你的 GitHub 用户名填入 `ADMIN_GITHUB_LOGINS`。

## GitHub Webhook

在笔记仓库创建 Webhook：

- Payload URL：`https://blog.lumio.games/api/webhooks/github`
- Content type：`application/json`
- Secret：填 `GITHUB_WEBHOOK_SECRET`
- Events：选择 `push`

Webhook 路由会验证 `x-hub-signature-256`，创建同步任务，并尝试内联执行增量同步。
如果 GitHub compare 输出不完整，系统会回退到全量校准。

## 定时全量校准

使用 Zeabur 定时任务或外部 cron 调用 Agent 同步接口：

```bash
curl -X POST https://blog.lumio.games/api/ai/sync \
  -H "Authorization: Bearer <拥有 sync:trigger 权限的 AI token>" \
  -H "Content-Type: application/json" \
  -d '{"mode":"reconcile"}'
```

AI token 在 `/admin/ai-tokens` 创建，权限范围选择 `sync:trigger`。原始 token 只显示一次，需要保存到 cron 平台的密钥配置里。

## 健康检查

平台健康检查：

```text
GET /api/health
```

后台健康检查：

```text
GET /api/admin/health
```

后台健康检查需要有效管理员登录。

## 手动同步

第一次部署或更换笔记仓库后，先在 Zeabur Web 服务 Shell 运行：

```bash
npx prisma db push
```

然后进入 `/admin/content` 点击“立即同步”，或让笔记仓库 push 一次触发 webhook。
公开 `/blog` 页面读取 PostgreSQL 里的同步结果；
只配置 GitHub 环境变量不会自动显示历史文章。

管理员可以调用：

```text
POST /api/admin/sync
```

Agent 可以调用：

```text
POST /api/ai/sync
```

全量校准请求体：

```json
{"mode":"reconcile"}
```

增量同步请求体：

```json
{"mode":"incremental","before":"<sha>","after":"<sha>"}
```

## 上线前检查

部署分支前运行：

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

会访问 GitHub、PostgreSQL、OAuth 或 Zeabur 的检查需要真实凭据，建议在 staging 环境执行。
