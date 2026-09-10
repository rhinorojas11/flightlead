import { describe, expect, it } from "vitest";

import type { EnrollmentTurnProcessor } from "../src/domain/ports.js";
import type { TwilioInboundSms } from "../src/domain/schemas.js";
import { buildApp } from "../src/http/app.js";

describe("Twilio SMS webhook", () => {
  it("rejects an invalid signature before processing", async () => {
    const processor = new RecordingProcessor();
    const app = await buildApp({ processor, validateTwilioSignature: () => false });

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/twilio/sms",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "MessageSid=SM-1&From=%2B15555550199&To=%2B15555550100&Body=Hello",
    });

    expect(response.statusCode).toBe(403);
    expect(processor.messages).toHaveLength(0);
    await app.close();
  });

  it("passes a validated Twilio payload to the enrollment processor", async () => {
    const processor = new RecordingProcessor();
    const app = await buildApp({ processor, validateTwilioSignature: () => true });

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/twilio/sms",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": "test-signature",
      },
      payload: "MessageSid=SM-1&From=%2B15555550199&To=%2B15555550100&Body=Hello",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "processed" });
    expect(processor.messages[0]).toEqual({
      MessageSid: "SM-1",
      From: "+15555550199",
      To: "+15555550100",
      Body: "Hello",
    });
    await app.close();
  });
});

class RecordingProcessor implements EnrollmentTurnProcessor {
  public readonly messages: TwilioInboundSms[] = [];

  public async handleInbound(sms: TwilioInboundSms) {
    this.messages.push(sms);
    return {
      kind: "processed" as const,
      leadId: "lead-1",
      leadScore: 3,
      reply: "Hello",
      alerted: false,
    };
  }
}
