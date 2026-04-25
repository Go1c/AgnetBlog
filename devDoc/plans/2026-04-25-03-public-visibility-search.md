# Public Visibility And Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce public visibility rules across blog, docs, search, sitemap, and RSS.

**Architecture:** Centralize visibility decisions in `lib/content/visibility.ts`. Public discovery surfaces must only include `public` and `published` content; direct routes may resolve `unlisted` but never `private`.

**Tech Stack:** Next.js App Router, Fumadocs source loader, TypeScript, RSS XML.

---

## Branch

```powershell
git worktree add .worktrees/agent-public-visibility-search -b agent/public-visibility-search
cd .worktrees/agent-public-visibility-search
```

## Owned Files

- Modify `app/(site)/page.tsx`
- Modify `app/(site)/blog/page.tsx`
- Modify `app/(site)/blog/[...slug]/page.tsx`
- Modify `app/(site)/docs/layout.tsx`
- Modify `app/(site)/docs/[[...slug]]/page.tsx`
- Modify `app/(site)/search/page.tsx`
- Create `app/sitemap.ts`
- Create `app/feed.xml/route.ts`
- Modify or replace `app/api/search/route.ts`
- Modify `lib/content/visibility.ts`
- Create `lib/search/public-search.ts`

## Dependencies

This branch can start from the baseline. If `agent/content-pipeline` has merged, reuse its shared types.

## Task 1: Visibility Guard

Extend `lib/content/visibility.ts`.

Required functions:

- `isPublicListable(page)`
- `isDirectlyReadable(page)`
- `isPublicSearchable(page)`
- `isSitemapEligible(page)`
- `isRssEligible(page)`

Rules:

- `public` and `published !== false` passes all public discovery checks.
- `unlisted` and `published !== false` passes direct access only.
- `private` fails all public access.

## Task 2: Blog Routes

Update `/blog` and `/blog/[...slug]`.

Requirements:

- Listing only shows `public`.
- Direct page allows `public` and `unlisted`.
- Direct page returns `notFound()` for `private`.
- Metadata must not reveal private page details.

## Task 3: Docs Routes

Update `/docs` routes.

Requirements:

- Direct page allows `public` and `unlisted`.
- Direct page returns `notFound()` for `private`.
- If Fumadocs page tree includes hidden pages, filter or document the limitation before merge.

## Task 4: Unified Search

Create `lib/search/public-search.ts`.

Initial acceptable implementation:

- Search in loaded MDX page metadata.
- Match title, description, summary, and tags.
- Include both blog and docs.
- Exclude `private` and `unlisted`.

Replace `app/api/search/route.ts` only if Fumadocs search cannot guarantee visibility filtering.

## Task 5: Sitemap And RSS

Create:

- `app/sitemap.ts`
- `app/feed.xml/route.ts`

Rules:

- Sitemap includes public homepage, blog list, docs index, public blog posts, and public docs pages.
- RSS includes public blog posts only.

## Verification

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Manual checks:

```txt
/blog
/blog/hello-world
/docs
/docs/platform
/search
/feed.xml
/sitemap.xml
```

## Handoff

Report any remaining Fumadocs search or page-tree visibility risk explicitly.
