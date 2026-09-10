import { z } from "zod";

const EnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    PUBLIC_BASE_URL: z.string().url(),
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_MODEL: z.string().min(1).default("gpt-5-mini"),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    TWILIO_ACCOUNT_SID: z.string().startsWith("AC"),
    TWILIO_AUTH_TOKEN: z.string().min(1),
    TWILIO_VALIDATE_SIGNATURES: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    HOT_LEAD_THRESHOLD: z.coerce.number().int().min(1).max(10).default(8),
    RECENT_MESSAGE_LIMIT: z.coerce.number().int().min(1).max(50).default(12),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && !value.TWILIO_VALIDATE_SIGNATURES) {
      context.addIssue({
        code: "custom",
        path: ["TWILIO_VALIDATE_SIGNATURES"],
        message: "Twilio signature validation cannot be disabled in production",
      });
    }
  });

export type AppConfig = z.infer<typeof EnvironmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return EnvironmentSchema.parse(environment);
}
