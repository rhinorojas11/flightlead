# FlightLead AI

FlightLead is a deliberately narrow MVP for independent flight schools. It turns an inbound text message into a grounded enrollment conversation, persists the lead and transcript, replies by SMS, and alerts school staff once the lead becomes high intent.

```text
Twilio inbound SMS
        |
        v
TypeScript webhook -> Supabase lead + message
        |                    |
        v                    v
OpenAI structured result   conversation history
        |
        +-> Twilio reply
        +-> one-time hot-lead alert (score >= 8)
```

Voice, dashboards, billing, and self-serve multi-tenant onboarding are not part of this milestone.

## Repository map

- `PROJECT_BRIEF.md` — product, customer, offer, decisions, and acceptance criteria
- `ARCHITECTURE.md` — current components, data flow, failure modes, and boundaries
- `TASKS.md` — milestone checklist and deferred work
- `docs/` — business and implementation handoff material
- `src/` — minimal TypeScript backend with replaceable integration ports
- `supabase/migrations/` — initial Postgres schema and fictional demo school
- `n8n/workflows/` — orchestration notes; no production workflow is claimed yet
- `tests/` — service-level MVP acceptance tests

## Local setup

Prerequisites: Node.js 20+, pnpm, a Supabase project, a Twilio SMS-capable number, and an OpenAI API key.

```bash
pnpm install
cp .env.example .env
supabase db reset
pnpm dev
```

Update the fictional school's `inbound_phone` and `alert_phone` in Supabase to match your Twilio test number and your verified staff test number. Expose the local server through an HTTPS tunnel, set `PUBLIC_BASE_URL` to that exact public origin, and configure the Twilio number's incoming-message webhook as:

```text
POST https://your-public-origin.example/webhooks/twilio/sms
```

Use only test/verified numbers and fictional lead data until consent, registration, privacy, retention, and legal requirements in `docs/compliance.md` have been reviewed for the actual deployment.

## Verify

```bash
pnpm test
pnpm typecheck
pnpm build
```

The test suite uses in-memory fakes; it does not send messages or call OpenAI/Supabase.

## Collaboration

GitHub is the durable handoff layer. Both ChatGPT and Claude should follow `AGENTS.md`, make small pull requests, report validation results, and update the three source-of-truth documents when a decision changes.
