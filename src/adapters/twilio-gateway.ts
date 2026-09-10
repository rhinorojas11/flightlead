import twilio from "twilio";

import type { HotLeadAlerter, SmsSender } from "../domain/ports.js";
import type { Lead, School } from "../domain/types.js";

export class TwilioGateway implements SmsSender, HotLeadAlerter {
  private readonly client: ReturnType<typeof twilio>;

  public constructor(accountSid: string, authToken: string) {
    this.client = twilio(accountSid, authToken);
  }

  public async sendReply(input: {
    from: string;
    to: string;
    body: string;
  }): Promise<{ providerMessageId: string }> {
    const message = await this.client.messages.create(input);
    return { providerMessageId: message.sid };
  }

  public async sendHotLeadAlert(input: {
    school: School;
    lead: Lead;
    summary: string;
  }): Promise<{ providerMessageId: string }> {
    if (!input.school.alertPhone) {
      throw new Error("School has no hot-lead alert phone configured");
    }

    const message = await this.client.messages.create({
      from: input.school.inboundPhone,
      to: input.school.alertPhone,
      body: formatHotLeadAlert(input.school, input.lead, input.summary),
    });
    return { providerMessageId: message.sid };
  }
}

export function formatHotLeadAlert(school: School, lead: Lead, summary: string): string {
  return [
    `Hot FlightLead inquiry for ${school.name}`,
    `Name: ${lead.firstName ?? "Not provided"}`,
    `Phone: ${lead.phone}`,
    `Goal: ${lead.trainingGoal ?? "Not provided"}`,
    `Experience: ${lead.experienceLevel ?? "Not provided"}`,
    `Start: ${lead.desiredStartDate ?? "Not provided"}`,
    `Discovery flight: ${formatBoolean(lead.discoveryFlightInterest)}`,
    `Score: ${lead.leadScore}/10`,
    `Summary: ${summary}`,
    "Recommended action: contact promptly.",
  ].join("\n");
}

function formatBoolean(value: boolean | null): string {
  if (value === null) return "Not provided";
  return value ? "Interested" : "Not currently interested";
}
