import { describe, expect, it } from "vitest";

import type {
  EnrollmentAgent,
  EnrollmentAgentInput,
  HotLeadAlerter,
  LeadRepository,
  SmsSender,
} from "../src/domain/ports.js";
import type { EnrollmentAgentResult, TwilioInboundSms } from "../src/domain/schemas.js";
import type { ConversationMessage, Lead, School } from "../src/domain/types.js";
import { EnrollmentService } from "../src/services/enrollment-service.js";

const NOW = "2026-09-10T12:00:00.000Z";

describe("EnrollmentService", () => {
  it("runs the inbound -> qualify -> persist -> outbound reply path", async () => {
    const harness = createHarness(
      result({
        reply: "We offer private-pilot training. Are you hoping to fly recreationally or professionally?",
        leadScore: 5,
        extracted: {
          firstName: "Sam",
          trainingGoal: "private_recreational",
        },
      }),
    );

    const outcome = await harness.service.handleInbound(inbound());

    expect(outcome).toEqual({
      kind: "processed",
      leadId: "lead-1",
      leadScore: 5,
      reply: "We offer private-pilot training. Are you hoping to fly recreationally or professionally?",
      alerted: false,
    });
    expect(harness.agent.calls).toHaveLength(1);
    expect(harness.sender.sent).toEqual([
      {
        from: harness.school.inboundPhone,
        to: "+15555550199",
        body: "We offer private-pilot training. Are you hoping to fly recreationally or professionally?",
      },
    ]);
    expect(harness.repository.lead.firstName).toBe("Sam");
    expect(harness.repository.lead.trainingGoal).toBe("private_recreational");
    expect(harness.repository.lead.status).toBe("qualifying");
    expect(harness.repository.inboundStatuses.get("SM-1")).toBe("processed");
    expect(harness.alerter.alerts).toHaveLength(0);
  });

  it("alerts staff once after a lead becomes hot", async () => {
    const harness = createHarness(
      result({
        reply: "That sounds like a strong fit. Would you like staff to help arrange a discovery flight?",
        leadScore: 9,
        extracted: {
          firstName: "Jordan",
          trainingGoal: "career",
          experienceLevel: "none",
          desiredStartDate: "next month",
          discoveryFlightInterest: true,
        },
      }),
    );

    const first = await harness.service.handleInbound(inbound());
    const second = await harness.service.handleInbound(inbound({ MessageSid: "SM-2", Body: "Yes, please." }));

    expect(first.kind).toBe("processed");
    expect(second.kind).toBe("processed");
    expect(harness.repository.lead.status).toBe("hot");
    expect(harness.repository.lead.leadScore).toBe(9);
    expect(harness.alerter.alerts).toHaveLength(1);
    expect(harness.alerter.alerts[0]?.lead.phone).toBe("+15555550199");
    expect(harness.sender.sent).toHaveLength(2);
  });

  it("retries only the staff alert when alert delivery fails after the prospect reply", async () => {
    const harness = createHarness(result({ leadScore: 9 }));
    harness.alerter.failNext = true;

    await expect(harness.service.handleInbound(inbound())).rejects.toThrow("alert unavailable");
    const retried = await harness.service.handleInbound(inbound());

    expect(retried).toEqual({ kind: "duplicate", leadId: "lead-1", alerted: true });
    expect(harness.repository.inboundStatuses.get("SM-1")).toBe("processed");
    expect(harness.agent.calls).toHaveLength(1);
    expect(harness.sender.sent).toHaveLength(1);
    expect(harness.alerter.attempts).toBe(2);
    expect(harness.alerter.alerts).toHaveLength(1);
  });

  it("does not call AI or send again for a processed duplicate MessageSid", async () => {
    const harness = createHarness(result({ leadScore: 4 }));

    await harness.service.handleInbound(inbound());
    const duplicate = await harness.service.handleInbound(inbound());

    expect(duplicate).toEqual({ kind: "duplicate", leadId: "lead-1", alerted: false });
    expect(harness.agent.calls).toHaveLength(1);
    expect(harness.sender.sent).toHaveLength(1);
  });

  it("routes safety-sensitive questions to human review without making them hot", async () => {
    const harness = createHarness(
      result({
        reply: "A qualified staff member should help with that weather decision. I can ask them to follow up.",
        intent: "safety_sensitive",
        leadScore: 9,
        requiresHuman: true,
        humanReason: "Asked for a go/no-go weather decision",
      }),
    );

    await harness.service.handleInbound(
      inbound({ Body: "The ceiling is low tomorrow. Is it safe for me to fly the lesson?" }),
    );

    expect(harness.repository.lead.status).toBe("human_review");
    expect(harness.repository.lead.leadScore).toBe(1);
    expect(harness.alerter.alerts).toHaveLength(0);
    expect(harness.sender.sent[0]?.body).toContain("qualified staff member");
  });

  it("records a standard opt-out before the model and suppresses application replies", async () => {
    const harness = createHarness(result());

    const outcome = await harness.service.handleInbound(inbound({ Body: " stop " }));

    expect(outcome).toEqual({ kind: "opted_out", leadId: "lead-1" });
    expect(harness.repository.lead.status).toBe("opted_out");
    expect(harness.repository.lead.consentStatus).toBe("opted_out");
    expect(harness.agent.calls).toHaveLength(0);
    expect(harness.sender.sent).toHaveLength(0);
    expect(harness.alerter.alerts).toHaveLength(0);
  });
});

