# Database schema

The initial migration uses five durable concepts. It supports a single demo school today while keeping every lead explicitly associated with its school. That foreign key is data hygiene, not finished multi-tenant onboarding.

## `schools`

Configuration and staff-approved knowledge for an inbound number. `inbound_phone` is the routing key. `alert_phone` is nullable so a hot lead can remain visible in data without pretending an alert was delivered.

## `leads`

One prospective student per school and normalized phone number. Nullable qualification fields are filled only when volunteered or safely inferred from the conversation. Important fields:

- `status`: `new`, `qualifying`, `hot`, `human_review`, `opted_out`, or `closed`;
- `consent_status`: basic application suppression state, not proof of legal consent;
- `lead_score`: highest validated non-escalation model score observed, 1–10;
- `hot_lead_alerted_at`: ordinary sequential alert deduplication marker.

## `conversations`

One active SMS conversation per lead in the MVP. It stores the latest structured summary and timestamp. Full message text remains in `messages`.

## `messages`

Inbound and outbound transcript records. Twilio's inbound `MessageSid` is stored as `provider_message_sid` with a partial unique index. `processing_status` supports basic retry diagnosis; `delivery_status` is a starter field for later status callbacks.

## `events`

Append-only business/operations markers such as `hot_lead_alert_sent`. A partial unique index prevents more than one recorded hot-alert event per lead. Events do not replace a proper outbox.

## Security and access

Row-level security is enabled on every table without public policies. The backend uses the Supabase service role server-side. Never expose that key to a browser, n8n client form, repository fixture, or log.

## Evolution rules

- Apply new numbered migrations; do not edit an applied migration.
- Add a generated `database.types.ts` once a Supabase project exists.
- Normalize phone numbers to E.164 before persistence.
- Use a durable outbox and atomic job claims before real concurrent traffic.
- Make retention/deletion changes only after the pilot's privacy policy and customer agreement define them.
