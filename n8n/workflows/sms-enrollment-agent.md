# SMS enrollment agent workflow design

Status: design placeholder, not imported or production-tested.

## Recommended first implementation

Use n8n as a thin durable orchestrator around the TypeScript endpoint, not as a second implementation of the agent:

```text
Twilio Webhook
  -> validate/authenticate at TypeScript endpoint
  -> enqueue/execute one enrollment turn
  -> TypeScript service owns Supabase + OpenAI + Twilio behavior
  -> record execution outcome
  -> error workflow alerts operator
```

If direct n8n nodes are used during the earliest demo, preserve the same sequence:

1. Webhook: receive `MessageSid`, `From`, `To`, and `Body`.
2. Verify signature: call a protected TypeScript verification/processing endpoint; do not place the Twilio auth token in a code node.
3. Lead lookup/upsert: key by school and E.164 prospect number.
4. Idempotency insert: unique `MessageSid`; stop on duplicate.
5. Opt-out branch: update suppression and stop before AI.
6. Load school + bounded transcript.
7. Enrollment agent: use the same schema and instructions as `src/agent/`.
8. Persist qualification and outbound message.
9. Send prospect SMS.
10. Threshold branch: send staff alert only if the persisted alert marker is absent.
11. Mark completion and capture provider IDs.

## Error workflow

Record the node, internal lead/message IDs, attempt count, and sanitized error category. Never include credentials or full message text in operator notifications. Bound retries; route exhausted work to a manual queue.

## Required test cases before exporting JSON

- valid new inquiry;
- continuing qualification turn;
- duplicate `MessageSid`;
- STOP keyword;
- bad Twilio signature;
- unknown receiving number;
- schema/refusal/API failure;
- Supabase timeout;
- Twilio reply failure;
- hot lead already alerted;
- hot alert destination missing.
