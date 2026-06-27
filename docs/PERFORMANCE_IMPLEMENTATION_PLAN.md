# ThinkTanker CRM — Performance Optimization Implementation Plan

**Author:** Senior Performance Engineering Review
**Date:** 2026-06-27
**Scope:** Full-stack — Express/MongoDB backend + React/Redux frontend

---

## Priority Matrix

| ID | Severity | Layer | Issue | Estimated Gain |
|---|---|---|---|---|
| PERF-1 | 🔴 CRITICAL | DB | `getScopedLeadIds` loads full lead IDs into heap | -80% memory on reports |
| PERF-2 | 🔴 CRITICAL | DB | Missing `.lean()` + `.select()` on export queries | -70% heap, -60% latency |
| PERF-3 | 🟠 HIGH | DB | Duplicate `User.find` on dashboard | -1 DB round trip/request |
| PERF-4 | 🔴 CRITICAL | DB | Unindexed `$lookup` on activities (O(n×m)) | -90% on `hotNoMeeting` |
| PERF-5 | 🟠 HIGH | DB | Missing `allowDiskUse` on $facet aggregation | Prevents OOM crash at scale |
| PERF-7 | 🟠 HIGH | Infra | No HTTP compression | -75% response size |
| PERF-8 | 🟠 HIGH | Infra | No caching on analytics | -80% DB load for same tenant |
| PERF-9 | 🟡 MODERATE | Frontend | No Vite build optimization | -40% initial JS bundle |
| PERF-10 | 🟡 MODERATE | Frontend | O(n) findIndex on Redux updates | O(1) with entity adapter |
| PERF-11 | 🟡 MODERATE | Frontend | MainLayout lazy-loaded (layout shift) | Eliminates layout flash |

---

## Phase 1: Database Layer (Week 1)

### 1.1 Fix `getScopedLeadIds` — stream ObjectIds, not strings
- **File:** `backend/src/services/reports.service.ts`
- **Change:** Return `mongoose.Types.ObjectId[]` directly without converting to string.
  - Pass ObjectIds directly to `$in` queries (MongoDB is more efficient with native BSON types)
  - Long-term: replace with aggregation `$lookup` to avoid loading IDs into memory at all
- **Impact:** Removes O(n) string conversion; reduces payload in `$in` queries

### 1.2 Add `.lean()` + `.select()` to all export queries
- **Files:** `reports.service.ts` — `getWonDealRows`, `getLostDealRows`, `getLeadRegisterExportRows`, `getCompanyRegisterRows`
- **Change:** Chain `.lean()` to return plain JS objects; add `.select()` for only the fields mapped in the output
- **Impact:** 5–10× memory reduction on large exports; 2–3× query speed improvement

### 1.3 Add compound index on `activities.relatedTo.id + activityType`
- **File:** `backend/src/models/activity.model.ts`
- **Change:** Add `activitySchema.index({ 'relatedTo.id': 1, activityType: 1, tenantId: 1 })`
- **Impact:** Converts O(n×m) `$lookup` scan to O(log n) indexed lookup

### 1.4 Add `allowDiskUse: true` to dashboard aggregation
- **File:** `backend/src/services/analytics.service.ts`
- **Change:** Pass `{ allowDiskUse: true }` to `Lead.aggregate([...])` calls
- **Impact:** Prevents OOM crash when tenant has >100k leads

### 1.5 Deduplicate `User.find` team member lookup
- **File:** `backend/src/utils/ownerFilters.ts`
- **Change:** Extract `buildTeamMemberIds(req)` helper; both filter builders call it once via memoization
- **Impact:** -1 DB round trip per dashboard request under Manager scope

---

## Phase 2: HTTP Infrastructure (Week 1–2)

### 2.1 Add compression middleware to Express
- **File:** `backend/src/app.ts`
- **Package:** `compression` (already available in express ecosystem)
- **Change:** `app.use(compression())` before routes
- **Impact:** -70–80% response payload size for JSON APIs

### 2.2 Add `Cache-Control` headers to analytics/reports endpoints
- **File:** `backend/src/routes/analytics.routes.ts`, `backend/src/routes/reports.routes.ts`
- **Change:** Middleware that sets `Cache-Control: private, max-age=30` on GET endpoints
- **Impact:** Browser-side caching eliminates repeat API calls for same data

---

## Phase 3: Frontend Build Optimization (Week 2)

