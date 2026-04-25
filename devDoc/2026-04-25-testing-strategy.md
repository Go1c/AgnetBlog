# Testing Strategy

The test suite starts with pure functions because they are cheap, deterministic, and cover the highest-risk policy rules.

## Unit Tests

Current unit tests run with Vitest:

```powershell
npm.cmd test
```

Covered areas:

- Visibility guards for public, unlisted, private, and unpublished content.
- Slug normalization and source-root slug derivation.
- Directory policy longest-prefix matching and file-level overrides.
- Frontmatter parsing and schema validation.
- AI scope parsing and scope checks.
- GitHub webhook signature verification.

Keep new unit tests near the behavior they protect under `tests/`. Use one test file per module or policy area.

## Integration Tests

Add integration tests after database migrations and test database setup exist. Prioritize:

- Prisma repository helpers for content, sync jobs, AI tokens, and audit logs.
- GitHub writeback error mapping for conflict, unauthorized, missing file, and validation failures.
- Sync service behavior for malformed content and incomplete GitHub compare responses.

Use a separate PostgreSQL database for integration tests. Never point tests at production.

## Route Smoke Tests

Route tests should stay focused and avoid full browser setup unless a user flow requires it. Prioritize:

- `/api/health` returns a healthy response without credentials.
- `/api/webhooks/github` rejects missing or invalid signatures.
- `/api/ai/*` rejects missing bearer tokens.
- `/api/ai/content` hides private content without `content:read-private`.
- `/api/ai/content/[id]` routes metadata writes through Git-backed writeback.

Mock GitHub and database boundaries where possible. Use live credentials only in staging smoke checks.

## Visibility Regression Tests

Visibility rules are product-critical. Keep regression coverage for:

- Public content appears in lists, search, sitemap, and RSS.
- Unlisted content is directly readable but absent from public lists and search.
- Private content is unavailable from public surfaces.
- Unpublished content is unavailable from public and direct-read surfaces.
- AI reads include private content only with `content:read-private`.

## Sync Failure Scenarios

Cover sync failure modes before adding a background queue:

- Malformed frontmatter records a sync failure without aborting unrelated content.
- GitHub compare truncation triggers reconciliation.
- Deleted files remove derived content records.
- GitHub API failures mark sync jobs as failed with sanitized errors.
- Writeback conflicts return a 409-style response and do not overwrite upstream changes.

## AI API Authorization Tests

AI API tests should enforce the scope matrix:

| Endpoint | Required scope |
| --- | --- |
| `GET /api/ai/content` | `content:read` |
| `GET /api/ai/content/[id]` | `content:read` |
| `PATCH /api/ai/content/[id]` | `content:write-metadata` |
| `GET /api/ai/search` | `content:read` |
| `POST /api/ai/sync` | `sync:trigger` |
| `GET /api/ai/sync-jobs` | `content:read` |
| `GET /api/ai/audit-logs` | `audit:read` |

All AI actions should create audit records. Write actions should record an audit attempt before performing the side effect.
