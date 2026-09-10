# Compliance and safety checklist

This document is an engineering checklist, not legal advice. Requirements vary by country, state, acquisition source, message type, carrier, and provider program. Review the actual deployment with qualified counsel and the messaging provider before contacting real prospects.

## Messaging consent

- Document how every phone number was collected and what messaging disclosure the prospect saw.
- Distinguish a direct inbound text reply from later marketing/reactivation campaigns; this MVP authorizes only the active inbound enrollment conversation.
- Complete applicable Twilio/carrier sender registration before production messaging.
- Identify the school in messages where required and do not use purchased lists.
- Maintain evidence of the agreed consent language and source outside the model transcript.

## Opt-out and quiet behavior

- Honor standard opt-out keywords immediately and synchronize suppression state with Twilio.
- Do not call the model or send a custom application reply after a recognized opt-out.
- Add HELP handling and customer-approved support contact details before production.
- Establish quiet hours and frequency expectations before adding any proactive follow-up.

## Privacy and data handling

- Collect only enrollment information staff need; never ask for Social Security numbers, payment data, medical records, government IDs, or citizenship/clearance details in SMS.
- Keep OpenAI, Supabase, Twilio, and n8n credentials server-side with least privilege and rotation procedures.
- Avoid logging message bodies, API keys, full phone numbers, or emails.
- Define retention, correction, export, and deletion processes with the customer before go-live.
- Confirm vendor agreements, data-use settings, subprocessors, regions, and breach/incident obligations for the actual accounts.

## AI disclosure and human oversight

- Decide with counsel/customer whether and how to disclose automated/AI assistance.
- Never imply a human has reviewed a message when they have not.
- Give staff a reliable escalation path and review early transcripts daily during the pilot.
- Keep approved school knowledge versioned and require staff approval for changes.

## Aviation boundary

FlightLead supports sales, customer service, and administration only. It must not make airworthiness, maintenance, weather, go/no-go, medical, legal, regulatory, or flight-instruction decisions. These questions receive a neutral handoff to qualified school staff or the appropriate professional.

## Security and operations

- Validate Twilio signatures using the exact externally visible webhook URL.
- Rate limit, cap body sizes, monitor failures, and alert on abnormal webhook volume before production.
- Use unique provider IDs, a durable queue/outbox, bounded retries, and dead-letter handling.
- Test account separation before supporting more than one real school.
- Maintain incident-response contacts and a kill switch that stops outbound messaging.

## Founder/employer separation

If the operator is subject to military, government, employer, or educational outside-activity rules, obtain the required ethics/command/employer review before taking revenue. Keep the business off government/employer time, devices, accounts, networks, and non-public information.
