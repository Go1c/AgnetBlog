# Git Writeback And Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow admin metadata edits to update Markdown frontmatter in GitHub and record auditable changes.

**Architecture:** The database is not the source of truth for file-level publishing state. Metadata changes patch Markdown frontmatter in GitHub, then trigger re-sync and write audit records.

**Tech Stack:** GitHub REST API, TypeScript, Prisma repositories, Next.js Route Handlers.

---

## Branch

```powershell
git worktree add .worktrees/agent-git-writeback-audit -b agent/git-writeback-audit
cd .worktrees/agent-git-writeback-audit
```

## Owned Files

- Create `lib/content/frontmatter-patch.ts`
- Create `lib/github/writeback.ts`
- Create `lib/audit/audit-service.ts`
- Create `app/api/admin/content/[id]/metadata/route.ts`
- Modify `app/admin/content/page.tsx` only after `agent/admin-auth` is merged

## Dependencies

This branch depends on:

- `agent/db-prisma`
- `agent/content-pipeline`
- `agent/admin-auth`
- `agent/github-sync`

## Task 1: Frontmatter Patch

Create `lib/content/frontmatter-patch.ts`.

Requirements:

- Preserve Markdown body.
- Preserve unrelated frontmatter fields where practical.
- Update only allowed publishing metadata.
- Validate output through the same schema used by ingest.
- Return before and after metadata summaries.

## Task 2: GitHub Writeback

Create `lib/github/writeback.ts`.

Requirements:

- Fetch current file SHA.
- Write updated file contents to configured branch.
- Use `GITHUB_WRITE_TOKEN`.
- Include a clear commit message.
- Detect SHA conflicts and return a conflict-safe error.

## Task 3: Audit Service

Create `lib/audit/audit-service.ts`.

Requirements:

- Accept actor type and actor id.
- Record action, target type, target id or path, diff summary, and timestamp.
- Never store raw secrets.

## Task 4: Admin Metadata API

Create `app/api/admin/content/[id]/metadata/route.ts`.

Behavior:

- Require admin auth.
- Validate requested metadata changes.
- Patch GitHub file.
- Create audit log.
- Trigger re-sync.
- Return updated job or content status.

## Task 5: Admin UI Hook

Modify `app/admin/content/page.tsx` only if that page exists from `agent/admin-auth`.

Minimum behavior:

- Show editable visibility and content type fields.
- Submit metadata changes to the admin API.
- Show writeback errors clearly.

## Verification

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## Handoff

Report:

- Which metadata fields can be edited.
- Conflict behavior.
- Audit log shape.
- Sync trigger behavior after writeback.
