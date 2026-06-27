# Security, Testing, and Release Maturity Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce strict local `dev`, `test`, and `release` discipline with stronger environment validation, safer fallback behavior, deeper auth/report integration confidence, and enforceable release evidence.

**Architecture:** The implementation adds a runtime-mode layer on top of the existing backend bootstrap/config flow, isolates databases by environment, expands backend integration/unit verification, and tightens release scripts and documentation without changing the product feature set. The frontend role in this phase is limited to regression confidence around auth/session behavior and release gating support.

**Tech Stack:** Node.js, TypeScript, Express, Mongoose, Vitest, custom backend test harness, Vite

---

## File Structure

### Backend files to modify

- `backend/src/config/env.ts`
  - add stricter typed environment validation and runtime mode awareness
- `backend/src/config/runtime.ts`
  - centralize mode/fallback gating rules
- `backend/src/config/database.ts`
  - ensure isolated DB connection expectations are compatible with mode rules
- `backend/src/server.ts`
  - enforce startup behavior for `dev`, `test`, and `release`
- `backend/src/tests/integration.ts`
  - normalize execution against `TEST_MONGODB_URI`
- `backend/src/tests/run.ts`
  - register new unit suites where added
- `backend/package.json`
  - add explicit scripts for release validation and environment-aware checks

### Backend files to create

- `backend/src/config/mode.ts`
  - runtime mode parser and helpers
- `backend/src/config/validateRuntime.ts`
  - fail-fast release/test env validation
- `backend/src/tests/runtime-config.test.ts`
  - unit coverage for mode and env validation behavior
- `backend/src/tests/auth.integration.assertions.ts`
  - helper assertions for auth/session integration checks if needed
- `backend/.env.dev.example`
  - dev-mode local example
- `backend/.env.test.example`
  - isolated test-mode example
- `backend/.env.release.example`
  - release-mode local example

### Frontend files to modify

- `frontend/package.json`
  - add stricter release-oriented verification command(s)
- `frontend/src/test/auth-routing.test.tsx`
  - extend auth/session coverage if gaps remain
- `frontend/src/test/auth-logout.test.ts`
  - keep logout/session invalidation protected during hardening

### Documentation files to modify

- `documentation/RELEASE_READY_CHECKLIST_2026-05-26.md`
- `documentation/SECURITY_RELEASE_CHECKLIST.md`
- `documentation/DEPLOYMENT_RUNBOOK.md`
- `documentation/ENGINEERING_STANDARDS.md`

### Optional root-level support files to create

- `.env.dev.example`
- `.env.test.example`
- `.env.release.example`

Only create root examples if the repo already relies on root-level orchestration for local startup.

---

### Task 1: Add Runtime Mode Model And Failing Validation Tests

**Files:**
- Create: `backend/src/config/mode.ts`
- Create: `backend/src/config/validateRuntime.ts`
- Create: `backend/src/tests/runtime-config.test.ts`
- Modify: `backend/src/tests/run.ts`
- Test: `backend/src/tests/runtime-config.test.ts`

- [ ] **Step 1: Write the failing runtime-mode unit tests**

```ts
// backend/src/tests/runtime-config.test.ts
import { suite, test, expectThrows, expectEqual } from './framework';
import { parseRuntimeMode, shouldAllowDevOffline } from '../config/mode';
import { validateRuntimeConfig } from '../config/validateRuntime';

export const runtimeConfigSuite = suite('runtime config', [
  test('defaults to dev mode when unset', () => {
    expectEqual(parseRuntimeMode(undefined), 'dev');
  }),
  test('rejects unsupported runtime modes', () => {
    expectThrows(() => parseRuntimeMode('staging-ish'), /Unsupported runtime mode/);
  }),
  test('release mode requires mongo and jwt secrets', () => {
    expectThrows(
      () => validateRuntimeConfig({
        NODE_ENV: 'production',
        RUNTIME_MODE: 'release',
        MONGODB_URI: '',
        JWT_SECRET: '',
      }),
      /Missing required environment/
    );
  }),
  test('dev offline is blocked outside dev mode', () => {
    expectEqual(
      shouldAllowDevOffline({ runtimeMode: 'release', allowDevOffline: true, nodeEnv: 'production' }),
      false
    );
  }),
]);
```

