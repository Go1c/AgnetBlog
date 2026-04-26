# Share Links and Comments Implementation Plan

> **For agentic workers:** Work in `feat/share-comments`. Keep write scopes disjoint. Do not revert edits from other agents.

**Goal:** Add short share links with optional password and navigation scope, plus bottom-of-document comments with anonymous/default names and admin deletion.

**Architecture:** Prisma owns persistent `ContentShare` and `ContentComment` records. Share links resolve through `/s/[token]` and optional nested paths for navigable doc shares. Comments are regular server-rendered forms posted to API routes and rendered below blog, docs, and shared pages.

**Tech Stack:** Next.js App Router, Prisma 7 generated client, React server components, small client components for clipboard sharing, Vitest for pure logic tests.

---

## Shared Schema Owned By Controller

Files:
- Modify: `prisma/schema.prisma`
- Generate: `lib/generated/prisma/**`

Add enums:
- `ShareAccessMode`: `LINK`, `PASSWORD`
- `ShareNavigationScope`: `CURRENT_ONLY`, `NAVIGABLE`
- `CommentStatus`: `ACTIVE`, `DELETED`

Add models:
- `ContentShare`: belongs to `ContentItem`, stores short `token`, access mode, optional password hash/salt, navigation scope, creator login, access timestamps, revoke timestamp.
- `ContentComment`: belongs to `ContentItem`, optional parent comment, display name, body, status, deletion metadata, timestamps.

## Worker A: Share Links

Owned files:
- Create: `tests/share/share-link.test.ts`
- Create: `lib/share/short-token.ts`
- Create: `lib/share/password.ts`
- Create: `lib/share/access-cookie.ts`
- Create: `lib/db/share-repository.ts`
- Create: `components/share/share-button.tsx`
- Create: `components/share/admin-share-panel.tsx`
- Create: `app/api/admin/content/[id]/shares/route.ts`
- Create: `app/api/admin/shares/[id]/revoke/route.ts`
- Create: `app/s/[token]/[[...slug]]/page.tsx`
- Create: `app/s/[token]/unlock/route.ts`

Requirements:
- Generate compact URL-safe tokens for `/s/<token>`.
- Admin can create link-only or password-protected shares from content detail.
- Admin can choose `CURRENT_ONLY` or `NAVIGABLE`.
- Admin panel shows share text as `标题 + 换行 + 短链接`, with copy-friendly text.
- Public share button copies `标题 + 换行 + 链接`, preferring an active link-only short share if available.
- Password shares render a password form until unlocked.
- `CURRENT_ONLY` shares hide docs navigation and reject nested slugs.
- `NAVIGABLE` docs shares allow browsing published docs through `/s/<token>/<doc-slug>`.
- Revoked or missing shares return 404.

Verification:
- `npm run test -- tests/share/share-link.test.ts`
- `npm run typecheck`

## Worker B: Comments

Owned files:
- Create: `tests/comments/comment-validation.test.ts`
- Create: `lib/comments/validation.ts`
- Create: `lib/db/comment-repository.ts`
- Create: `components/comments/comment-section.tsx`
- Create: `app/api/comments/route.ts`
- Create: `app/api/admin/comments/[id]/delete/route.ts`

Requirements:
- Any visitor can comment with body and optional display name.
- Blank display name renders as `匿名`.
- Body is required, trimmed, and limited to 1000 characters.
- Display name is trimmed and limited to 32 characters.
- Comment section renders at document bottom with compact rows: name, time, body.
- Admin users see delete buttons and can soft-delete comments.
- Deleted comments are hidden from public lists.

Verification:
- `npm run test -- tests/comments/comment-validation.test.ts`
- `npm run typecheck`

## Controller Integration

Owned files:
- Modify: `app/(site)/blog/[...slug]/page.tsx`
- Modify: `app/(site)/docs/[[...slug]]/page.tsx`
- Modify: `app/admin/content/[id]/page.tsx`

Requirements:
- Blog and docs pages render `ShareButton` near the title and `CommentSection` after the body.
- Admin content detail renders `AdminSharePanel`.
- Shared pages render `CommentSection` for the currently viewed content.

Final verification:
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