function createHarness(agentResult: EnrollmentAgentResult) {
  const school: School = {
    id: "school-1",
    name: "Front Range Flight Academy",
    inboundPhone: "+15555550100",
    alertPhone: "+15555550101",
    timezone: "America/Denver",
    approvedFaq: { programs: ["Private Pilot Certificate"] },
  };
  const repository = new MemoryRepository(school);
  const agent = new FakeAgent(agentResult);
  const sender = new FakeSmsSender();
  const alerter = new FakeAlerter();
  const service = new EnrollmentService(repository, agent, sender, alerter, {
    hotLeadThreshold: 8,
    recentMessageLimit: 12,
  });

  return { service, school, repository, agent, sender, alerter };
}

function inbound(overrides: Partial<TwilioInboundSms> = {}): TwilioInboundSms {
  return {
    MessageSid: "SM-1",
    From: "+15555550199",
    To: "+15555550100",
    Body: "Hi, I want to learn to fly.",
    ...overrides,
  };
}

function result(
  overrides: Partial<Omit<EnrollmentAgentResult, "extracted">> & {
    extracted?: Partial<EnrollmentAgentResult["extracted"]>;
  } = {},
): EnrollmentAgentResult {
  return {
    reply: "Thanks for reaching out. What kind of flying are you interested in?",
    intent: "flight_training_inquiry",
    extracted: {
      firstName: null,
      email: null,
      trainingGoal: null,
      experienceLevel: null,
      desiredStartDate: null,
      availability: null,
      discoveryFlightInterest: null,
      preferredContactMethod: null,
      ...overrides.extracted,
    },
    leadScore: 3,
    requiresHuman: false,
    humanReason: null,
    conversationSummary: "Prospect asked about flight training.",
    ...withoutExtracted(overrides),
  };
}

function withoutExtracted(
  value: Partial<Omit<EnrollmentAgentResult, "extracted">> & {
    extracted?: Partial<EnrollmentAgentResult["extracted"]>;
  },
): Partial<Omit<EnrollmentAgentResult, "extracted">> {
  const { extracted: _extracted, ...rest } = value;
  return rest;
}

class FakeAgent implements EnrollmentAgent {
  public readonly calls: EnrollmentAgentInput[] = [];

  public constructor(private readonly response: EnrollmentAgentResult) {}

  public async qualify(input: EnrollmentAgentInput): Promise<EnrollmentAgentResult> {
    this.calls.push(input);
    return this.response;
  }
}

class FakeSmsSender implements SmsSender {
  public readonly sent: Array<{ from: string; to: string; body: string }> = [];

  public async sendReply(input: {
    from: string;
    to: string;
    body: string;
  }): Promise<{ providerMessageId: string }> {
    this.sent.push(input);
    return { providerMessageId: `SM-OUT-${this.sent.length}` };
  }
}

class FakeAlerter implements HotLeadAlerter {
  public readonly alerts: Array<{ school: School; lead: Lead; summary: string }> = [];
  public attempts = 0;
  public failNext = false;

  public async sendHotLeadAlert(input: {
    school: School;
    lead: Lead;
    summary: string;
  }): Promise<{ providerMessageId: string }> {
    this.attempts += 1;
    if (this.failNext) {
      this.failNext = false;
      throw new Error("alert unavailable");
    }
    this.alerts.push(input);
    return { providerMessageId: `SM-ALERT-${this.alerts.length}` };
  }
}

