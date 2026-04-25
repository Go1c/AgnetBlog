# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js 16 + Fumadocs publishing platform. Application routes live in `app/`: public pages under `app/(site)`, admin pages under `app/admin`, and API routes under `app/api`. Shared React helpers live in `components/`. Content samples and future synced Markdown/MDX live in `content/blog` and `content/docs`. Shared server and content logic belongs in `lib/`, grouped by concern such as `lib/content`, `lib/search`, `lib/auth`, or `lib/db`. Planning and architecture notes live in `devDoc/`; per-agent implementation plans live in `devDoc/plans/`.

Generated directories are not source: `.next/`, `.source/`, `node_modules/`, and `.worktrees/` must stay untracked.

## Build, Test, and Development Commands

Use `npm.cmd` in PowerShell because `npm.ps1` may be blocked.

- `npm.cmd install`: install dependencies from `package-lock.json`.
- `npx.cmd fumadocs-mdx`: regenerate Fumadocs `.source/` files after content or source config changes.
- `npm.cmd run dev`: start the local Next.js dev server.
- `npm.cmd run typecheck`: run TypeScript with an 8GB heap.
- `npm.cmd run lint`: run ESLint with zero warnings allowed.
- `npm.cmd run build`: run the production Next.js build.

## Coding Style & Naming Conventions

Use TypeScript with strict mode. Prefer server components unless client-side interactivity is required. Keep files named by route or responsibility: `page.tsx`, `route.ts`, `visibility.ts`, `sync-service.ts`. Use lowercase URL values for content metadata: `blog`, `docs`, `public`, `private`, `unlisted`. Keep comments rare and explain non-obvious decisions only.

## Testing Guidelines

No test runner is configured yet. Until `agent/ops-deploy` adds tests, every change must pass:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

When tests are added, place pure logic tests near `tests/` or mirror the module path. Name tests by behavior, for example `visibility.test.ts` or `slug.test.ts`.

## Commit & Pull Request Guidelines

This repository has no existing commit history. Use Conventional Commits going forward, for example `feat: add prisma schema` or `docs: split agent plans`.

Pull requests should include a short summary, verification commands, linked issue or plan file, and screenshots for visible UI changes. State any skipped checks and why.

## Agent-Specific Instructions

Use `.worktrees/` for parallel Agent work. Each Agent must own a disjoint file set, follow its plan in `devDoc/plans/`, and avoid reverting changes made by other Agents.