- [ ] **Step 2: Register the failing suite**

```ts
// backend/src/tests/run.ts
import { runtimeConfigSuite } from './runtime-config.test';

const suites: TestSuite[] = [
  queryFiltersSuite,
  permissionsSuite,
  reportsServiceSuite,
  runtimeConfigSuite,
];
```

- [ ] **Step 3: Run backend unit tests to verify failure**

Run:

```powershell
cd backend
npm run test:unit
```

Expected:
- fail because `mode.ts` and `validateRuntime.ts` do not exist yet

- [ ] **Step 4: Write minimal runtime mode implementation**

```ts
// backend/src/config/mode.ts
export type RuntimeMode = 'dev' | 'test' | 'release';

export const parseRuntimeMode = (value: string | undefined): RuntimeMode => {
  const normalized = (value || 'dev').trim().toLowerCase();
  if (normalized === 'dev' || normalized === 'test' || normalized === 'release') {
    return normalized;
  }
  throw new Error(`Unsupported runtime mode: ${value}`);
};

export const shouldAllowDevOffline = ({
  runtimeMode,
  allowDevOffline,
  nodeEnv,
}: {
  runtimeMode: RuntimeMode;
  allowDevOffline: boolean;
  nodeEnv: string;
}) => runtimeMode === 'dev' && nodeEnv === 'development' && allowDevOffline;
```

```ts
// backend/src/config/validateRuntime.ts
import { parseRuntimeMode } from './mode';

type RuntimeEnv = {
  NODE_ENV?: string;
  RUNTIME_MODE?: string;
  MONGODB_URI?: string;
  TEST_MONGODB_URI?: string;
  JWT_SECRET?: string;
};

export const validateRuntimeConfig = (env: RuntimeEnv) => {
  const runtimeMode = parseRuntimeMode(env.RUNTIME_MODE);
  const required = runtimeMode === 'test'
    ? ['TEST_MONGODB_URI', 'JWT_SECRET']
    : runtimeMode === 'release'
      ? ['MONGODB_URI', 'JWT_SECRET']
      : [];

  for (const key of required) {
    if (!env[key as keyof RuntimeEnv] || !String(env[key as keyof RuntimeEnv]).trim()) {
      throw new Error(`Missing required environment: ${key}`);
    }
  }

  return { runtimeMode };
};
```

- [ ] **Step 5: Run backend unit tests to verify pass**

Run:

```powershell
cd backend
npm run test:unit
```

Expected:
- runtime config suite passes

- [ ] **Step 6: Commit**

```bash
git add backend/src/config/mode.ts backend/src/config/validateRuntime.ts backend/src/tests/runtime-config.test.ts backend/src/tests/run.ts
git commit -m "test: add runtime mode validation coverage"
```

---

### Task 2: Wire Runtime Modes Into Backend Startup

**Files:**
- Modify: `backend/src/config/runtime.ts`
- Modify: `backend/src/config/env.ts`
- Modify: `backend/src/server.ts`
- Modify: `backend/src/config/database.ts`
- Test: `backend/src/tests/runtime-config.test.ts`

- [ ] **Step 1: Add failing assertions for release-mode fallback behavior**

```ts
// backend/src/tests/runtime-config.test.ts
test('release mode never allows offline fallback', () => {
  expectEqual(
    shouldAllowDevOffline({ runtimeMode: 'release', allowDevOffline: true, nodeEnv: 'development' }),
    false
  );
});
```

- [ ] **Step 2: Run backend unit tests to verify failure if behavior is not yet wired**

Run:

```powershell
cd backend
npm run test:unit
```

Expected:
- fail if current runtime logic still depends only on `NODE_ENV`

- [ ] **Step 3: Update runtime config to use explicit runtime mode**

```ts
// backend/src/config/runtime.ts
import mongoose from 'mongoose';
import { parseRuntimeMode, shouldAllowDevOffline } from './mode';

let databaseReady = false;

const runtimeMode = parseRuntimeMode(process.env.RUNTIME_MODE);
const offlineFlag = () => String(process.env.ALLOW_DEV_OFFLINE || 'true').toLowerCase() !== 'false';

export const setDatabaseReady = (ready: boolean) => {
  databaseReady = ready;
};

export const isDatabaseReady = () => databaseReady && mongoose.connection.readyState === 1;

export const canUseOfflineMode = () =>
  shouldAllowDevOffline({
    runtimeMode,
    allowDevOffline: offlineFlag(),
    nodeEnv: process.env.NODE_ENV || 'development',
  }) && !isDatabaseReady();
```

