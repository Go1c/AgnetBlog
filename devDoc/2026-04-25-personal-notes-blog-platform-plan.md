# Personal Notes Blog / Docs Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal website on Zeabur that publishes local Markdown notes from GitHub into a dual-mode Blog + Docs platform with admin permissions, scheduled/webhook sync, and AI-manageable APIs.

**Architecture:** Use a `Next.js` full-stack app as the single web runtime for frontend, admin backend, webhook endpoints, and AI-facing APIs. Treat the local notes GitHub repo as the canonical content source, store publishing metadata in Markdown frontmatter, and maintain a PostgreSQL-backed derived index for permissions, navigation, search, sync jobs, and audit logs.

**Tech Stack:** `Next.js App Router`, `TypeScript`, `PostgreSQL`, `Prisma`, `NextAuth/Auth.js` with GitHub OAuth, Markdown parsing pipeline, Zeabur scheduled jobs, GitHub Webhooks, PostgreSQL full-text search.

---

## Summary

Build one deployable application with these core capabilities:

- Ingest Markdown notes from the GitHub notes repo
- Support `blog` and `docs` as two independent publishing areas
- Support `private`, `public`, and `unlisted` visibility
- Provide an admin backend for directory defaults, sync jobs, and audit visibility
- Provide AI-friendly scoped APIs for controlled metadata management
- Keep authoring local-first and Git-first instead of moving content into a CMS

Default product choices locked for v1:

- Hosting: Zeabur
- Runtime model: Next.js full-stack
- Database: PostgreSQL
- Search: PostgreSQL full-text search
- Admin auth: GitHub OAuth
- Human roles: single `admin` role only
- Sync trigger: GitHub webhook plus scheduled reconciliation every 15 minutes
- Unlisted semantics: accessible by direct URL, excluded from public discovery and search

## Public Interfaces

### Markdown Frontmatter Contract

All publishable Markdown files must support these frontmatter fields:

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

Rules:

- `private`: visible only to authenticated admins; excluded from all public index/search/listing outputs
- `public`: eligible for homepage, listing pages, sitemap, RSS, and public search
- `unlisted`: directly accessible by URL; excluded from homepage, listing pages, sitemap, RSS, and public search
- Missing file-level metadata can inherit from directory policy defaults
- File-level frontmatter always overrides directory policy

### Site Routes

- `/blog`
- `/blog/[...slug]`
- `/docs`
- `/docs/[...slug]`
- `/search`
- `/admin`
- `/api/webhooks/github`
- `/api/admin/*`
- `/api/ai/*`

### Admin API Surface

Expose authenticated admin endpoints for:

- GitHub OAuth session management
- Sync trigger and sync status query
- Content list/detail query
- Directory policy CRUD
- File metadata update
- Docs navigation configuration read/write
- AI token issue/revoke
- Audit log list/detail

### AI API Surface

Expose scoped token endpoints for:

- `GET /api/ai/content`
- `GET /api/ai/content/:id`
- `GET /api/ai/search`
- `GET /api/ai/sync-jobs`
- `POST /api/ai/sync`
- `PATCH /api/ai/content/:id`
- `GET /api/ai/audit-logs`

Constraints:

- All AI writes must be scoped and audited
- AI tokens must not read `private` content unless explicitly granted
- AI writes must run through the same validation pipeline as admin writes
- AI write operations should update source-of-truth metadata in Git, then trigger re-index

## Implementation Tasks

### Task 1: Scaffold the application baseline

**Files:**
- Create: app project root under `F:\AI\AgnetBlog`
- Create: core config files for `Next.js`, `TypeScript`, package manager, linting, env template
- Create: initial `README.md` describing local/dev/deploy workflow

**Steps:**

1. Initialize a new `Next.js` App Router project in `F:\AI\AgnetBlog`.
2. Add `TypeScript`, Prisma, GitHub auth dependency, Markdown parser dependencies, and database client packages.
3. Define `.env.example` with GitHub OAuth, database URL, webhook secret, AI secret, notes repo config, and schedule settings.
4. Add a minimal landing route and healthcheck route.
5. Confirm local build and typecheck pass.

### Task 2: Define the database schema

**Files:**
- Create: Prisma schema and first migration
- Create: seed or bootstrap script if needed

**Database models:**

- `AdminUser`
- `SyncJob`
- `DirectoryPolicy`
- `ContentItem`
- `ContentAsset`
- `DocsNavNode`
- `AiToken`
- `AuditLog`

**Required fields:**

