# Frontend Admin Dashboard Plan

## Goal
Build an internal admin dashboard UI so operators can monitor processing activity, errors, feedback, quota demand, and estimated cost without manually calling API endpoints.

## Why UI Dashboard (vs API-only)
- Faster operational visibility: key metrics and trends are visible at a glance.
- Better incident response: errors and spikes can be spotted quickly.
- Easier non-engineer access: PM/ops can use it without Postman/curl.
- Better decision support: trend charts for feedback, quota, and cost.

## Scope (MVP)
- Single page at `frontend/src/app/admin/page.tsx`.
- Read-only dashboard using existing backend endpoints under `/api/admin/*`.
- Manual refresh + optional short polling for near-real-time metrics.
- Responsive layout for desktop and mobile.

## Data Sources (Current Backend)
- `GET /api/admin/overview`
  - Top KPI cards: uptime, total requests, requests today, avg processing time, errors, cost.
- `GET /api/admin/processing/daily/range?days=30`
  - Daily trend charts: requests, detections, errors, processing time.
- `GET /api/admin/feedback/summary`
  - Feedback totals and recent feedback list.
- `GET /api/admin/quota/summary`
  - Quota request totals, unique emails, recent requests.
- `GET /api/admin/cost/summary?days=30`
  - Cost trend and averages.
- `GET /api/admin/errors/logs?limit=50`
  - Error table (latest first).
- `GET /api/admin/processing/logs?limit=100&offset=0`
  - Recent processing logs table.

## Dashboard Information Architecture
1. Header
- Title: `Admin Dashboard`
- Last updated timestamp
- `Refresh` button
- Time-range selector (`7d`, `30d`, `90d`)

2. KPI Row
- Total requests
- Requests today
- Avg processing time (ms)
- Total detections
- Total errors / errors today
- Total estimated cost / today cost

3. Trend Section
- Daily requests + errors (line chart)
- Daily detections (bar chart)
- Daily cost (line/area chart)

4. Operations Tables
- Recent processing requests (status, image count, blur mode, detections, duration, cost)
- Recent errors (endpoint, error type, status code, message, timestamp)

5. Product Signals
- Feedback by type pie/donut
- Recent feedback list
- Quota request summary + recent requests

## Frontend Technical Plan

### 1) API Client Layer
Extend `frontend/src/lib/api.ts` with typed admin functions:
- `getAdminOverview()`
- `getAdminDailyRange(days: number)`
- `getAdminFeedbackSummary()`
- `getAdminQuotaSummary()`
- `getAdminCostSummary(days: number)`
- `getAdminErrorLogs(limit: number)`
- `getAdminProcessingLogs(limit: number, offset: number)`

Also add TypeScript interfaces matching `backend/app/models/admin_schemas.py`.

### 2) React Query Setup
Use `useQueries` in admin page with shared query key prefix `["admin", ...]`.
- `staleTime`: 30-60s for overview/trends.
- `refetchInterval`: optional 60s for overview and error logs.
- Keep other panels manual refresh to reduce backend load.

### 3) UI Components
Create focused components:
- `AdminKpiCards.tsx`
- `AdminTrends.tsx`
- `AdminProcessingTable.tsx`
- `AdminErrorTable.tsx`
- `AdminFeedbackPanel.tsx`
- `AdminQuotaPanel.tsx`

Keep composition in `admin/page.tsx`; keep rendering components presentational.

### 4) Visualization
Use a chart library already compatible with Next.js client components (e.g. Recharts).
- Requests/errors trend: dual-line chart.
- Detections trend: bar chart.
- Cost trend: line/area chart.
- Feedback type split: donut chart.

### 5) Loading + Error UX
- Per-panel skeleton loading.
- Per-panel retry button when a query fails.
- Non-blocking errors: one failed panel should not break the entire page.

## Security Requirements (Important)
Current admin endpoints are protected by optional API key validation:
- Header: `X-Admin-Key`
- Backend env: `ADMIN_API_KEY`
- If backend key is unset, endpoints stay open for local development.

Before production exposure, keep one of the following enforced:
- Basic Auth on `/api/admin/*` via middleware, or
- API key header check, or
- JWT/session auth for admin users.

Recommended MVP security:
- Backend API key for admin endpoints (`X-Admin-Key`).
- Frontend only renders admin page when key exists in env and sends it server-side or via secured proxy route.
- Do not expose public admin dashboard links without protection.

## Phased Delivery Plan

### Phase 1: MVP Read-Only Dashboard
- Add admin API typings/functions.
- Build `/admin` page with KPI cards + trends + error table.
- Add refresh + date-range selector.
- Add empty/loading/error states.

### Phase 2: Operational Depth
- Add processing logs table with pagination.
- Add feedback and quota panels with recent records.
- Add CSV export buttons for logs and summaries.

### Phase 3: Hardening
- Add authentication/authorization for admin routes.
- Add audit log for admin page access.
- Add backend caching/aggregation if CSV reads become slow.

## Acceptance Criteria
- Admin can see current overview within 2 seconds on local data.
- Dashboard supports `7d/30d/90d` range with correct chart updates.
- Error logs and processing logs are readable and paginated.
- Page remains usable when one endpoint fails.
- Admin endpoints are protected before deployment to public internet.

## Nice-to-Have (After MVP)
- Alert badges for high error rate.
- Outlier detection (spike in processing time or errors).
- Drill-down modal per request ID.
- Compare today vs yesterday metrics.
