import type {
  ConsentStatus,
  ExperienceLevel,
  LeadStatus,
  PreferredContactMethod,
  TrainingGoal,
} from "./schemas.js";

export interface School {
  id: string;
  name: string;
  inboundPhone: string;
  alertPhone: string | null;
  timezone: string;
  approvedFaq: Record<string, unknown>;
}

export interface Lead {
  id: string;
  schoolId: string;
  phone: string;
  firstName: string | null;
  email: string | null;
  trainingGoal: TrainingGoal | null;
  experienceLevel: ExperienceLevel | null;
  desiredStartDate: string | null;
  availability: string | null;
  discoveryFlightInterest: boolean | null;
  preferredContactMethod: PreferredContactMethod | null;
  leadScore: number;
  status: LeadStatus;
  consentStatus: ConsentStatus;
  hotLeadAlertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  providerMessageId: string | null;
  createdAt: string;
}