- [ ] **Step 4: Fail fast at startup for invalid release/test config**

```ts
// backend/src/server.ts
import { validateRuntimeConfig } from './config/validateRuntime';

validateRuntimeConfig({
  NODE_ENV: process.env.NODE_ENV,
  RUNTIME_MODE: process.env.RUNTIME_MODE,
  MONGODB_URI: process.env.MONGODB_URI,
  TEST_MONGODB_URI: process.env.TEST_MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
});
```

- [ ] **Step 5: Add explicit env exports in env parsing layer**

```ts
// backend/src/config/env.ts
export const env = {
  // existing values...
  RUNTIME_MODE: process.env.RUNTIME_MODE || 'dev',
  TEST_MONGODB_URI: process.env.TEST_MONGODB_URI || '',
};
```

- [ ] **Step 6: Run backend build and unit tests**

Run:

```powershell
cd backend
npm run build
npm run test:unit
```

Expected:
- build passes
- unit suite passes

- [ ] **Step 7: Commit**

```bash
git add backend/src/config/runtime.ts backend/src/config/env.ts backend/src/server.ts backend/src/config/database.ts
git commit -m "feat: enforce runtime mode startup rules"
```

---

### Task 3: Isolate Local Dev/Test/Release Environment Files

**Files:**
- Create: `backend/.env.dev.example`
- Create: `backend/.env.test.example`
- Create: `backend/.env.release.example`
- Modify: `backend/package.json`
- Modify: `documentation/DEPLOYMENT_RUNBOOK.md`
- Test: manual env-mode smoke

- [ ] **Step 1: Write explicit environment example files**

```env
# backend/.env.dev.example
NODE_ENV=development
RUNTIME_MODE=dev
MONGODB_URI=mongodb://127.0.0.1:27017/thinktanker_dev
JWT_SECRET=replace-with-dev-secret
ALLOW_DEV_OFFLINE=true
```

```env
# backend/.env.test.example
NODE_ENV=test
RUNTIME_MODE=test
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/thinktanker_test
JWT_SECRET=replace-with-test-secret
ALLOW_DEV_OFFLINE=false
```

```env
# backend/.env.release.example
NODE_ENV=production
RUNTIME_MODE=release
MONGODB_URI=mongodb://127.0.0.1:27017/thinktanker_release
JWT_SECRET=replace-with-release-secret
ALLOW_DEV_OFFLINE=false
```

- [ ] **Step 2: Add mode-aware backend scripts**

```json
// backend/package.json
{
  "scripts": {
    "start:release-check": "set NODE_ENV=production&& set RUNTIME_MODE=release&& node dist/server.js",
    "test:integration:strict": "set NODE_ENV=test&& set RUNTIME_MODE=test&& ts-node src/tests/integration.ts"
  }
}
```

- [ ] **Step 3: Run backend build and verify scripts resolve**

Run:

```powershell
cd backend
npm run build
npm run test:integration:strict
```

Expected:
- build passes
- integration harness runs and either executes or safely skips only when `TEST_MONGODB_URI` is intentionally absent

- [ ] **Step 4: Update runbook with explicit DB names and mode expectations**

```md
## Local Runtime Modes

- `dev` -> `thinktanker_dev`
- `test` -> `thinktanker_test`
- `release` -> `thinktanker_release`

`release` mode must not run with `ALLOW_DEV_OFFLINE=true`.
```

- [ ] **Step 5: Commit**

```bash
git add backend/.env.dev.example backend/.env.test.example backend/.env.release.example backend/package.json documentation/DEPLOYMENT_RUNBOOK.md
git commit -m "docs: define isolated local runtime environments"
```

---

### Task 4: Deepen Auth And Permission Integration Checks

