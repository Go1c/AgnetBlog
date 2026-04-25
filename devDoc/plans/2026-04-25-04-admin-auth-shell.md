# Admin Auth And Shell Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add GitHub OAuth admin authentication and a protected admin shell.

**Architecture:** Auth.js handles GitHub OAuth. Server-side guards protect `/admin` and `/api/admin/*`; v1 supports only allowlisted GitHub logins as admins.

**Tech Stack:** Next.js App Router, Auth.js, GitHub OAuth, TypeScript.

---

## Branch

```powershell
git worktree add .worktrees/agent-admin-auth -b agent/admin-auth
cd .worktrees/agent-admin-auth
```

## Owned Files

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
- Modify `.env.example` only for auth variables if needed

## Dependencies

This branch can start from baseline. If `agent/db-prisma` has merged, store or read admin users there only if it does not delay the auth shell.

## Task 1: Auth Configuration

Create Auth.js configuration for GitHub OAuth.

Use env variables:

- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `ADMIN_GITHUB_LOGINS`

Do not allow any GitHub user by default.

## Task 2: Admin Guard

Create `lib/auth/admin.ts`.

Required behavior:

- Read the current session.
- Compare GitHub login against `ADMIN_GITHUB_LOGINS`.
- Return a typed admin actor for allowed users.
- Return unauthorized state for everyone else.

## Task 3: Protected Routes

Protect:

- `/admin`
- `/admin/*`
- `/api/admin/*`

Use middleware or server-side guards. Prefer explicit server-side guards if middleware compatibility becomes unclear.

## Task 4: Admin Pages

Create placeholder pages:

- `/admin/content`
- `/admin/sync-jobs`
- `/admin/directory-policies`
- `/admin/ai-tokens`

Each page should state what data it will show after dependent branches merge.

## Task 5: Admin Health API

Create `app/api/admin/health/route.ts`.

Behavior:

- Return `200` with admin identity for authorized admins.
- Return `401` or `403` for unauthorized users.

## Verification

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Manual checks:

```txt
/admin
/api/admin/health
/api/auth/signin
```

## Handoff

Report:

- Exact auth env variables.
- Whether protection is middleware-based or server-guard-based.
- Any pages left as placeholders.