class MemoryRepository implements LeadRepository {
  public lead: Lead;
  public readonly messages: ConversationMessage[] = [];
  public readonly inboundStatuses = new Map<string, "pending" | "processed" | "failed">();

  public constructor(private readonly school: School) {
    this.lead = {
      id: "lead-1",
      schoolId: school.id,
      phone: "+15555550199",
      firstName: null,
      email: null,
      trainingGoal: null,
      experienceLevel: null,
      desiredStartDate: null,
      availability: null,
      discoveryFlightInterest: null,
      preferredContactMethod: null,
      leadScore: 1,
      status: "new",
      consentStatus: "unknown",
      hotLeadAlertedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
  }

  public async findSchoolByInboundPhone(phone: string): Promise<School | null> {
    return phone === this.school.inboundPhone ? this.school : null;
  }

  public async getOrCreateLead(): Promise<Lead> {
    return { ...this.lead };
  }

  public async claimInboundMessage(input: {
    leadId: string;
    providerMessageId: string;
    body: string;
  }): Promise<{ state: "claimed" | "retry" | "duplicate"; messageId: string }> {
    const status = this.inboundStatuses.get(input.providerMessageId);
    if (status === "failed") {
      this.inboundStatuses.set(input.providerMessageId, "pending");
      return { state: "retry", messageId: `in-${input.providerMessageId}` };
    }
    if (status) return { state: "duplicate", messageId: `in-${input.providerMessageId}` };

    this.inboundStatuses.set(input.providerMessageId, "pending");
    this.messages.push({
      id: `in-${input.providerMessageId}`,
      direction: "inbound",
      body: input.body,
      providerMessageId: input.providerMessageId,
      createdAt: NOW,
    });
    return { state: "claimed", messageId: `in-${input.providerMessageId}` };
  }

  public async getRecentMessages(_leadId: string, limit: number): Promise<ConversationMessage[]> {
    return this.messages.slice(-limit);
  }

  public async applyQualification(
    lead: Lead,
    agentResult: EnrollmentAgentResult,
    hotThreshold: number,
  ): Promise<Lead> {
    const leadScore = agentResult.requiresHuman
      ? lead.leadScore
      : Math.max(lead.leadScore, agentResult.leadScore);
    this.lead = {
      ...lead,
      firstName: agentResult.extracted.firstName ?? lead.firstName,
      email: agentResult.extracted.email ?? lead.email,
      trainingGoal: agentResult.extracted.trainingGoal ?? lead.trainingGoal,
      experienceLevel: agentResult.extracted.experienceLevel ?? lead.experienceLevel,
      desiredStartDate: agentResult.extracted.desiredStartDate ?? lead.desiredStartDate,
      availability: agentResult.extracted.availability ?? lead.availability,
      discoveryFlightInterest:
        agentResult.extracted.discoveryFlightInterest ?? lead.discoveryFlightInterest,
      preferredContactMethod:
        agentResult.extracted.preferredContactMethod ?? lead.preferredContactMethod,
      leadScore,
      status: agentResult.requiresHuman ? "human_review" : leadScore >= hotThreshold ? "hot" : "qualifying",
    };
    return { ...this.lead };
  }

  public async updateConversationSummary(): Promise<void> {}

  public async createOutboundMessage(_leadId: string, body: string): Promise<{ id: string }> {
    const id = `out-${this.messages.length + 1}`;
    this.messages.push({ id, direction: "outbound", body, providerMessageId: null, createdAt: NOW });
    return { id };
  }

  public async markOutboundSent(messageId: string, providerMessageId: string): Promise<void> {
    const message = this.messages.find((candidate) => candidate.id === messageId);
    if (message) message.providerMessageId = providerMessageId;
  }

  public async markOutboundFailed(): Promise<void> {}

  public async markInboundProcessed(providerMessageId: string): Promise<void> {
    this.inboundStatuses.set(providerMessageId, "processed");
  }

  public async markInboundFailed(providerMessageId: string): Promise<void> {
    this.inboundStatuses.set(providerMessageId, "failed");
  }

  public async markLeadOptedOut(): Promise<Lead> {
    this.lead = { ...this.lead, status: "opted_out", consentStatus: "opted_out" };
    return { ...this.lead };
  }

  public async markHotLeadAlerted(): Promise<boolean> {
    if (this.lead.hotLeadAlertedAt) return false;
    this.lead = { ...this.lead, hotLeadAlertedAt: NOW };
    return true;
  }
}
