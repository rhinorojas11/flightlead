# FlightLead MVP architecture

## System boundary

The backend is one stateless TypeScript service. It authenticates Twilio webhooks, orchestrates the enrollment turn, and talks to three external systems behind narrow interfaces:

```text
Prospect
   |
   v
Twilio SMS ---- signed webhook ----> Fastify route
                                         |
                                         v
                                  Enrollment service
                                   /       |       \
                                  v        v        v
                           Supabase    OpenAI    Twilio REST
                           state       result    reply/alert
```

The current code runs a turn synchronously for demo simplicity. A production pilot should acknowledge the webhook quickly and move processing to a durable queue/outbox or a reliably hosted n8n execution. That change must preserve the domain ports and idempotency key.

## Turn sequence

1. Parse required Twilio fields and validate the request signature against `PUBLIC_BASE_URL` plus the request path.
2. Map the receiving Twilio number to a school record. Unknown numbers fail closed.
3. Find or create a lead by `(school_id, phone)`.
4. Insert the inbound message using Twilio's `MessageSid` as a unique idempotency key. A duplicate exits without AI or outbound side effects.
5. If the body is a standard opt-out keyword, mark the lead opted out and stop.
6. Load recent transcript state and send approved knowledge, current lead state, and the latest turn to the enrollment agent.
7. Validate the structured result with the shared Zod schema.
8. Merge only non-null extracted fields, preserve the highest non-escalation score, and derive `qualifying`, `hot`, or `human_review` status. A human-required turn cannot raise the commercial score by itself.
9. Persist the planned outbound reply, send it through Twilio, and complete inbound processing.
10. If the lead is hot, has an alert destination, and has not been alerted, send a concise staff alert and record the alert marker.

## Module map

- `src/domain/` — schemas, entities, and ports with no vendor behavior
- `src/services/enrollment-service.ts` — business flow and side-effect ordering
- `src/agent/` — prompt construction and OpenAI Structured Outputs adapter
- `src/adapters/` — Supabase and Twilio implementations
- `src/http/` — Twilio webhook boundary
- `src/server.ts` — composition root only

## Trust boundaries

- **Twilio request:** untrusted until required fields and request signature validate.
- **Model output:** untrusted until the Zod schema validates; text is never interpreted as a command.
- **School knowledge:** trusted only after staff approval. The model may paraphrase it but may not fill gaps.
- **Database:** server-only service role; row-level security is enabled as defense in depth. No browser receives the key.
- **Logs:** avoid full message bodies and contact details. Use provider IDs and internal IDs for diagnosis.

## State and idempotency

`messages.provider_message_sid` is unique for inbound messages. `processing_status` records `pending`, `processed`, or `failed`; retries of an already claimed message do not send another response. A partial failure after an external Twilio send but before its database update remains an MVP limitation.

Hot-alert state is stored on `leads.hot_lead_alerted_at`, and the database also has a partial unique event index. The current check/send/mark sequence is safe for normal sequential turns but not a full concurrent outbox. Before real traffic, replace SMS/alert side effects with durable jobs and atomic claims.

## Failure behavior

- invalid payload/signature: reject without processing;
- unknown inbound number: reject and log the receiving number only;
- duplicate provider ID: acknowledge with no new side effect;
- AI or persistence failure: mark the inbound message failed when possible and return an error so operations can inspect/retry;
- unknown/safety-sensitive content: short human handoff reply and `human_review` status;
- reply send failure: leave a persisted outbound record with failed delivery status;
- alert failure: keep the lead hot and unalerted so a later retry/operations process can recover it.

## Scaling seam, not current scope

The first important production refactor is a durable queue/outbox between webhook receipt and external sends. Multi-tenant auth, dashboard APIs, analytics, billing, voice, and scheduler integrations come later and are not implied by the existing school foreign keys.
