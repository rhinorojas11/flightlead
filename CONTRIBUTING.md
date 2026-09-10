# Contributing

FlightLead is intentionally in a narrow validation phase. Start with the repository contract in `AGENTS.md` and take work from the current milestone in `TASKS.md`.

1. Create a short-lived branch from `main`.
2. Make the smallest change that satisfies one task or fixes one defect.
3. Add tests at the domain/service boundary.
4. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
5. Open a pull request using the repository template.

Never put credentials or real lead data in issues, fixtures, logs, or commits.
