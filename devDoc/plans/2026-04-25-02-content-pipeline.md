# Content Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build pure content parsing, metadata validation, policy resolution, and slug normalization logic.

**Architecture:** Keep parsing and policy logic independent from GitHub, Prisma, and Next route handlers. Downstream sync and admin code should call these pure services.

**Tech Stack:** TypeScript, Zod, Fumadocs MDX frontmatter conventions.

---

## Branch

```powershell
git worktree add .worktrees/agent-content-pipeline -b agent/content-pipeline
cd .worktrees/agent-content-pipeline
```

## Owned Files

- Create `lib/content/types.ts`
- Create `lib/content/frontmatter.ts`
- Create `lib/content/policy.ts`
- Create `lib/content/slug.ts`
- Create `lib/content/markdown.ts`
- Create `lib/content/ingest.ts`
- Modify `lib/content/visibility.ts`
- Modify `source.config.ts` only if frontmatter schema changes are required

## Dependencies

This branch can run after or in parallel with `agent/db-prisma`, but it must not write database code until the DB branch is merged.

## Task 1: Content Types

Create shared TypeScript types for:

- `ContentType`
- `Visibility`
- `PublishFrontmatter`
- `DirectoryPolicyInput`
- `EffectiveContentMetadata`
- `IngestSuccess`
- `IngestFailure`
- `IngestResult`

Use lowercase public values: `blog`, `docs`, `private`, `public`, `unlisted`.

## Task 2: Frontmatter Validation

Create `lib/content/frontmatter.ts`.

Validate:

- `title`
- `date`
- `updatedAt`
- `summary`
- `tags`
- `contentType`
- `visibility`
- `slug`
- `docSection`
- `cover`
- `published`

Accept YAML dates as `string | Date`. Normalize dates to `YYYY-MM-DD` strings in returned metadata.

## Task 3: Directory Policy Resolution

Create `lib/content/policy.ts`.

Rules:

- Choose the longest matching path prefix.
- File-level metadata overrides directory defaults.
- Missing metadata can inherit defaults.
- Invalid defaults should return structured errors.

## Task 4: Slug Normalization

Create `lib/content/slug.ts`.

Rules:

- Preserve explicit `slug` when valid.
- Derive from relative source path when missing.
- Remove file extension.
- Lowercase ASCII.
- Replace whitespace with `-`.
- Remove unsafe URL characters.
- Keep nested paths deterministic.

## Task 5: Markdown Helpers

Create `lib/content/markdown.ts`.

Functions:

- Extract first Markdown heading.
- Strip frontmatter from body.
- Resolve title fallback from frontmatter, first heading, then filename.

## Task 6: Ingest Result

Create `lib/content/ingest.ts`.

The ingest function should accept file-like inputs and return successes plus per-file failures. Do not throw for one bad file unless the caller passed invalid arguments.

## Verification

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
```

If tests exist, add unit tests and run them. If no test runner exists yet, document test cases for Agent 8.

## Handoff

Report:

- Public types exported.
- Validation behavior.
- Slug rules.
- Any assumptions that sync/database code must follow.
