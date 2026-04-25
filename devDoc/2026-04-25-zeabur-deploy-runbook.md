# Zeabur Deploy Runbook

This runbook covers the current Next.js, Prisma, GitHub sync, admin, and AI API stack.

## Services

Create two Zeabur services:

- A Node.js web service for the Next.js app.
- A PostgreSQL service for Prisma.

Use Node.js 20 or newer. The app reads all runtime configuration from environment variables.

## Build And Start

Use these commands in Zeabur:

```bash
npm install
npm run db:generate
npm run build
npm run start
```

Run the database schema push once before the first production start, and again after schema changes:

```bash
npx prisma db push
```

This repository does not yet contain Prisma migration files. Treat `prisma/schema.prisma` as the deploy schema until migrations are added.

## Environment Variables

Set these variables on the web service:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public site origin, for example `https://blog.example.com`. |
| `DATABASE_URL` | PostgreSQL connection string from the Zeabur PostgreSQL service. |
| `AUTH_SECRET` | NextAuth signing secret. Generate a long random value. |
| `AUTH_GITHUB_ID` | GitHub OAuth app client ID. |
| `AUTH_GITHUB_SECRET` | GitHub OAuth app client secret. |
| `ADMIN_GITHUB_LOGINS` | Comma or whitespace separated allowlist of GitHub logins. |
| `GITHUB_NOTES_OWNER` | GitHub owner for the source notes repository. |
| `GITHUB_NOTES_REPO` | GitHub repository name for source notes. |
| `GITHUB_NOTES_BRANCH` | Source branch. Defaults to `main`. |
| `GITHUB_WRITE_TOKEN` | Token used for GitHub read, sync, and metadata writeback. |
| `GITHUB_WEBHOOK_SECRET` | Shared secret for GitHub push webhooks. |
| `AI_TOKEN_PEPPER` | Secret pepper for hashing AI bearer tokens. |
| `SYNC_RECONCILE_CRON` | Desired reconciliation schedule. Use it to configure Zeabur or external cron. |

Never reuse `AUTH_SECRET`, `GITHUB_WEBHOOK_SECRET`, or `AI_TOKEN_PEPPER` across environments.

## PostgreSQL Setup

1. Create the PostgreSQL service in Zeabur.
2. Copy its connection string into `DATABASE_URL`.
3. Run `npx prisma db push` from a Zeabur shell or a trusted deployment step.
4. Run `npm run db:generate` before building.

The database stores derived indexes, sync jobs, AI token hashes, and audit logs. Markdown frontmatter in GitHub remains the source of truth for publishing metadata.

## GitHub OAuth

Create a GitHub OAuth app with this callback URL:

```text
https://<your-domain>/api/auth/callback/github
```

Set the OAuth app's client ID and secret in `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`. Add admin GitHub logins to `ADMIN_GITHUB_LOGINS`.

## GitHub Webhook

Create a webhook on the notes repository:

- Payload URL: `https://<your-domain>/api/webhooks/github`
- Content type: `application/json`
- Secret: the value of `GITHUB_WEBHOOK_SECRET`
- Events: `push`

The webhook route verifies `x-hub-signature-256`, creates a sync job, and runs incremental sync inline. If GitHub compare output is incomplete, the sync service falls back to reconciliation.

## Scheduled Reconciliation

Use Zeabur scheduled jobs or an external cron service to call the AI sync endpoint:

```bash
curl -X POST https://<your-domain>/api/ai/sync \
  -H "Authorization: Bearer <ai-token-with-sync:trigger>" \
  -H "Content-Type: application/json" \
  -d '{"mode":"reconcile"}'
```

Create that AI token in `/admin/ai-tokens` with the `sync:trigger` scope. Keep the raw token in the cron provider's secret storage.

## Healthcheck

Use this route for platform health checks:

```text
GET /api/health
```

Use this route for authenticated admin health checks:

```text
GET /api/admin/health
```

The admin route requires a valid admin session.

## Manual Resync

Admins can trigger sync through:

```text
POST /api/admin/sync
```

AI clients can trigger sync through:

```text
POST /api/ai/sync
```

Use `{"mode":"reconcile"}` for a full reconciliation. Use `{"mode":"incremental","before":"<sha>","after":"<sha>"}` for an incremental run.

## Operational Checks

Run these checks before deploying a branch:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Checks that contact GitHub, PostgreSQL, OAuth, or Zeabur require live credentials and should run in a staging environment.
