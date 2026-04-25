# Next.js + Fumadocs Parallel Development Plan

> **For Agents:** Work task-by-task. Keep each worktree on its assigned branch and file ownership. Do not revert changes made by other Agents.

> **Split Version:** This plan has been split into per-Agent files under `devDoc/plans/`. Use `devDoc/plans/2026-04-25-00-index.md` as the entry point for parallel execution.

**Goal:** Build the AgnetBlog v1 platform on the current Next.js + Fumadocs scaffold.

**Architecture:** Next.js App Router is the single runtime for public pages, admin pages, webhooks, and APIs. Fumadocs handles MDX collections and docs rendering. PostgreSQL stores derived indexes, permissions, sync jobs, AI tokens, and audit logs, while GitHub remains the source of truth for Markdown metadata.

**Tech Stack:** Next.js 16, React 19, Fumadocs UI/MDX, TypeScript 5.9, Tailwind CSS 4, Prisma 7, PostgreSQL, Auth.js/GitHub OAuth.

---

## Baseline Status

The base scaffold already exists in the main worktree.

Verified commands:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Important routes:

| Route | Status |
| --- | --- |
| `/` | Scaffolded |
| `/blog` | Scaffolded with sample MDX post |
| `/blog/hello-world` | Scaffolded |
| `/docs` | Scaffolded with Fumadocs |
| `/docs/platform` | Scaffolded |
| `/admin` | Placeholder only |
| `/api/health` | Scaffolded |
| `/api/search` | Fumadocs docs search only |

Before creating Agent worktrees, commit the baseline first. Every Agent should branch from the same clean commit.

## Worktree Rules

Use project-local worktrees under `.worktrees/`. This directory is ignored by Git.

Example:

```powershell
git worktree add .worktrees/agent-db-prisma -b agent/db-prisma
cd .worktrees/agent-db-prisma
npm.cmd install
npx.cmd fumadocs-mdx
npm.cmd run typecheck
```

Rules:

- One Agent owns one branch and one worktree.
- Each Agent must stay inside its assigned file ownership.
- Shared contracts must be changed first and merged before dependent branches.
- Run `npm.cmd run typecheck`, `npm.cmd run lint`, and relevant tests before handoff.
- Do not run `npm audit fix --force` without a separate decision.
- Use `npm.cmd`, not `npm`, on this Windows PowerShell environment.

## Merge Order

Use this order to reduce conflicts:

1. `agent/db-prisma`
2. `agent/content-pipeline`
3. `agent/public-visibility-search`
4. `agent/admin-auth`
5. `agent/github-sync`
6. `agent/git-writeback-audit`
7. `agent/ai-api`
8. `agent/ops-deploy`

If two branches both need a shared type, put the type in the earlier branch and merge it first.

## Shared Contracts

The following concepts must remain consistent across all Agents:

| Concept | Values |
| --- | --- |
| `contentType` | `blog`, `docs` |
| `visibility` | `private`, `public`, `unlisted` |
| `actorType` | `admin`, `ai`, `system` |
| `syncTrigger` | `webhook`, `scheduled`, `manual`, `ai` |
| `syncStatus` | `queued`, `running`, `success`, `failed`, `partial` |

Visibility contract:

| Visibility | Direct page access | Public list | Public search | Sitemap/RSS |
| --- | --- | --- | --- | --- |
| `public` | Yes | Yes | Yes | Yes |
| `unlisted` | Yes | No | No | No |
| `private` | No | No | No | No |

## Agent 1: Database And Prisma

Branch: `agent/db-prisma`

Worktree:

```powershell
git worktree add .worktrees/agent-db-prisma -b agent/db-prisma
```

Owned files:

- Create `prisma/schema.prisma`
- Create `prisma/seed.ts` if needed
- Create `lib/db.ts`
- Create `lib/db/content-repository.ts`
- Create `lib/db/sync-job-repository.ts`
- Create `lib/db/audit-log-repository.ts`
- Modify `.env.example`
- Modify `package.json` only for Prisma scripts

Tasks:

1. Add Prisma datasource using `DATABASE_URL`.
2. Add models: `AdminUser`, `DirectoryPolicy`, `ContentItem`, `ContentAsset`, `DocsNavNode`, `SyncJob`, `AiToken`, `AuditLog`.
3. Add enum fields for content type, visibility, sync trigger, sync status, actor type, and token scope where practical.
4. Add unique constraints for source path and content type plus slug.
5. Add indexes for visibility, content type, published state, source path, sync status, and audit target.
6. Create `lib/db.ts` with a singleton Prisma client.
7. Add repository helpers for content lookup, sync jobs, and audit logs.
8. Add Prisma scripts: `db:generate`, `db:migrate`, `db:push`, and `db:studio`.