### 3.1 Add Vite manual chunk splitting
- **File:** `frontend/vite.config.ts`
- **Change:**
  ```ts
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          'vendor-tiptap': ['@tiptap/react', '@tiptap/starter-kit', ...],
          'vendor-utils': ['axios', 'date-fns', 'zod', 'dompurify'],
        }
      }
    }
  }
  ```
- **Impact:** Tiptap chunk (~200KB) only loads on proposal pages; React chunk is cached across deploys

### 3.2 Normalize Redux leads state with entity adapter
- **File:** `frontend/src/store/slices/leadSlice.ts`
- **Change:** Use `createEntityAdapter()` from RTK for O(1) lookup by ID
- **Impact:** Eliminates O(n) `findIndex` scan on every lead update

### 3.3 Eagerly import MainLayout
- **File:** `frontend/src/App.tsx`
- **Change:** Remove `lazy()` wrapper from `MainLayout` import
- **Impact:** Eliminates layout shell flash on every page navigation

### 3.4 Add `staleTime` concept via Redux selectors + timestamps
- **Files:** All Redux slices
- **Change:** Add `lastFetchedAt: number` to each slice; skip fetch if `Date.now() - lastFetchedAt < STALE_MS`
- **Impact:** Navigating between pages stops triggering unnecessary API calls

---

## Phase 4: Scalability (Week 3+)

### 4.1 Move dashboard aggregation to a scheduled background job
- For high-traffic tenants, pre-compute dashboard data every 60s via `QueueService`
- Store in a `DashboardCache` MongoDB collection with TTL index
- Dashboard endpoint reads from cache; cache miss triggers re-compute

### 4.2 Introduce Redis for distributed caching
- Replace in-process `userCache` and `permissionCache` Maps with Redis
- Ensures cache consistency across multiple Node.js instances (horizontal scaling)
- `ioredis` client with automatic serialization

### 4.3 MongoDB connection pool tuning
- Default Mongoose pool size is 5. Set `mongoose.connect(uri, { maxPoolSize: 20, minPoolSize: 5 })`
- Add `serverSelectionTimeoutMS: 5000`, `heartbeatFrequencyMS: 10000`

### 4.4 Paginate large report exports with cursor streaming
- Instead of `Lead.find(filter)` loading 10k docs → `Lead.find(filter).cursor()` + streaming response
- Use `res.write()` in chunks instead of `res.json()` for export endpoints

---

## Scalability Recommendations

### Horizontal Scaling Prerequisites
1. **Session state:** Current `userCache` and `permissionCache` are in-process Maps.
   With multiple Node.js instances behind a load balancer, each instance has its own cache.
   A user authenticated on instance A will re-fetch from DB on instance B. → **Migrate to Redis.**

2. **QueueService:** In-memory queue using `setImmediate`/`setTimeout` means jobs are lost on restart.
   For multi-instance deployments → **BullMQ + Redis** for persistent, distributed job queues.

3. **Analytics aggregation under load:** At 10k concurrent users, 100 dashboard loads/second means
   100 full `$facet` aggregations/second. MongoDB can handle ~10–20 heavy aggregations/second.
   → **Pre-compute with TTL caching** (Phase 4.1).

### Database Index Audit (Missing Indexes)
```
activities: { 'relatedTo.id': 1, activityType: 1, tenantId: 1 }  ← CRITICAL missing
tasks:      { tenantId: 1, dueDate: 1, status: 1 }               ← needed for overdue filter
tasks:      { tenantId: 1, assignedTo: 1, status: 1 }            ← needed for owner filter
companies:  { tenantId: 1, status: 1, industry: 1 }              ← needed for reports filter
```

---

## Implementation Checklist

- [ ] PERF-1: `getScopedLeadIds` — ObjectId array, not string array
- [ ] PERF-2: `.lean()` + `.select()` on all 4 export functions
- [ ] PERF-3: Deduplicate `User.find` in owner filter builders
- [ ] PERF-4: Add index `{ 'relatedTo.id': 1, activityType: 1, tenantId: 1 }` on Activity
- [ ] PERF-5: Add `allowDiskUse: true` to dashboard aggregation
- [ ] PERF-7: Add `compression` middleware to Express
- [ ] PERF-8: Add `Cache-Control` headers on analytics routes
- [ ] PERF-9: Vite `manualChunks` for vendor splitting
- [ ] PERF-10: Normalize Redux leads with `createEntityAdapter`
- [ ] PERF-11: Eagerly import `MainLayout`
