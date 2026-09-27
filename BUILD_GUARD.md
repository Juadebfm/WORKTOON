# Build Guard — AI-Powered Refund Support Assessment

This is the source of truth for scope and technical decisions while building the assessment. A change that adds a dependency, service, or workflow must be rejected unless it directly supports an explicit assessment requirement or a documented safety control.

## Product boundary

Build a local, containerized demonstration of an e-commerce refund-support workflow:

- A customer submits a refund request for a seeded order.
- The server retrieves mock customer and order data.
- A deterministic refund-policy engine returns `APPROVED`, `DENIED`, or `ESCALATED`.
- AI assists with classifying the stated reason, flagging suspicious content, and drafting a customer-safe explanation. It cannot override the policy engine.
- A support dashboard shows submitted requests, decisions, and audit notes.
- The support dashboard requires a short-lived session for a seeded support user.

Out of scope: customer registration, password recovery, payments, refunds being sent to a payment provider, real CRM integrations, email delivery, background jobs, queues, multi-region deployment, and a general-purpose AI agent.

## Repository layout: one submission repository, not a managed monorepo

Use one public GitHub repository because the assessor needs one cloneable submission containing the Compose file and all source code. Keep its projects independent:

```text
/
  frontend/          # its own package.json and lockfile
  backend/           # its own package.json and lockfile
  docker-compose.yml
  README.md
  BUILD_GUARD.md
```

Do **not** use npm/pnpm/yarn workspaces, Turborepo, Nx, a shared-package build, or release tooling. Run frontend and backend commands from their respective folders; Docker Compose coordinates them only for the reviewer. Duplicate a small TypeScript API type if sharing it would require build tooling. This is deliberately less clever and easier to explain.

## Chosen lightweight stack

| Concern | Choice | Reason |
|---|---|---|
| Language | TypeScript | One language across browser and server; types can be shared for request/response contracts. |
| Frontend | React + Vite | Small client application and fast local development; no server-rendering requirement exists. |
| Client state | Component state and `useReducer`; small React Context only for shared UI/session state | The app has no complex cross-page client cache. Do not add Redux, Zustand, React Query, or a state-machine library unless a concrete need appears. |
| Routing | React Router | Two explicit pages: customer request and support dashboard. |
| HTTP client | Native `fetch` in a small API module | Avoid Axios or a client SDK for a few internal endpoints. |
| Backend | Node.js + Express | A familiar, minimal REST server with explicit request handling. |
| Validation | Zod | Validate API payloads and LLM structured output at the trust boundary. |
| Database | SQLite | Smallest database that still supports relational customer, order, request, and audit data. It runs inside the backend container and persists through a Docker volume, so no separate database service is needed. |
| Database access | Parameterized SQL through `better-sqlite3` | A small schema and a few queries do not justify an ORM. Parameterized statements avoid string-built SQL. |
| AI integration | OpenAI-compatible server-side SDK behind an `AiService` interface | Keeps provider-specific code isolated and allows a safe deterministic fallback. |
| Containers | Docker Compose with frontend and backend services | One `docker-compose up --build` command, with SQLite persisted as a backend-mounted volume. |
| Tests | Vitest | Unit tests for the policy engine and request validation; one or two API integration tests if time permits. |

## Why SQLite instead of PostgreSQL

SQLite is selected for this time-boxed assessment because the dataset is synthetic and small (about 15 customers), the application has a single backend instance, and the goal is a reproducible local demo. It still demonstrates relational modelling, constraints, migrations/schema setup, seed data, parameterized queries, and persistent storage.

The trade-off is that SQLite is not the intended choice for a production system with concurrent writes, database replicas, managed backups, or operational reporting. If this product moved beyond the assessment, the repository boundary and SQL schema would make migration to PostgreSQL straightforward.

## Required server decision flow

```text
validate request → find order/customer → run policy rules → optional AI assistance
        → compute final decision on the server → save request + audit log → return response
```

The policy engine is the sole authority for the outcome. AI output is evidence, never authority.

Policy checks are evaluated in this order:

1. No matching order/customer: `ESCALATED`.
2. Suspicious, conflicting, or policy-bypass attempt: `ESCALATED`.
3. Final-sale item: `DENIED`.
4. Order outside the documented return window: `DENIED`.
5. Refund amount above $500: `ESCALATED`.
6. Recent damaged or incorrect-item request: `APPROVED`.
7. Any remaining request: the policy's documented default outcome.

## AI cost and safety guardrails

- The browser never receives an AI-provider API key.
- Validate email, order reference, reason, and maximum text length before database or AI work.
- Verify that the supplied email belongs to the supplied order before invoking AI.
- Run deterministic policy checks first. Skip AI for requests where the outcome is already unambiguous, except where a short safety classification is required.
- Rate-limit the public submission route by IP and apply a per-order duplicate-request window.
- Set a small model output-token ceiling and a server timeout.
- Treat free text as untrusted quoted data, not model instructions.
- Require structured AI output and validate it with Zod. Invalid, unavailable, or timed-out output uses the deterministic fallback response.
- Store only necessary audit data: rules triggered, AI category/flags, decision, and safe explanation. Do not log API keys or hidden system prompts.

## Data model minimum

- `customers`: synthetic profile and email.
- `orders`: order reference, customer, purchase date, amount, status.
- `order_items`: product name, unit price, quantity, final-sale status.
- `refund_requests`: submitted reason/details, outcome, response text, timestamp.
- `refund_audit_logs`: rule evaluations, AI category/flags, and escalation notes.
- `users`: support email, password hash, and role.
- `user_sessions`: hashed, expiring support-session tokens.

Seed at least one deterministic scenario each for approval, final-sale denial, late-order denial, high-value escalation, suspicious-content escalation, and unmatched-order escalation.

## API minimum

- `POST /api/refund-requests` — validate and process a customer request.
- `POST /api/auth/login` — authenticate a seeded support user and issue a short-lived session token.
- `POST /api/auth/logout` — revoke the current support session.
- `GET /api/refund-requests` — list recent requests for the dashboard.
- `GET /api/refund-requests/:id` — show request, order facts, and audit notes.
- `GET /api/health` — container health check.

## Definition of done

- `docker-compose up --build` launches the frontend and backend without manual database setup.
- Seed data is available on the first start and survives a backend restart through a named volume.
- The customer flow demonstrates approved, denied, and escalated outcomes.
- The dashboard displays persisted requests and their rule/audit explanations.
- The app runs with an AI key and also degrades safely without one.
- The policy engine and input-validation logic have automated tests.
- `README.md` explains architecture, setup, environment variables, AI role, safeguards, and known trade-offs.

## Change-control questions

Before adding code or a dependency, answer all three:

1. Which explicit assessment requirement or guardrail does this serve?
2. Can React, Express, SQLite, a small local utility, or an existing dependency do it already?
3. Will it make the demo or 30-minute architecture explanation harder?

If the answer to the first question is unclear, do not add it.
