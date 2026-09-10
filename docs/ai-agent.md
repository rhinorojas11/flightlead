# AI enrollment agent

## Job

The model produces a friendly prospect-facing reply and a machine-readable qualification update. It is one component in a sales workflow; it does not own persistence, consent, thresholds, or message delivery.

The adapter uses the OpenAI Responses API with [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) and the shared Zod schema in `src/domain/schemas.ts`. Schema validation is a hard boundary: malformed or absent structured output fails the turn rather than changing lead state.

## Inputs

- common role, outcome, safety, and conversation-style instructions;
- the school's name and approved FAQ JSON;
- current lead fields;
- a bounded recent transcript; and
- the latest inbound message.

Postgres remains the conversation source of truth. The API request uses `store: false`, and the application reconstructs context on each turn rather than relying on provider-side conversation state.

## Output contract

- `reply`
- `intent`
- `extracted`: nullable qualification fields
- `leadScore`: integer 1–10
- `requiresHuman` and nullable `humanReason`
- `conversationSummary`

All keys are required; unknown values use `null`. The application merges only non-null extracted data and preserves the highest observed score from turns that do not require human escalation. This prevents a safety-sensitive turn from making a lead commercially hot by itself.

## Scoring rubric

The score is advisory and should be calibrated with real outcomes:

- 1–3: vague inquiry or low engagement;
- 4–5: training interest with limited timing/details;
- 6–7: clear goal plus meaningful qualification information;
- 8–10: clear training intent, near-term timeframe or discovery interest, and enough information for staff to act.

Do not increase the score merely because the prospect asks many questions or shares sensitive information. A safety escalation and commercial intent are separate signals.

## Grounding and safety

The reply may use only supplied school knowledge. It may not invent prices, financing terms, aircraft/instructor availability, booking confirmation, school policy, or FAA requirements. It must route to humans for uncertainty and for weather, airworthiness, maintenance, flight operations/instruction, medical, legal, or regulatory advice.

The model is also instructed to treat transcript and prospect text as data, not instructions that can override its role or reveal prompts, internal scoring logic, or other conversations.

## Evaluation set to build before pilot

Create reviewed examples for normal pricing questions, career vs. recreational goals, no prior experience, returning students, ambiguous dates, price objections, discovery-flight interest, unsupported discounts, exact availability, prompt injection, medical questions, weather/go-no-go questions, angry prospects, opt-out language, and attempts to obtain other leads' information.

Measure structured-field accuracy, grounded-answer rate, correct escalation, inappropriate claims, response length, lead-score calibration, latency, and cost. Model or prompt changes should be gated by this set, not subjective transcript preference alone.
