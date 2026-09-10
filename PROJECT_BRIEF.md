# FlightLead AI project brief

## Working hypothesis

Independent flight schools lose prospective students because calls and web inquiries are answered slowly, inconsistently, or not at all. FlightLead provides a focused enrollment layer that responds quickly, answers only approved questions, gathers qualification details, and routes high-intent prospects to a human.

The product begins as a productized service, learns from a few real deployments, and only then becomes broader SaaS. The first sellable proof is a reliable SMS conversion loop—not a general aviation chatbot.

## Ideal customer

An independent U.S. flight school or small multi-aircraft academy that:

- receives a meaningful number of consumer training inquiries;
- has an owner, manager, or admissions person following up manually;
- offers discovery flights and private-pilot or career-path training;
- can provide an approved FAQ and a staff escalation number; and
- will run a controlled 60–90 day pilot and share funnel outcomes.

## Customer problem and promise

Prospects often inquire outside office hours, ask the same early questions, and disappear before staff make contact. FlightLead's promise is: respond promptly, capture the facts staff need, and alert a person when intent is high—without making safety-critical aviation decisions or inventing school policy.

## Current MVP

```text
Inbound SMS
  -> validate and deduplicate webhook
  -> find/create lead and persist inbound message
  -> retrieve recent conversation + approved school knowledge
  -> OpenAI structured qualification result
  -> merge extracted lead fields and score
  -> persist and send outbound SMS
  -> alert staff once when score reaches the configured threshold
```

The qualification record includes name, email when volunteered, training goal, prior experience, desired start timeframe, availability, discovery-flight interest, preferred follow-up, intent, score, conversation summary, and any human-escalation reason.

## Explicit non-goals

- inbound or outbound voice
- missed-call recovery
- customer dashboard or analytics UI
- billing, subscriptions, or metering
- self-serve onboarding or broad tenant administration
- CRM/scheduler integrations
- autonomous discovery-flight booking
- operational, maintenance, medical, legal, weather, or flight-instruction advice

## Demo customer

The migrations include **Front Range Flight Academy**, a fictional Part 61 school with fictional, clearly approved FAQ data. It exists only for development and sales demonstrations. Replace its Twilio and staff numbers in the database; do not silently turn demo claims into a real customer's claims.

## Business model to test

Start as a done-for-you pilot: approximately $1,000 setup and $500 per month, with early-customer discounts only in exchange for intensive feedback and permission to use anonymized outcomes. Pricing is a hypothesis, not a forecast. Track cost per conversation and value created before changing tiers.

The path is service -> productized service -> SaaS. Customer interviews and real conversion data decide what becomes standardized.

## Measures of success

- webhook events are authenticated and duplicate Twilio message IDs do not cause duplicate sends;
- every accepted inbound message is tied to one school, lead, conversation, and transcript;
- model output is schema-validated before it changes data or triggers alerts;
- replies are concise and use only approved school knowledge;
- unsafe or unknown questions go to human review;
- a lead crossing score 8 triggers no more than one staff alert in ordinary sequential processing;
- staff can understand the alert and act without opening a dashboard;
- service tests cover the complete happy path, deduplication, escalation, alerting, and opt-out behavior.

## Product validation targets

Before building the deferred platform, interview 15–20 school owners/managers, run a fictional end-to-end demo, sell one controlled pilot, and measure inquiry volume, first-response time, engagement, qualified leads, discovery-flight requests/bookings, enrollments, and human workload.

## Decisions made

- GitHub is the shared source of truth for human, ChatGPT, and Claude work.
- TypeScript owns the tested domain behavior and integration boundaries.
- Supabase/Postgres owns durable lead and conversation state.
- Twilio provides SMS transport.
- OpenAI Responses API Structured Outputs provides the qualification contract.
- n8n remains an optional early-stage orchestrator; the checked-in workflow is documentation until exported from a tested environment.
- Conversation history is rebuilt from Postgres rather than relying on model-provider conversation state.
- A model score is advisory. Application code owns thresholds, one-time alert state, consent state, and side effects.

## Outstanding questions

- Which first market and school profile has the most expensive response-time problem?
- What exact SMS consent/registration path applies to each acquisition source and messaging pattern?
- Which approved FAQ fields are required before a school can go live?
- Should hot leads alert by SMS, email, or both after customer interviews?
- What response-time, conversion, and opt-out baselines define a successful pilot?
- Which retention period and deletion workflow will the first customer approve?
