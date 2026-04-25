# AgnetBlog

AgnetBlog is a personal Markdown-first publishing platform built with Next.js App
Router and Fumadocs.

## Stack

- Next.js App Router for pages, admin, webhooks, and APIs.
- Fumadocs MDX and Fumadocs UI for docs and blog content rendering.
- PostgreSQL and Prisma are planned for derived indexes, sync jobs, permissions,
  AI tokens, and audit logs.
- GitHub remains the source of truth for notes content.

## Local Development

Install dependencies:

```powershell
npm.cmd install
```

Run the dev server:

```powershell
npm.cmd run dev
```

Useful checks:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

PowerShell may block `npm.ps1` on this machine. Use `npm.cmd` explicitly.

## Important Routes

- `/` public landing page
- `/blog` blog index
- `/blog/hello-world` sample blog post
- `/docs` Fumadocs docs home
- `/admin` admin scaffold
- `/api/health` healthcheck
- `/api/search` Fumadocs docs search endpoint

## Parallel Agent Worktrees

Use project-local worktrees under `.worktrees/`. The directory is ignored by Git.

Example:

```powershell
git worktree add .worktrees/agent-sync -b agent/sync-pipeline
```

Each Agent should own a disjoint file set and merge back through review.

