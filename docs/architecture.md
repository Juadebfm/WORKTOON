# Assessment coverage

This page maps the assessment criteria to the implemented product. It is written for a reviewer who wants to see where each responsibility lives before opening the code.

## System architecture

```text
Customer or support user
        |
        v
React + Vite frontend
CustomerRequestPage / SupportLoginPage / SupportDashboardPage
        |
        | relative /api requests
        v
Nginx frontend proxy (frontend/nginx.conf)
        |
        v
Express API (backend/src/app.ts)
        |
        v
Refund service (backend/src/refunds/refundService.ts)
   |                 |                  |
   v                 v                  v
Policy rules      AI adapter         SQLite data and audit log
refundPolicy.ts   refundAiService.ts schema.ts / seed.ts
```

The frontend only handles presentation, support-session state, and API calls. The backend owns validation, authentication, order lookup, policy enforcement, AI use, and audit persistence. The policy module stays separate from the AI adapter so an AI response can never override a deterministic policy decision.

## File map

| Area | Files | What they do |
|---|---|---|
| Customer interface | `frontend/src/pages/CustomerRequestPage.tsx` | Collects an order number, email, reason, and description, then shows the decision and whether AI or the policy fallback was used. |
| Support interface | `frontend/src/pages/SupportLoginPage.tsx`, `frontend/src/pages/SupportDashboardPage.tsx`, `frontend/src/features/refunds/RequestDrawer.tsx` | Lets a support reviewer sign in, view recent requests, filter them, and inspect policy and AI audit notes. |
| Frontend boundary | `frontend/src/api/client.ts`, `frontend/src/api/types.ts`, `frontend/src/auth/AuthProvider.tsx` | Keeps API requests, API types, and support-session state outside page components. |
| Reverse proxy | `frontend/nginx.conf` | Serves the built frontend and forwards `/api` requests to the backend container on the same origin. |
| HTTP API | `backend/src/server.ts`, `backend/src/app.ts` | Starts Express and defines health, auth, public refund, and protected support routes. |
| Refund workflow | `backend/src/refunds/refundService.ts` | Looks up the order, detects bypass attempts, applies the policy, requests AI support when allowed, and writes the request plus audit record. |
| Business policy | `backend/src/policy/refundPolicy.ts` | Holds the ordered refund rules independently from HTTP, database, and AI code. |
| AI decision support | `backend/src/ai/refundAiService.ts` | Requests structured AI classification and returns a safe fallback when AI is unavailable, invalid, or unconfigured. |
| Authentication | `backend/src/auth/` | Verifies the seeded support password and manages expiring, hashed bearer-token sessions. |
| Data | `backend/src/db/schema.ts`, `backend/src/db/seed.ts`, `backend/src/db/bootstrapDatabase.ts` | Defines the SQLite schema, creates approximately 15 synthetic customer profiles and their order histories, and seeds once on first start. |
| Container startup | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` | Builds and starts the frontend and backend with persistent SQLite storage through one Docker Compose command. |
| Automated checks | `backend/src/**/*.test.ts`, `frontend` build scripts | Exercise policy decisions, input handling, AI fallback, seed data, and backend API behaviour; the frontend build verifies production compilation. |

## How the implementation meets the assessment criteria

### Full stack execution

`docker compose up --build` starts the complete local product. A customer can submit a refund request from the customer page, receive an `APPROVED`, `DENIED`, or `ESCALATED` result, and then see the saved request in the protected support dashboard. SQLite data persists across ordinary container restarts through the Compose volume.

### AI integration

The AI layer is part of the request workflow, not a separate demo. After order verification and deterministic policy checks, `refundAiService.ts` asks the configured model for structured classification, suspicion flags, and an internal summary. Zod validates the returned structure. The policy remains the final authority: AI can add an escalation signal but cannot turn a denial into an approval. If a private API key is not configured, the same request flow uses a clear policy fallback so the assessment remains runnable.

### Backend quality

The Express API is divided by responsibility: HTTP routes, refund orchestration, policy rules, AI integration, authentication, and database code are separate modules. Zod validates request bodies, SQLite queries bind input as parameters, and refund/audit writes are performed together. Backend tests cover the policy, seed data, AI fallback, and API behaviour.

### Frontend quality

The customer page exposes one focused refund flow. The result is readable, includes the final outcome and explanation, and says whether an AI classification or policy fallback was used. The support area provides a separate login, request list, filters, and a detail drawer for audit notes. Tailwind keeps component styling local without a large standalone stylesheet.

### System architecture

The diagram and file map above show the boundary between frontend, backend, business rules, AI integration, and persistence. The most important boundary is `refundPolicy.ts`: it is pure deterministic logic and does not depend on AI or Express. The refund service coordinates those layers rather than mixing their responsibilities together.

### Product thinking

The product supports both sides of a refund workflow: a customer receives a clear answer, while support staff can review recent requests and see why the result happened. High-value, suspicious, conflicting, unknown-order, and email-mismatch cases are escalated rather than automatically approved. A seeded set of review scenarios makes the main outcomes easy to demonstrate.

### Security awareness

The backend rejects malformed or oversized input, checks that the supplied email belongs to the order, limits public refund and login attempts, and requires an expiring authenticated support session for dashboard data. Prompt-injection and policy-bypass language is detected and escalated before AI assistance. SQL input is parameterized, passwords and support-session tokens are stored as hashes, Helmet adds standard HTTP security headers, and the AI key remains in the backend environment rather than the browser or repository.

### Documentation

[README.md](../README.md) gives copy-and-paste setup instructions, an alternative for Docker Engine users, AI environment setup, demo data, stack choices, architecture, safety notes, and local checks. [Refund policy](refund-policy.md) documents the business rules and their order. This page provides the assessment-to-code map. The remaining submission item is the short video walkthrough; the README includes the required walkthrough checklist.

## Suggested review path

1. Start the app with the README command and submit one of the seeded demo requests.
2. Sign in to `/support/login` using the README demo support account.
3. Open the matching request in the dashboard and inspect its audit details.
4. Read `backend/src/refunds/refundService.ts`, then `backend/src/policy/refundPolicy.ts`, to see the decision flow and policy boundary.
