# Worktoon — AI Refund Support

A lightweight refund-support app for a fictional e-commerce store.

A customer submits a refund request. The app checks the seeded order data and refund policy, then returns `APPROVED`, `DENIED`, or `ESCALATED`. AI helps classify safe, verified requests, but it never gets the final say.

For a direct map of the assessment criteria to the implementation, read [Architecture and assessment coverage](docs/architecture.md).

## Start here — run the app

You only need a working Docker runtime with the Docker Compose plugin. You do **not** need to install Node.js, SQLite, or a database server yourself.

### Before you start

1. Install and open [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Wait until Docker Desktop says it is running.
3. Open Terminal.

### Already use Docker another way?

Docker Desktop is the easy route, but it is not required. This project also works with Docker Engine and the Docker Compose plugin, which is the usual setup on a Linux server, virtual machine, or CI runner.

Run these two checks:

```bash
docker --version
docker compose version
```

If both commands work, skip Docker Desktop and use the exact same startup commands below. The project needs the modern `docker compose` command, not the older `docker-compose` command. Docker documents the Compose plugin setup for Docker Engine separately. [Docker Compose installation guide](https://docs.docker.com/compose/install/)

### Copy and paste these commands

```bash
git clone https://github.com/Juadebfm/WORKTOON.git
cd WORKTOON
cp .env.example .env
docker compose up --build
```

Wait for Docker to finish building. Then open this link in your browser:

```text
http://localhost:5173
```

That is it. The app creates and seeds its SQLite database on the first start.

To stop the app, return to the Terminal window and press `Control + C`. Then run:

```bash
docker compose down
```

Your submitted refund requests stay saved after a normal restart because SQLite uses a Docker volume.

## AI setup and safe fallback

API keys are private, so no API key is included in this public repository. A reviewer can still run every main refund flow immediately: when `AI_API_KEY` and `AI_MODEL` are not set, the app uses its deterministic policy and a safe fallback response.

If you want to see a live AI classification, add your own values to the private `.env` file you created:

```env
AI_API_KEY=your_key_here
AI_MODEL=gpt-4o-mini
```

Then restart the app:

```bash
docker compose up --build
```

Do not commit, share, or screenshot your `.env` file. It is ignored by Git. The browser never receives this key.

## Try the app

Go to `http://localhost:5173` and use one of these seeded orders.

| What you want to see | Order number | Email | Reason |
|---|---|---|---|
| Approved damaged item | `WO-1001` | `amina.yusuf@example.test` | Damaged item |
| Denied final-sale item | `WO-1002` | `chinedu.okafor@example.test` | Damaged item |
| Denied old order | `WO-1003` | `damilola.adeyemi@example.test` | Damaged item |
| Escalated high-value order | `WO-1004` | `fatima.bello@example.test` | Damaged item |

Write any clear description with at least 10 characters. The customer page shows the result straight away.

### Support dashboard

Open:

```text
http://localhost:5173/support/login
```

Use the demo support account:

```text
Email:    support@worktoon.local
Password: ReviewOnly!2026
```

Submit a customer request first, then open the dashboard. You will see the request, decision, policy rules, AI classification, and audit note.

## What happens when a customer submits a request

```text
Customer form
   ↓
Express API validates the input and finds the order
   ↓
Refund policy decides the safe base outcome
   ↓
AI assistance classifies verified requests and can add a risk flag when configured
   ↓
Final policy decision and audit note are saved in SQLite
   ↓
Customer sees the outcome and support sees the audit trail
```

The policy is the authority. AI cannot approve a refund, deny a refund, or bypass a policy rule. An AI risk flag can only make a request `ESCALATED` for a human to review.

## Refund policy used in this demo

For the full rule order and edge cases, read [the refund policy document](docs/refund-policy.md).

1. A missing order or wrong order email is escalated.
2. Suspicious or policy-bypass text is escalated.
3. Final-sale items are denied.
4. Orders older than 30 days are denied.
5. Refunds above $500 are escalated for human review.
6. Recent damaged or incorrect-item requests are approved.
7. Other requests are denied.

## Project structure

```text
WORKTOON/
├── frontend/             Customer and support user interface
│   └── src/
│       ├── api/          Focused fetch client and API types
│       ├── auth/         Support-session context
│       ├── components/   Reusable UI pieces
│       ├── features/     Request detail drawer
│       ├── pages/        Customer, login, and dashboard pages
│       └── styles/       Tiny Tailwind entry stylesheet
├── backend/              API, policy, AI, auth, and SQLite code
│   └── src/
│       ├── ai/           OpenAI classification adapter with safe fallback
│       ├── auth/         Password and support-session helpers
│       ├── db/           Schema, seed data, and first-start bootstrap
│       ├── policy/       Pure refund-policy rules
│       └── refunds/      Request lookup, decision, and audit persistence
├── docs/                 Policy and reviewer-facing implementation notes
├── docker-compose.yml    Starts the full app with one command
└── .env.example          Safe empty environment-variable template
```

## Stack choices — and why

| Choice | Why this was used |
|---|---|
| React + Vite | A lightweight, fast frontend without server-rendering complexity. |
| Tailwind CSS | Keeps styling beside each component instead of maintaining a large CSS file. |
| React Context + component state | Enough shared state for support login; Redux would be extra weight here. |
| Express + TypeScript | Simple, familiar API structure with clear request handling. |
| SQLite + `better-sqlite3` | Lightweight relational database with no separate database container to run. |
| Parameterized SQL | Customer input is bound as data, not built into SQL strings. |
| Zod | Checks untrusted API input and AI structured output at the boundary. |
| OpenAI SDK + Structured Outputs | Gives predictable AI categories and flags instead of free-form output. |
| Docker Compose | Lets a reviewer start the full app with one command. |
| Nginx frontend proxy | Serves the frontend and keeps `/api` traffic on the same origin. |
| Vitest | Lightweight automated checks for policy, seed data, AI fallback, and API behavior. |

## AI integration

AI is intentionally a lightweight decision-support layer, not an agent with permission to make refund decisions.

- The backend sends only a verified request's selected reason and customer details to the AI service.
- The AI returns structured fields: category, suspicion flags, and a short internal summary.
- The backend validates that structure before using it.
- If AI is unavailable, invalid, or not configured, the app falls back safely.
- The deterministic policy is run before and after AI assistance.
- AI suspicion can escalate a request, but cannot weaken a policy denial or force approval.

## Security notes

- Strict request validation limits text size and rejects control characters.
- Customer order and email must match before normal AI assistance is used.
- Direct prompt-injection or policy-bypass language is escalated before AI is called.
- SQL uses parameterized queries.
- Public refund and login routes have rate limits.
- Dashboard routes require an expiring support session.
- Passwords are stored as bcrypt hashes; session tokens are stored as hashes.
- Helmet adds standard HTTP protection headers.
- The OpenAI key stays in the backend environment only.

## Run checks locally

If you are developing without Docker, install dependencies inside each folder first.

```bash
cd backend
npm install
npm test
```

```bash
cd frontend
npm install
npm run build
```

## Trade-offs

- SQLite is right for this lightweight local assessment. A production multi-instance system would likely use PostgreSQL.
- The support account is a seeded demo account only. There is no customer registration or password reset flow.
- The dashboard is intentionally focused: it shows recent requests and audit detail, not a full support CRM.
- AI adds classification and risk context, but deterministic policy rules remain the safe source of truth.

## Video walkthrough checklist

For the required demo video, show:

1. `docker compose up --build` running locally.
2. An approved, denied, and escalated customer request.
3. The support login and dashboard audit detail.
4. The request flow: frontend → API → policy → AI assistance when configured → SQLite audit log.
5. Why AI cannot override policy.
