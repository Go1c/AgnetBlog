# Ops Testing And Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add test infrastructure, operational documentation, and Zeabur deployment guidance.

**Architecture:** Tests should cover pure logic first, then route-level behavior where cheap. Operational docs should describe how to run, deploy, inspect, and repair the platform.

**Tech Stack:** Vitest if added, Next.js build checks, Zeabur, PostgreSQL, GitHub Webhooks.

---

## Branch

```powershell
git worktree add .worktrees/agent-ops-deploy -b agent/ops-deploy
cd .worktrees/agent-ops-deploy
```

## Owned Files

- Create `vitest.config.ts` if tests are added
- Create `tests/`
- Create `devDoc/2026-04-25-zeabur-deploy-runbook.md`
- Create `devDoc/2026-04-25-testing-strategy.md`
- Modify `README.md`
- Modify `package.json` only for test scripts and test dependencies

## Dependencies

This branch should merge late so it can document real commands and APIs from the other branches.

## Task 1: Test Runner

Add a lightweight test runner if none exists.

Preferred:

```powershell
npm.cmd install --save-dev vitest
```

Add scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

## Task 2: Unit Tests

Add tests for:

- Visibility guards.
- Slug normalization.
- Directory policy longest-prefix resolution.
- Frontmatter validation.
- AI scope checks.
- GitHub webhook signature verification.

Keep tests focused on pure functions where possible.

## Task 3: Build Checks

Document and verify:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

## Task 4: Zeabur Runbook

Create `devDoc/2026-04-25-zeabur-deploy-runbook.md`.

Cover:

- Required services.
- Required env variables.
- PostgreSQL setup.
- GitHub OAuth callback URL.
- GitHub webhook URL.
- Scheduled reconciliation setup.
- Healthcheck route.
- Manual resync.

## Task 5: Testing Strategy

Create `devDoc/2026-04-25-testing-strategy.md`.

Cover:

- Unit tests.
- Integration tests.
- Route smoke tests.
- Visibility regression tests.
- Sync failure scenarios.
- AI API authorization tests.

## Task 6: README Update

Update `README.md`.

Include:

- Local setup.
- Worktree workflow.
- Required commands.
- Environment variable overview.
- Deployment doc links.

## Verification

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

## Handoff

Report:

- Test runner added.
- Test files added.
- Docs added.
- Any checks that require live credentials or Zeabur access.