**Files:**
- Modify: `backend/src/tests/integration.ts`
- Create: `backend/src/tests/auth.integration.assertions.ts`
- Modify: `backend/src/middleware/auth.middleware.ts` only if required by failing tests
- Test: `backend/src/tests/integration.ts`

- [ ] **Step 1: Add failing integration assertions for release-grade auth confidence**

```ts
// backend/src/tests/auth.integration.assertions.ts
import assert from 'node:assert/strict';

export const assertUnauthorized = (status: number) => {
  assert.strictEqual(status, 401);
};

export const assertForbidden = (status: number) => {
  assert.strictEqual(status, 403);
};
```

```ts
// backend/src/tests/integration.ts
const revokedAccess = await requestJson('/api/v1/users', { token: revokedToken });
assertUnauthorized(revokedAccess.status);
```

- [ ] **Step 2: Run integration tests to verify failure if coverage is not yet present**

Run:

```powershell
cd backend
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27017/thinktanker_test'
npm run test:integration:strict
```

Expected:
- fail until new assertions and any required runtime handling are implemented

- [ ] **Step 3: Extend integration flow for auth, logout, revocation, and permission scope**

```ts
// backend/src/tests/integration.ts
// add checks for:
// 1. protected route without token -> 401
// 2. manager hitting admin-only route -> 403
// 3. revoked token reuse -> 401
// 4. tenant-scoped report route excludes other-tenant data
```

- [ ] **Step 4: Run integration tests to verify pass**

Run:

```powershell
cd backend
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27017/thinktanker_test'
npm run test:integration:strict
```

Expected:
- integration suite passes fully against `thinktanker_test`

- [ ] **Step 5: Commit**

```bash
git add backend/src/tests/integration.ts backend/src/tests/auth.integration.assertions.ts
git commit -m "test: strengthen auth and permission integration coverage"
```

---

### Task 5: Expand Frontend Auth/Session Regression Confidence

**Files:**
- Modify: `frontend/src/test/auth-routing.test.tsx`
- Modify: `frontend/src/test/auth-logout.test.ts`
- Modify: `frontend/package.json`
- Test: frontend auth tests

- [ ] **Step 1: Add failing auth/session regression expectations**

```ts
// frontend/src/test/auth-routing.test.tsx
it('redirects unauthenticated users away from protected routes', async () => {
  // render protected route with logged-out store
  // expect login screen or redirect target
});
```

```ts
// frontend/src/test/auth-logout.test.ts
it('clears client auth state after protected logout completes', async () => {
  // mock protected logout success
  // assert token/user cleanup
});
```

- [ ] **Step 2: Run frontend regression suite to verify failure if assumptions are wrong**

Run:

```powershell
cd frontend
npm run test:run
```

Expected:
- auth tests fail until updated to reflect strict session behavior

- [ ] **Step 3: Implement minimal test/store setup changes**

```ts
// example direction only within the actual files:
// - ensure protected route wrapper is rendered
// - ensure logout thunk expectations include auth header behavior
// - ensure redirect assertions wait for async route resolution
```

- [ ] **Step 4: Run frontend tests and build**

Run:

```powershell
cd frontend
npm run test:run
npm run build
```

Expected:
- tests pass
- build passes

- [ ] **Step 5: Commit**

```bash
git add frontend/src/test/auth-routing.test.tsx frontend/src/test/auth-logout.test.ts frontend/package.json
git commit -m "test: harden frontend auth regression coverage"
```

---

### Task 6: Enforce Release Evidence In Documentation And Scripts

**Files:**
- Modify: `documentation/RELEASE_READY_CHECKLIST_2026-05-26.md`
- Modify: `documentation/SECURITY_RELEASE_CHECKLIST.md`
- Modify: `documentation/ENGINEERING_STANDARDS.md`
- Modify: `backend/package.json`
- Modify: `frontend/package.json`

- [ ] **Step 1: Add explicit release verification command chain**

```json
// backend/package.json
{
  "scripts": {
    "verify:release": "npm run build && npm run test:unit && npm run test:integration:strict"
  }
}
```

```json
// frontend/package.json
{
  "scripts": {
    "verify:release": "npm run build && npm run test:run"
  }
}
```

- [ ] **Step 2: Tighten release checklist language from recommendation to requirement**

