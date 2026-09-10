import type { EnrollmentAgentResult, TwilioInboundSms } from "./schemas.js";
import type { ConversationMessage, Lead, School } from "./types.js";

export interface EnrollmentAgentInput {
  school: School;
  lead: Lead;
  recentMessages: ConversationMessage[];
  latestMessage: string;
}

export interface EnrollmentAgent {
  qualify(input: EnrollmentAgentInput): Promise<EnrollmentAgentResult>;
}

export interface LeadRepository {
  findSchoolByInboundPhone(phone: string): Promise<School | null>;
  getOrCreateLead(schoolId: string, phone: string): Promise<Lead>;
  claimInboundMessage(input: {
    leadId: string;
    providerMessageId: string;
    body: string;
  }): Promise<{ state: "claimed" | "retry" | "duplicate"; messageId: string }>;
  getRecentMessages(leadId: string, limit: number): Promise<ConversationMessage[]>;
  applyQualification(lead: Lead, result: EnrollmentAgentResult, hotThreshold: number): Promise<Lead>;
  updateConversationSummary(leadId: string, summary: string): Promise<void>;
  createOutboundMessage(leadId: string, body: string): Promise<{ id: string }>;
  markOutboundSent(messageId: string, providerMessageId: string): Promise<void>;
  markOutboundFailed(messageId: string, reason: string): Promise<void>;
  markInboundProcessed(providerMessageId: string): Promise<void>;
  markInboundFailed(providerMessageId: string, reason: string): Promise<void>;
  markLeadOptedOut(leadId: string): Promise<Lead>;
  markHotLeadAlerted(leadId: string, metadata: Record<string, unknown>): Promise<boolean>;
}

export interface SmsSender {
  sendReply(input: { from: string; to: string; body: string }): Promise<{ providerMessageId: string }>;
}

export interface HotLeadAlerter {
  sendHotLeadAlert(input: {
    school: School;
    lead: Lead;
    summary: string;
  }): Promise<{ providerMessageId: string }>;
}

export type EnrollmentTurnResult =
  | {
      kind: "processed";
      leadId: string;
      leadScore: number;
      reply: string;
      alerted: boolean;
    }
  | { kind: "duplicate"; leadId: string; alerted: boolean }
  | { kind: "opted_out"; leadId: string };

export interface EnrollmentTurnProcessor {
  handleInbound(sms: TwilioInboundSms): Promise<EnrollmentTurnResult>;
}
