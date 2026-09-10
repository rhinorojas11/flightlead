# Customer and prospect workflow

## School onboarding for the MVP

This is a manual operator checklist, not self-serve onboarding.

1. Confirm the school owns the inbound number and staff escalation number.
2. Collect written, approved facts: programs, location, hours, discovery-flight details, pricing language, training framework, age/medical disclaimers, financing language, and contact/escalation policy.
3. Enter only approved facts in `schools.approved_faq`.
4. Agree on the qualification fields and hot threshold (default 8/10).
5. Agree on message consent sources, opt-out handling, quiet hours, retention, and deletion.
6. Test with verified staff numbers and fictional prospects.
7. Obtain written go-live approval after reviewing transcripts and alerts.

## Prospect conversation

The enrollment agent should feel like a helpful admissions assistant, not a form. It answers one grounded question and asks at most one useful next question in a typical message.

Desired facts gathered naturally over multiple turns:

- first name and volunteered email;
- training goal (private/recreational, career, instrument, commercial, other);
- experience level;
- desired start timeframe;
- weekly availability;
- interest in a discovery flight; and
- preferred follow-up method.

The prospect always remains free to ask questions. Missing qualification fields are not a reason to withhold a useful approved answer.

## Example demo journey

1. Prospect: “I've always wanted to learn to fly. What does it cost?”
2. Agent: gives the approved estimate/disclaimer and asks whether the goal is recreational flying or a professional path.
3. Prospect: “Airlines eventually. No experience, and I could start next month.”
4. Agent: acknowledges the goal, asks about discovery-flight interest, and updates the structured lead record.
5. Once the score reaches 8, the prospect receives the normal reply and staff receives a concise alert with the lead's goal, timeframe, experience, score, summary, and phone number.

## Human handoff

Set `requiresHuman` for facts missing from approved knowledge; exact availability or commitments; disputes; accessibility or sensitive personal matters; or any operational, maintenance, weather, medical, legal, regulatory, or instructional aviation question. The reply should state that school staff can help, without pretending the handoff is instantaneous.

## Opt-out

STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, and QUIT are treated as opt-out keywords before the model is called. The application records the opt-out and sends no custom follow-up. The messaging provider's own required confirmation and suppression behavior still applies.
