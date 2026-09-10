# FlightLead tasks

## Current milestone: MVP AI SMS enrollment agent

### Starter repository — completed

- [x] Capture product/business handoff and collaboration rules
- [x] Define the MVP architecture and compliance boundaries
- [x] Add Supabase schema and fictional demo school migration
- [x] Add TypeScript domain, OpenAI, Supabase, Twilio, and webhook structure
- [x] Add service-level tests for the core SMS enrollment flow
- [x] Add pull-request checks for tests, types, and production build
- [x] Document the placeholder n8n workflow
- [x] Initialize `main` with a personal Git identity and connect the GitHub repository

### Operator setup — next

- [ ] Authenticate this Mac with GitHub and push the initial `main` commit
- [ ] Create development-only OpenAI, Supabase, Twilio, and n8n accounts/projects
- [ ] Apply migrations to a non-production Supabase project
- [ ] Replace demo inbound and staff alert numbers with verified test numbers
- [ ] Configure environment secrets in a server-side secret store
- [ ] Expose the webhook through HTTPS and configure the Twilio test number
- [ ] Complete Twilio sender registration/consent review appropriate to the actual traffic

### End-to-end validation

- [ ] Run a normal FAQ inquiry from a verified test phone
- [ ] Run a multi-turn career-training qualification to score 8+
- [ ] Confirm lead/message/conversation persistence in Supabase
- [ ] Confirm one outbound reply per unique inbound `MessageSid`
- [ ] Confirm exactly one hot-lead staff alert in sequential testing
- [ ] Confirm unsafe/unknown questions route to human review
- [ ] Confirm STOP bypasses the model and suppresses outbound application messages
- [ ] Review logs to ensure message bodies and sensitive contact data are not emitted

### Before a real customer pilot

- [ ] Replace synchronous webhook processing with a durable queue/outbox or tested n8n execution
- [ ] Add retry/backoff and delivery-status callbacks for outbound SMS
- [ ] Resolve concurrent hot-alert claiming atomically
- [ ] Add integration tests against isolated Supabase and Twilio test credentials
- [ ] Define monitoring, incident response, retention, deletion, and data-export procedures
- [ ] Obtain customer approval of every FAQ statement and escalation destination
- [ ] Complete legal/compliance review for consent, opt-out, privacy, recording, and industry claims
- [ ] Establish baseline and pilot success metrics

## Business validation

- [ ] Interview 15–20 independent flight-school owners/managers
- [ ] Test the working offer and pricing hypothesis
- [ ] Create a fictional live demo with no real prospective-student data
- [ ] Sell one controlled 60–90 day pilot before building a platform
- [ ] Measure response time, engagement, qualified leads, discovery-flight requests/bookings, and enrollments

## Deferred—not authorized in the current milestone

- [ ] Voice agent or missed-call recovery
- [ ] Customer dashboard
- [ ] Billing/subscriptions
- [ ] Self-serve or multi-tenant onboarding
- [ ] Flight Schedule Pro, Flight Circle, or CRM integrations
- [ ] Automated booking
- [ ] Broad analytics/product telemetry
- [ ] Lead reactivation campaigns
