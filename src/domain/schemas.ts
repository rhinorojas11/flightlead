import { z } from "zod";

export const TrainingGoalSchema = z.enum([
  "private_recreational",
  "career",
  "instrument",
  "commercial",
  "other",
]);

export const ExperienceLevelSchema = z.enum([
  "none",
  "discovery_flight",
  "student_pilot",
  "certificated_pilot",
  "other",
]);

export const PreferredContactMethodSchema = z.enum(["sms", "phone", "email"]);

export const LeadStatusSchema = z.enum([
  "new",
  "qualifying",
  "hot",
  "human_review",
  "opted_out",
  "closed",
]);

export const ConsentStatusSchema = z.enum(["unknown", "opted_in", "opted_out"]);

export const AgentIntentSchema = z.enum([
  "general_inquiry",
  "flight_training_inquiry",
  "discovery_flight",
  "pricing",
  "scheduling",
  "human_request",
  "safety_sensitive",
  "other",
]);

export const EnrollmentAgentResultSchema = z
  .object({
    reply: z.string().min(1).max(1500),
    intent: AgentIntentSchema,
    extracted: z
      .object({
        firstName: z.string().min(1).max(100).nullable(),
        email: z.string().email().max(320).nullable(),
        trainingGoal: TrainingGoalSchema.nullable(),
        experienceLevel: ExperienceLevelSchema.nullable(),
        desiredStartDate: z.string().min(1).max(100).nullable(),
        availability: z.string().min(1).max(500).nullable(),
        discoveryFlightInterest: z.boolean().nullable(),
        preferredContactMethod: PreferredContactMethodSchema.nullable(),
      })
      .strict(),
    leadScore: z.number().int().min(1).max(10),
    requiresHuman: z.boolean(),
    humanReason: z.string().min(1).max(500).nullable(),
    conversationSummary: z.string().min(1).max(1000),
  })
  .strict();

export const TwilioInboundSmsSchema = z.object({
  MessageSid: z.string().min(1).max(64),
  From: z.string().regex(/^\+[1-9]\d{7,14}$/, "From must be an E.164 phone number"),
  To: z.string().regex(/^\+[1-9]\d{7,14}$/, "To must be an E.164 phone number"),
  Body: z.string().trim().min(1).max(4000),
});

export type TrainingGoal = z.infer<typeof TrainingGoalSchema>;
export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>;
export type PreferredContactMethod = z.infer<typeof PreferredContactMethodSchema>;
export type LeadStatus = z.infer<typeof LeadStatusSchema>;
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;
export type EnrollmentAgentResult = z.infer<typeof EnrollmentAgentResultSchema>;
export type TwilioInboundSms = z.infer<typeof TwilioInboundSmsSchema>;
