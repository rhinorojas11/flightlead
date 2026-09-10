import type {
  EnrollmentAgent,
  EnrollmentTurnProcessor,
  EnrollmentTurnResult,
  HotLeadAlerter,
  LeadRepository,
  SmsSender,
} from "../domain/ports.js";
import type { EnrollmentAgentResult, TwilioInboundSms } from "../domain/schemas.js";
import type { Lead, School } from "../domain/types.js";

const OPT_OUT_KEYWORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

export class UnknownInboundNumberError extends Error {
  public constructor() {
    super("No school is configured for the receiving number");
    this.name = "UnknownInboundNumberError";
  }
}

export interface EnrollmentServiceOptions {
  hotLeadThreshold: number;
  recentMessageLimit: number;
}

export class EnrollmentService implements EnrollmentTurnProcessor {
  public constructor(
    private readonly repository: LeadRepository,
    private readonly agent: EnrollmentAgent,
    private readonly smsSender: SmsSender,
    private readonly alerter: HotLeadAlerter,
    private readonly options: EnrollmentServiceOptions,
  ) {}

  public async handleInbound(sms: TwilioInboundSms): Promise<EnrollmentTurnResult> {
    const school = await this.repository.findSchoolByInboundPhone(sms.To);
    if (!school) {
      throw new UnknownInboundNumberError();
    }

    let lead = await this.repository.getOrCreateLead(school.id, sms.From);
    const claim = await this.repository.claimInboundMessage({
      leadId: lead.id,
      providerMessageId: sms.MessageSid,
      body: sms.Body,
    });

    if (claim.state === "duplicate") {
      const alerted = await this.alertIfNeeded(school, lead, "Previously qualified hot lead");
      return { kind: "duplicate", leadId: lead.id, alerted };
    }

    if (OPT_OUT_KEYWORDS.has(sms.Body.trim().toUpperCase())) {
      lead = await this.repository.markLeadOptedOut(lead.id);
      await this.repository.markInboundProcessed(sms.MessageSid);
      return { kind: "opted_out", leadId: lead.id };
    }

    let result: EnrollmentAgentResult;
    try {
      const recentMessages = (await this.repository.getRecentMessages(
        lead.id,
        this.options.recentMessageLimit + 1,
      ))
        .filter((message) => message.providerMessageId !== sms.MessageSid)
        .slice(-this.options.recentMessageLimit);

      result = await this.agent.qualify({
        school,
        lead,
        recentMessages,
        latestMessage: sms.Body,
      });

      lead = await this.repository.applyQualification(lead, result, this.options.hotLeadThreshold);
      await this.repository.updateConversationSummary(lead.id, result.conversationSummary);
      await this.sendAndRecordReply(school, lead, result);
      await this.repository.markInboundProcessed(sms.MessageSid);
    } catch (error) {
      await this.repository.markInboundFailed(sms.MessageSid, safeErrorReason(error)).catch(() => undefined);
      throw error;
    }

    // Alerting happens after the prospect turn is complete. If the alert fails, a
    // Twilio retry takes the duplicate branch and retries only the staff alert.
    const alerted = await this.alertIfNeeded(school, lead, result.conversationSummary);

    return {
      kind: "processed",
      leadId: lead.id,
      leadScore: lead.leadScore,
      reply: result.reply,
      alerted,
    };
  }

  private async sendAndRecordReply(
    school: School,
    lead: Lead,
    result: EnrollmentAgentResult,
  ): Promise<void> {
    const outbound = await this.repository.createOutboundMessage(lead.id, result.reply);

    try {
      const sent = await this.smsSender.sendReply({
        from: school.inboundPhone,
        to: lead.phone,
        body: result.reply,
      });
      await this.repository.markOutboundSent(outbound.id, sent.providerMessageId);
    } catch (error) {
      await this.repository.markOutboundFailed(outbound.id, safeErrorReason(error)).catch(() => undefined);
      throw error;
    }
  }

  private async alertIfNeeded(school: School, lead: Lead, summary: string): Promise<boolean> {
    if (
      lead.status !== "hot" ||
      lead.leadScore < this.options.hotLeadThreshold ||
      lead.hotLeadAlertedAt ||
      !school.alertPhone
    ) {
      return false;
    }

    const sent = await this.alerter.sendHotLeadAlert({ school, lead, summary });
    return this.repository.markHotLeadAlerted(lead.id, {
      providerMessageId: sent.providerMessageId,
      channel: "sms",
      score: lead.leadScore,
    });
  }
}

function safeErrorReason(error: unknown): string {
  if (error instanceof Error) {
    return error.name.slice(0, 100);
  }
  return "UnknownError";
}
