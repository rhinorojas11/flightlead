# FlightLead collaboration contract

This repository is the source of truth for ChatGPT, Claude, and human contributors.

Before changing code, read `PROJECT_BRIEF.md`, `ARCHITECTURE.md`, and `TASKS.md`. Keep the current milestone limited to inbound SMS, AI qualification, lead persistence, an outbound SMS reply, and a one-time hot-lead alert.

## Working rules

- Do not add voice, a dashboard, billing, CRM integrations, or multi-tenant onboarding unless `TASKS.md` moves that work into the current milestone.
- Preserve the domain interfaces in `src/domain/ports.ts`; integrations should stay replaceable.
- Treat OpenAI output and Twilio webhook input as untrusted. Validate both at their boundaries.
- Never commit secrets, real prospective-student data, or production phone numbers.
- Keep aviation answers grounded in a school's approved knowledge. Safety-sensitive, operational, medical, or legal questions must escalate to a human.
- Add or update tests for behavior changes. Run `pnpm test`, `pnpm typecheck`, and `pnpm build` before handoff.
- Update `ARCHITECTURE.md` when system boundaries or data flow change. Update `TASKS.md` when milestone status changes.

## Collaboration flow

Use small branches and pull requests. In each PR, explain the user-visible outcome, tests run, schema or environment changes, and any unresolved risk. A reviewing model should identify concrete defects before proposing broad rewrites.
