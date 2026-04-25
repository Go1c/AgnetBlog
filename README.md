# AgnetBlog

AgnetBlog is a personal Markdown-first publishing platform built with Next.js App
Router, Fumadocs, Prisma, GitHub sync, and scoped AI APIs.

## Stack

- Next.js App Router for pages, admin, webhooks, and APIs.
- Fumadocs MDX and Fumadocs UI for docs and blog content rendering.
- PostgreSQL and Prisma store derived indexes, sync jobs, permissions, AI token
  hashes, and audit logs.
- GitHub remains the source of truth for notes content.
- Admin routes use GitHub OAuth with an allowlist.
- AI routes use scoped bearer tokens.

## Local Development

Install dependencies:

```powershell
npm.cmd install
```

Copy `.env.example` to `.env.local` and fill in the values needed for the flows
you want to run. At minimum, Prisma commands need `DATABASE_URL`.

Generate Fumadocs and Prisma outputs after dependency, schema, or content changes:

```powershell
npx.cmd fumadocs-mdx
npm.cmd run db:generate
```

Run the dev server:

```powershell
npm.cmd run dev
```

Useful checks:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

PowerShell may block `npm.ps1` on this machine. Use `npm.cmd` explicitly.

## Important Routes

- `/` public landing page
- `/blog` blog index
- `/blog/hello-world` sample blog post
- `/docs` Fumadocs docs home
- `/admin` admin scaffold
- `/admin/content` Git-backed metadata editing
- `/admin/ai-tokens` scoped AI token issuance and revocation
- `/api/health` healthcheck
- `/api/search` Fumadocs docs search endpoint
- `/api/webhooks/github` GitHub push webhook
- `/api/ai/content` AI content list
- `/api/ai/content/[id]` AI content detail and metadata writeback
- `/api/ai/search` AI search
- `/api/ai/sync` AI sync trigger
- `/api/ai/sync-jobs` AI sync job list
- `/api/ai/audit-logs` AI audit log inspection

## Environment Overview

Required environment groups:

- Database: `DATABASE_URL`
- Auth: `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`,
  `ADMIN_GITHUB_LOGINS`
- GitHub sync: `GITHUB_NOTES_OWNER`, `GITHUB_NOTES_REPO`,
  `GITHUB_NOTES_BRANCH`, `GITHUB_WRITE_TOKEN`, `GITHUB_WEBHOOK_SECRET`
- AI API: `AI_TOKEN_PEPPER`
- Public URLs and scheduling: `NEXT_PUBLIC_SITE_URL`, `SYNC_RECONCILE_CRON`

See `.env.example` for the current list.

## Parallel Agent Worktrees

Use project-local worktrees under `.worktrees/`. The directory is ignored by Git.

Example:

```powershell
git worktree add .worktrees/agent-sync -b agent/sync-pipeline
```

Each Agent should own a disjoint file set and merge back through review.

## Deployment And Operations

- Zeabur deployment runbook:
  `devDoc/2026-04-25-zeabur-deploy-runbook.md`
- Testing strategy:
  `devDoc/2026-04-25-testing-strategy.md`

Use `npm.cmd` in PowerShell. Zeabur and Linux shells should use plain `npm`.

