import type { SupabaseClient } from "@supabase/supabase-js";

import type { LeadRepository } from "../domain/ports.js";
import type { EnrollmentAgentResult } from "../domain/schemas.js";
import type { ConversationMessage, Lead, School } from "../domain/types.js";

interface SchoolRow {
  id: string;
  name: string;
  inbound_phone: string;
  alert_phone: string | null;
  timezone: string;
  approved_faq: Record<string, unknown>;
}

interface LeadRow {
  id: string;
  school_id: string;
  phone: string;
  first_name: Lead["firstName"];
  email: Lead["email"];
  training_goal: Lead["trainingGoal"];
  experience_level: Lead["experienceLevel"];
  desired_start_date: Lead["desiredStartDate"];
  availability: Lead["availability"];
  discovery_flight_interest: Lead["discoveryFlightInterest"];
  preferred_contact_method: Lead["preferredContactMethod"];
  lead_score: number;
  status: Lead["status"];
  consent_status: Lead["consentStatus"];
  hot_lead_alerted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  direction: ConversationMessage["direction"];
  body: string;
  provider_message_sid: string | null;
  created_at: string;
}

export class SupabaseLeadRepository implements LeadRepository {
  public constructor(private readonly client: SupabaseClient) {}

  public async findSchoolByInboundPhone(phone: string): Promise<School | null> {
    const { data, error } = await this.client
      .from("schools")
      .select("id,name,inbound_phone,alert_phone,timezone,approved_faq")
      .eq("inbound_phone", phone)
      .maybeSingle();

    if (error) throw error;
    return data ? mapSchool(data as SchoolRow) : null;
  }

  public async getOrCreateLead(schoolId: string, phone: string): Promise<Lead> {
    const existing = await this.findLead(schoolId, phone);
    if (existing) return existing;

    const { data, error } = await this.client
      .from("leads")
      .insert({ school_id: schoolId, phone })
      .select("*")
      .single();

    if (!error) return mapLead(data as LeadRow);
    if (error.code === "23505") {
      const concurrentlyCreated = await this.findLead(schoolId, phone);
      if (concurrentlyCreated) return concurrentlyCreated;
    }
    throw error;
  }