- `ContentItem`: source path, repo SHA, title, slug, content type, visibility, published, summary, tags, section, dates, search vector/cache, render status
- `DirectoryPolicy`: path prefix, default content type, default visibility, listing enabled, search enabled
- `SyncJob`: trigger type, commit range, status, started/finished timestamps, error details
- `AiToken`: token hash, scopes, creator, last used, revoked state
- `AuditLog`: actor type, actor id, action, target type, target id/path, diff summary, timestamp

**Steps:**

1. Write Prisma schema for all runtime entities.
2. Add uniqueness constraints for source path and slug scope.
3. Add indexes for content lookup, search, directory policy resolution, and job status.
4. Generate and run initial migration.
5. Validate schema against the target PostgreSQL instance.

### Task 3: Build the Markdown ingest pipeline

**Files:**
- Create: Markdown loader and parser module
- Create: frontmatter validator module
- Create: effective-policy resolver
- Create: content upsert service

**Behavior:**

- Parse Markdown files from the GitHub notes repo snapshot
- Read frontmatter if present
- Apply directory defaults where needed
- Reject invalid visibility/content type values
- Normalize slugs and dates
- Extract title fallback from filename or first heading if missing
- Produce a `ContentItem` record and rendered content artifact

**Steps:**

1. Implement frontmatter parsing and schema validation.
2. Implement directory-policy lookup by longest matching prefix.
3. Implement effective metadata resolution.
4. Implement Markdown to renderable structure conversion.
5. Upsert parsed content into PostgreSQL.
6. Mark deleted files as removed/unpublished during sync.
7. Record parse or validation failures without failing the whole job.

### Task 4: Implement GitHub sync integration

**Files:**
- Create: GitHub webhook handler
- Create: GitHub repo access service
- Create: scheduled reconciliation job entrypoint

**Behavior:**

- Verify webhook signature
- Support push events for the configured branch
- Fetch changed files between commits
- Re-parse only touched Markdown/assets when possible
- Run full reconciliation on a schedule as a repair path

**Steps:**

1. Implement webhook signature verification.
2. Store a `SyncJob` record for each webhook event.
3. Query changed files from GitHub for incremental ingest.
4. Fallback to repository head scan for scheduled reconciliation.
5. Persist sync job logs, counts, and failures.
6. Expose sync job status in admin APIs.

### Task 5: Implement access control and visibility enforcement

**Files:**
- Create: permission guard utilities
- Modify: public content queries to filter by effective visibility
- Modify: admin content queries to expose all states

**Behavior:**

- Public requests can only see `public` or direct-route `unlisted`
- Public lists/search/sitemap/RSS only include `public`
- `unlisted` must never appear in public discovery surfaces
- `private` must never resolve publicly

**Steps:**

1. Centralize effective visibility checks in one server-side module.
2. Apply guards to page loaders, list queries, search queries, sitemap generation, and RSS generation.
3. Ensure `unlisted` routes resolve only when slug is known directly.
4. Return `404` or equivalent non-disclosing response for unauthorized public access.

### Task 6: Build the blog experience

**Files:**
- Create: homepage feed components
- Create: blog list page
- Create: blog article page

**Behavior:**

- Homepage highlights recent and featured `public` blog posts
- Blog listing supports pagination and tag filters
- Blog article page renders Markdown, metadata, cover, related tags

**Steps:**

1. Build homepage sections from `public + blog`.
2. Build blog index route with pagination.
3. Build blog article route from normalized slug.
4. Render reading metadata and update date.
5. Add basic SEO metadata output for public blog pages.

### Task 7: Build the docs experience

**Files:**
- Create: docs index page
- Create: docs detail page
- Create: sidebar and table-of-contents components

**Behavior:**

- Docs pages use a stable technical-doc layout
- Left sidebar is section-driven
- Right-side in-page TOC is generated from headings
- Previous/next navigation is based on docs nav ordering
- URLs are stable and suitable for external linking

**Steps:**

1. Build docs listing from `public + docs`.
2. Generate sidebar tree from `docSection` plus nav config.
3. Build docs page layout with headings, anchors, and previous/next navigation.
4. Keep docs presentation visually distinct from blog mode.

### Task 8: Implement public search

**Files:**
- Create: search indexing/update module
- Create: search API/route
- Create: search UI

**Behavior:**

- Search only indexes `public` content in v1
- Search works across blog and docs, showing content type labels
- `unlisted` and `private` are excluded from public search index

**Steps:**

1. Create searchable fields from title, summary, tags, and content text.
2. Persist/update PostgreSQL full-text search vectors on ingest.
3. Build public search route and results page.
4. Add type and tag filters if cheap; otherwise defer to v2.

### Task 9: Implement admin authentication and backend UI