```md
- [ ] `backend verify:release` passed against release-safe configuration
- [ ] `frontend verify:release` passed
- [ ] `TEST_MONGODB_URI` evidence captured for latest integration run
- [ ] release mode confirms `database=connected`
- [ ] release mode confirms offline fallback is disabled
```

- [ ] **Step 3: Tighten security release checklist**

```md
- `RUNTIME_MODE=release` used during final local release validation
- `ALLOW_DEV_OFFLINE=false` confirmed in release mode
- integration evidence attached for auth and protected-route validation
```

- [ ] **Step 4: Update engineering standards to make release verification mandatory**

```md
### Release Enforcement

Required local release evidence:
- frontend `verify:release`
- backend `verify:release`
- connected health check in release mode
- integration run against isolated test DB
```

- [ ] **Step 5: Run both release verification chains**

Run:

```powershell
cd backend
npm run verify:release
```

```powershell
cd frontend
npm run verify:release
```

Expected:
- both pass

- [ ] **Step 6: Commit**

```bash
git add documentation/RELEASE_READY_CHECKLIST_2026-05-26.md documentation/SECURITY_RELEASE_CHECKLIST.md documentation/ENGINEERING_STANDARDS.md backend/package.json frontend/package.json
git commit -m "docs: enforce release verification evidence"
```

---

### Task 7: Final Local Release Validation

**Files:**
- Modify: `documentation/RELEASE_READY_CHECKLIST_2026-05-26.md`
- Modify: `SMOKE_TEST_REPORT_2026-05-25.md` only if revalidated
- Test: backend health, release-mode startup, frontend/backend verification scripts

- [ ] **Step 1: Start backend in release mode against `thinktanker_release`**

Run:

```powershell
cd backend
$env:NODE_ENV='production'
$env:RUNTIME_MODE='release'
$env:MONGODB_URI='mongodb://127.0.0.1:27017/thinktanker_release'
$env:JWT_SECRET='replace-with-release-secret'
$env:ALLOW_DEV_OFFLINE='false'
node dist/server.js
```

Expected:
- server starts cleanly
- no offline fallback log appears

- [ ] **Step 2: Verify health endpoint**

Run:

```powershell
Invoke-RestMethod -Uri 'http://localhost:5000/health'
```

Expected:
- `status = ok`
- `database = connected`

- [ ] **Step 3: Re-run release verification scripts**

Run:

```powershell
cd backend
npm run verify:release
cd ../frontend
npm run verify:release
```

Expected:
- all release verification commands pass

- [ ] **Step 4: Record evidence in release checklist**

```md
| Backend release verification | Ready | `npm run verify:release` passed against isolated mode |
| Frontend release verification | Ready | `npm run verify:release` passed |
| Release-mode health | Ready | `database=connected`, offline fallback disabled |
```

- [ ] **Step 5: Commit**

```bash
git add documentation/RELEASE_READY_CHECKLIST_2026-05-26.md SMOKE_TEST_REPORT_2026-05-25.md
git commit -m "chore: record release-mode verification evidence"
```

---

## Self-Review

### Spec coverage

- environment separation: covered by Tasks 1, 2, 3
- strict startup validation: covered by Tasks 1 and 2
- fallback restriction: covered by Task 2
- auth/permission hardening: covered by Task 4 and Task 5
- integration execution path: covered by Task 3 and Task 4
- release evidence tightening: covered by Task 6 and Task 7

No spec sections are uncovered.

### Placeholder scan

- no `TBD`
- no `TODO`
- no “implement later”
- every task includes explicit file paths and commands

### Type consistency

- runtime mode names are consistent: `dev`, `test`, `release`
- database names are consistent: `thinktanker_dev`, `thinktanker_test`, `thinktanker_release`
- validation helpers are consistently named around `parseRuntimeMode`, `shouldAllowDevOffline`, and `validateRuntimeConfig`

## Execution Handoff

Plan complete and saved to [2026-05-28-security-testing-release-upgrade.md](/D:/BD/Ankush/AI%20Project%20creation/AI%20Project%20creation/New%20project/docs/superpowers/plans/2026-05-28-security-testing-release-upgrade.md).

Two execution options:

1. `Subagent-Driven (recommended)` - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. `Inline Execution` - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach? 