  public async claimInboundMessage(input: {
    leadId: string;
    providerMessageId: string;
    body: string;
  }): Promise<{ state: "claimed" | "retry" | "duplicate"; messageId: string }> {
    const conversationId = await this.getOrCreateConversationId(input.leadId);
    const inserted = await this.client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        lead_id: input.leadId,
        direction: "inbound",
        channel: "sms",
        body: input.body,
        provider_message_sid: input.providerMessageId,
        processing_status: "pending",
      })
      .select("id")
      .single();

    if (!inserted.error) {
      await this.touchConversation(conversationId);
      return { state: "claimed", messageId: (inserted.data as { id: string }).id };
    }
    if (inserted.error.code !== "23505") throw inserted.error;

    const existing = await this.client
      .from("messages")
      .select("id,processing_status")
      .eq("provider_message_sid", input.providerMessageId)
      .single();
    if (existing.error) throw existing.error;

    const existingMessage = existing.data as { id: string; processing_status: string };
    if (existingMessage.processing_status !== "failed") {
      return { state: "duplicate", messageId: existingMessage.id };
    }

    const reclaimed = await this.client
      .from("messages")
      .update({ processing_status: "pending", processing_error: null })
      .eq("id", existingMessage.id)
      .eq("processing_status", "failed")
      .select("id")
      .maybeSingle();
    if (reclaimed.error) throw reclaimed.error;

    return reclaimed.data
      ? { state: "retry", messageId: existingMessage.id }
      : { state: "duplicate", messageId: existingMessage.id };
  }

  public async getRecentMessages(leadId: string, limit: number): Promise<ConversationMessage[]> {
    const { data, error } = await this.client
      .from("messages")
      .select("id,direction,body,provider_message_sid,created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    return (data as MessageRow[]).reverse().map(mapMessage);
  }

  public async applyQualification(
    lead: Lead,
    result: EnrollmentAgentResult,
    hotThreshold: number,
  ): Promise<Lead> {
    const leadScore = result.requiresHuman
      ? lead.leadScore
      : Math.max(lead.leadScore, result.leadScore);
    const status: Lead["status"] =
      lead.status === "opted_out"
        ? "opted_out"
        : result.requiresHuman
          ? "human_review"
          : leadScore >= hotThreshold
            ? "hot"
            : "qualifying";

    const { data, error } = await this.client
      .from("leads")
      .update({
        first_name: result.extracted.firstName ?? lead.firstName,
        email: result.extracted.email ?? lead.email,
        training_goal: result.extracted.trainingGoal ?? lead.trainingGoal,
        experience_level: result.extracted.experienceLevel ?? lead.experienceLevel,
        desired_start_date: result.extracted.desiredStartDate ?? lead.desiredStartDate,
        availability: result.extracted.availability ?? lead.availability,
        discovery_flight_interest:
          result.extracted.discoveryFlightInterest ?? lead.discoveryFlightInterest,
        preferred_contact_method:
          result.extracted.preferredContactMethod ?? lead.preferredContactMethod,
        lead_score: leadScore,
        status,
      })
      .eq("id", lead.id)
      .select("*")
      .single();
    if (error) throw error;

    return mapLead(data as LeadRow);
  }

  public async updateConversationSummary(leadId: string, summary: string): Promise<void> {
    const conversationId = await this.getOrCreateConversationId(leadId);
    const { error } = await this.client
      .from("conversations")
      .update({ summary, last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
    if (error) throw error;
  }

  public async createOutboundMessage(leadId: string, body: string): Promise<{ id: string }> {
    const conversationId = await this.getOrCreateConversationId(leadId);
    const { data, error } = await this.client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        lead_id: leadId,
        direction: "outbound",
        channel: "sms",
        body,
        processing_status: "processed",
        delivery_status: "queued",
      })
      .select("id")
      .single();
    if (error) throw error;
    await this.touchConversation(conversationId);
    return data as { id: string };
  }

  public async markOutboundSent(messageId: string, providerMessageId: string): Promise<void> {
    const { error } = await this.client
      .from("messages")
      .update({ provider_message_sid: providerMessageId, delivery_status: "sent" })
      .eq("id", messageId);
    if (error) throw error;
  }

  public async markOutboundFailed(messageId: string, reason: string): Promise<void> {
    const { error } = await this.client
      .from("messages")
      .update({ delivery_status: "failed", processing_error: reason })
      .eq("id", messageId);
    if (error) throw error;
  }

  public async markInboundProcessed(providerMessageId: string): Promise<void> {
    const { error } = await this.client
      .from("messages")
      .update({ processing_status: "processed", processing_error: null })
      .eq("provider_message_sid", providerMessageId)
      .eq("direction", "inbound");
    if (error) throw error;
  }

  public async markInboundFailed(providerMessageId: string, reason: string): Promise<void> {
    const { error } = await this.client
      .from("messages")
      .update({ processing_status: "failed", processing_error: reason })
      .eq("provider_message_sid", providerMessageId)
      .eq("direction", "inbound");
    if (error) throw error;
  }

  public async markLeadOptedOut(leadId: string): Promise<Lead> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("leads")
      .update({ consent_status: "opted_out", status: "opted_out", opted_out_at: now })
      .eq("id", leadId)
      .select("*")
      .single();
    if (error) throw error;
    return mapLead(data as LeadRow);
  }

  public async markHotLeadAlerted(
    leadId: string,
    metadata: Record<string, unknown>,
  ): Promise<boolean> {
    const { data, error } = await this.client.rpc("mark_hot_lead_alerted", {
      p_lead_id: leadId,
      p_metadata: metadata,
    });
    if (error) throw error;
    return data === true;
  }

  private async findLead(schoolId: string, phone: string): Promise<Lead | null> {
    const { data, error } = await this.client
      .from("leads")
      .select("*")
      .eq("school_id", schoolId)
      .eq("phone", phone)
      .maybeSingle();
    if (error) throw error;
    return data ? mapLead(data as LeadRow) : null;
  }

  private async getOrCreateConversationId(leadId: string): Promise<string> {
    const existing = await this.client
      .from("conversations")
      .select("id")
      .eq("lead_id", leadId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return (existing.data as { id: string }).id;

    const inserted = await this.client
      .from("conversations")
      .insert({ lead_id: leadId, status: "active" })
      .select("id")
      .single();
    if (!inserted.error) return (inserted.data as { id: string }).id;
    if (inserted.error.code !== "23505") throw inserted.error;

    const concurrent = await this.client
      .from("conversations")
      .select("id")
      .eq("lead_id", leadId)
      .single();
    if (concurrent.error) throw concurrent.error;
    return (concurrent.data as { id: string }).id;
  }

  private async touchConversation(conversationId: string): Promise<void> {
    const { error } = await this.client
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
    if (error) throw error;
  }
}

function mapSchool(row: SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    inboundPhone: row.inbound_phone,
    alertPhone: row.alert_phone,
    timezone: row.timezone,
    approvedFaq: row.approved_faq,
  };
}

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    schoolId: row.school_id,
    phone: row.phone,
    firstName: row.first_name,
    email: row.email,
    trainingGoal: row.training_goal,
    experienceLevel: row.experience_level,
    desiredStartDate: row.desired_start_date,
    availability: row.availability,
    discoveryFlightInterest: row.discovery_flight_interest,
    preferredContactMethod: row.preferred_contact_method,
    leadScore: row.lead_score,
    status: row.status,
    consentStatus: row.consent_status,
    hotLeadAlertedAt: row.hot_lead_alerted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    direction: row.direction,
    body: row.body,
    providerMessageId: row.provider_message_sid,
    createdAt: row.created_at,
  };
}