**Files:**
- Create: GitHub auth config
- Create: admin layout and route protection
- Create: admin pages for content, sync jobs, directory policies, and AI tokens

**Behavior:**

- Only approved GitHub identities can access admin
- Admin can inspect all content and effective permissions
- Admin can set directory defaults and trigger sync

**Steps:**

1. Configure GitHub OAuth and admin allowlist.
2. Protect `/admin` and `/api/admin/*`.
3. Build content table with filters by type, visibility, and sync state.
4. Build sync jobs page with logs and retry/manual trigger.
5. Build directory policy management UI.
6. Build docs nav management UI if needed for overrides.

### Task 10: Implement metadata editing and Git-backed write path

**Files:**
- Create: admin metadata update service
- Create: GitHub writeback integration
- Modify: audit log creation hooks

**Behavior:**

- Admin changes to visibility/content type write back to source frontmatter in Git
- Site never treats the database as a hidden source of truth for file-level publish state
- Every write creates an audit log entry

**Steps:**

1. Implement frontmatter patch/update utility for Markdown files.
2. Implement GitHub writeback using chosen credential model.
3. Validate metadata changes before commit/write.
4. Trigger re-sync after successful writeback.
5. Store audit log records with before/after summary.

### Task 11: Implement AI token management and AI APIs

**Files:**
- Create: AI auth middleware
- Create: AI endpoints
- Modify: audit log and permission layer for AI actors

**Behavior:**

- AI calls are token-scoped and machine-auditable
- AI can inspect content status and update publish metadata when allowed
- AI cannot bypass admin validation or visibility rules

**Steps:**

1. Implement token issuance, hashing, storage, rotation, and revoke flow.
2. Add AI middleware for scope checks.
3. Implement read endpoints for content/search/sync status.
4. Implement metadata patch endpoint with Git-backed write path.
5. Record all AI actions in audit logs.

### Task 12: Operational hardening and deploy setup

**Files:**
- Create: deployment notes or Zeabur config
- Create: env documentation
- Create: failure runbook

**Behavior:**

- Zeabur deployment supports web runtime plus scheduled sync job
- Required secrets are documented
- Operators can diagnose sync failures quickly

**Steps:**

1. Document required Zeabur environment variables and services.
2. Configure scheduled reconciliation execution.
3. Add health and readiness endpoints if needed.
4. Add concise operational docs for webhook verification, resync, and admin bootstrap.

## Test Plan

### Unit Tests

- frontmatter parsing accepts valid metadata and rejects invalid enum values
- directory policy resolution chooses the longest matching prefix
- file-level metadata overrides directory defaults
- slug normalization remains deterministic
- visibility guards enforce `private/public/unlisted` rules
- AI scope checks reject unauthorized actions

### Integration Tests

- webhook push with changed Markdown creates a successful incremental sync job
- scheduled reconciliation repairs a missed webhook
- deleted Markdown file is removed from public outputs
- malformed frontmatter produces a sync error entry but does not abort unrelated content
- admin metadata update writes Git-backed changes and triggers re-sync
- AI metadata update is audited and respects scopes

### UI / Route Tests

- homepage only shows `public + blog`
- docs sidebar only shows `public + docs`
- unlisted page opens by direct URL but does not appear in search/listing/sitemap/RSS
- private page is inaccessible publicly
- admin can view all content states after GitHub login

### Acceptance Scenarios

1. Create a new local Markdown note, sync it to GitHub, and verify it appears on the site after webhook or scheduled repair.
2. Mark a note as `unlisted` and verify direct access works while public discovery surfaces stay clean.
3. Switch a folder default to `docs + private` and verify new files inherit that behavior until explicitly overridden.
4. Let an AI token update a note from `private` to `public`, verify Git-backed metadata change, re-sync, and audit trail.

## Assumptions

- The source GitHub notes repository is private or at least not relied on as a public confidentiality boundary.
- The notes repo remains the only canonical content source.
- Markdown authoring continues locally; the site is a publishing and management layer, not the main editor.
- v1 uses only one human admin role.
- v1 does not introduce a separate search engine such as Meilisearch or Algolia.
- `unlisted` is not secure storage; anyone with the URL can access it.
- Asset handling can start with GitHub-referenced repository assets and be refined later if CDN concerns emerge.

## Deliverables

- Running Next.js application for public site and admin backend
- PostgreSQL schema and migrations
- GitHub webhook and scheduled sync pipeline
- Blog and docs public routes
- Admin UI for content visibility and directory defaults
- AI token system and scoped management APIs
- Deployment and operations documentation for Zeabur