Verification:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run db:generate
```

Handoff notes:

- Do not implement ingest parsing in this branch.
- Do not build admin pages in this branch.
- Include a schema summary in the final Agent report.

## Agent 2: Content Pipeline

Branch: `agent/content-pipeline`

Worktree:

```powershell
git worktree add .worktrees/agent-content-pipeline -b agent/content-pipeline
```

Owned files:

- Create `lib/content/frontmatter.ts`
- Create `lib/content/policy.ts`
- Create `lib/content/slug.ts`
- Create `lib/content/markdown.ts`
- Create `lib/content/ingest.ts`
- Create `lib/content/types.ts`
- Modify `lib/content/visibility.ts`
- Modify `source.config.ts` only if frontmatter schema changes are required

Tasks:

1. Define TypeScript types for effective metadata.
2. Add frontmatter validation for title, dates, tags, content type, visibility, slug, doc section, cover, and published state.
3. Implement directory policy resolution by longest matching prefix.
4. Implement deterministic slug normalization.
5. Implement title fallback from frontmatter, first heading, then filename.
6. Implement `resolveEffectiveMetadata()` that applies directory defaults and file-level overrides.
7. Implement an ingest result type with successes and per-file failures.
8. Add unit tests if the test runner exists when this branch starts. If not, add test cases in `devDoc` for Agent 8 to wire later.

Verification:

```powershell
npm.cmd run typecheck
npm.cmd run lint
```

Handoff notes:

- Do not write to Prisma directly until `agent/db-prisma` is merged.
- Keep pure parsing and policy logic independent from GitHub and database services.

## Agent 3: Public Visibility, Search, Sitemap, RSS

Branch: `agent/public-visibility-search`

Worktree:

```powershell
git worktree add .worktrees/agent-public-visibility-search -b agent/public-visibility-search
```

Owned files:

- Modify `app/(site)/page.tsx`
- Modify `app/(site)/blog/page.tsx`
- Modify `app/(site)/blog/[...slug]/page.tsx`
- Modify `app/(site)/docs/layout.tsx`
- Modify `app/(site)/docs/[[...slug]]/page.tsx`
- Modify `app/(site)/search/page.tsx`
- Create `app/sitemap.ts`
- Create `app/feed.xml/route.ts`
- Create `app/api/search/route.ts` replacement if moving away from Fumadocs-only search
- Modify `lib/content/visibility.ts`
- Create `lib/search/public-search.ts`

Tasks:

1. Centralize public visibility checks in `lib/content/visibility.ts`.
2. Ensure blog listing only shows `public` and `published`.
3. Ensure direct blog/docs routes allow `public` and `unlisted`, but reject `private`.
4. Replace or wrap Fumadocs search so it cannot expose `private` or `unlisted` content.
5. Build `/search` as the initial unified search page.
6. Add sitemap output for public pages only.
7. Add RSS feed for public blog posts only.
8. Keep docs layout visually distinct from blog pages.

Verification:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Handoff notes:

- Do not build admin search in this branch.
- If database search is not ready, implement a safe in-memory MDX search fallback for public content only.

## Agent 4: Admin Auth And Admin Shell

Branch: `agent/admin-auth`

Worktree:

```powershell
git worktree add .worktrees/agent-admin-auth -b agent/admin-auth
```

Owned files:

- Create `auth.ts`
- Create `middleware.ts` if required
- Create `lib/auth/admin.ts`
- Create `app/api/auth/[...nextauth]/route.ts`
- Modify `app/admin/layout.tsx`
- Modify `app/admin/page.tsx`
- Create `app/admin/content/page.tsx`
- Create `app/admin/sync-jobs/page.tsx`
- Create `app/admin/directory-policies/page.tsx`
- Create `app/admin/ai-tokens/page.tsx`
- Create `app/api/admin/health/route.ts`

Tasks:

1. Configure Auth.js with GitHub OAuth.
2. Read admin allowlist from `ADMIN_GITHUB_LOGINS`.
3. Protect `/admin` and `/api/admin/*`.
4. Build admin navigation shell.
5. Add content, sync job, directory policy, and AI token placeholder pages.
6. Add admin-only health endpoint to validate session protection.
7. Document required GitHub OAuth variables in `.env.example` if missing.

Verification:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Handoff notes:

- Do not implement content mutation in this branch.
- Do not implement AI token creation beyond placeholder UI unless `agent/ai-api` is merged.

## Agent 5: GitHub Sync

Branch: `agent/github-sync`

Worktree:

```powershell
git worktree add .worktrees/agent-github-sync -b agent/github-sync
```

Owned files:

- Create `app/api/webhooks/github/route.ts`
- Create `app/api/admin/sync/route.ts`
- Create `lib/github/client.ts`
- Create `lib/github/webhook.ts`
- Create `lib/sync/sync-service.ts`
- Create `lib/sync/reconcile.ts`
- Create `lib/sync/types.ts`
- Modify `.env.example`

Tasks:

1. Verify GitHub webhook signatures.
2. Accept push events for the configured branch only.
3. Create sync job records through the repository from `agent/db-prisma`.
4. Fetch changed files for incremental sync.
5. Add scheduled reconciliation entrypoint.
6. Connect changed Markdown files to `agent/content-pipeline` parsing.
7. Record per-file failures without aborting the whole job.
8. Add admin manual sync endpoint.

Verification:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Handoff notes:

- This branch depends on `agent/db-prisma` and `agent/content-pipeline`.
- Do not implement GitHub writeback in this branch.

## Agent 6: Git Writeback And Audit

Branch: `agent/git-writeback-audit`

Worktree:

```powershell
git worktree add .worktrees/agent-git-writeback-audit -b agent/git-writeback-audit
```

Owned files:

- Create `lib/github/writeback.ts`
- Create `lib/content/frontmatter-patch.ts`
- Create `lib/audit/audit-service.ts`
- Create `app/api/admin/content/[id]/metadata/route.ts`
- Modify admin content page only after `agent/admin-auth` is merged

Tasks:

1. Implement frontmatter patching that preserves body content.
2. Validate metadata changes through the same schema as ingest.
3. Write metadata changes back to GitHub using `GITHUB_WRITE_TOKEN`.
4. Create audit log records for every write.
5. Trigger re-sync after successful writeback.
6. Return conflict-safe errors when GitHub SHA has changed.

Verification:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Handoff notes:

- This branch depends on `agent/db-prisma`, `agent/content-pipeline`, `agent/github-sync`, and `agent/admin-auth`.
- Do not add AI token behavior here.

## Agent 7: AI API

Branch: `agent/ai-api`

Worktree:

```powershell
git worktree add .worktrees/agent-ai-api -b agent/ai-api
```

Owned files:

- Create `lib/ai/token.ts`
- Create `lib/ai/scopes.ts`
- Create `lib/ai/guard.ts`
- Create `app/api/ai/content/route.ts`
- Create `app/api/ai/content/[id]/route.ts`
- Create `app/api/ai/search/route.ts`
- Create `app/api/ai/sync/route.ts`
- Create `app/api/ai/sync-jobs/route.ts`
- Create `app/api/ai/audit-logs/route.ts`
- Modify `app/admin/ai-tokens/page.tsx` only after `agent/admin-auth` is merged

Tasks:

1. Hash AI tokens with `AI_TOKEN_PEPPER`.
2. Define scopes: `content:read`, `content:read-private`, `content:write-metadata`, `sync:trigger`, `audit:read`.
3. Implement token lookup, revocation, and last-used updates.
4. Enforce scope checks per endpoint.
5. Ensure AI cannot read `private` content unless `content:read-private` is present.
6. Route metadata writes through `agent/git-writeback-audit`.
7. Audit every AI action.

Verification:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Handoff notes:

- This branch depends on `agent/db-prisma`, `agent/content-pipeline`, `agent/github-sync`, and `agent/git-writeback-audit`.
- Do not bypass Git-backed metadata writes.

## Agent 8: Ops, Testing, And Deployment

Branch: `agent/ops-deploy`

Worktree:

```powershell
git worktree add .worktrees/agent-ops-deploy -b agent/ops-deploy
```

Owned files:

- Create `vitest.config.ts` if unit tests are added.
- Create `tests/` structure.
- Create `devDoc/2026-04-25-zeabur-deploy-runbook.md`
- Create `devDoc/2026-04-25-testing-strategy.md`
- Modify `README.md`
- Modify `package.json` only for test scripts.

Tasks:

1. Add a lightweight test runner if not already present.
2. Add tests for visibility rules, slug normalization, policy resolution, AI scope checks, and webhook signature verification.
3. Document Zeabur services and environment variables.
4. Document scheduled reconciliation setup.
5. Document manual resync and webhook troubleshooting.
6. Document local development and worktree workflow.
7. Keep docs concise and operational.

Verification:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Handoff notes:

- This branch should merge late enough to include real commands from other branches.
- Do not rewrite architecture decisions unless the implementation changed them.

## Integration Checklist

Run this after each merge:

```powershell
npm.cmd install
npx.cmd fumadocs-mdx
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Check these pages manually after major merges:

```txt
/
/blog
/blog/hello-world
/docs
/docs/platform
/search
/admin
/api/health
```

Do not merge a branch that exposes `private` content through public list, search, sitemap, RSS, or Fumadocs search.

## Known Baseline Notes

- `npm.cmd` must be used in PowerShell because `npm.ps1` is blocked by execution policy.
- `zod` is pinned to `4.1.12` because the newer package resolved during setup lacked files required by Fumadocs generation.
- `typecheck` uses an 8GB Node heap to avoid OOM from generated Next/Fumadocs types.
- Fumadocs `.source/` is generated and ignored by Git.
- `.worktrees/` is ignored by Git and reserved for Agent worktrees.
