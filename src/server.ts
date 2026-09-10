import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

import { TwilioGateway } from "./adapters/twilio-gateway.js";
import { SupabaseLeadRepository } from "./adapters/supabase-lead-repository.js";
import { OpenAiEnrollmentAgent } from "./agent/openai-enrollment-agent.js";
import { loadConfig } from "./config.js";
import { buildApp } from "./http/app.js";
import { createTwilioSignatureValidator } from "./http/twilio-signature.js";
import { EnrollmentService } from "./services/enrollment-service.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const repository = new SupabaseLeadRepository(supabase);
  const agent = new OpenAiEnrollmentAgent(config.OPENAI_API_KEY, config.OPENAI_MODEL);
  const twilio = new TwilioGateway(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
  const processor = new EnrollmentService(repository, agent, twilio, twilio, {
    hotLeadThreshold: config.HOT_LEAD_THRESHOLD,
    recentMessageLimit: config.RECENT_MESSAGE_LIMIT,
  });

  const app = await buildApp({
    processor,
    logger: true,
    validateTwilioSignature: createTwilioSignatureValidator(
      config.TWILIO_AUTH_TOKEN,
      config.PUBLIC_BASE_URL,
      config.TWILIO_VALIDATE_SIGNATURES,
    ),
  });

  await app.listen({ host: config.HOST, port: config.PORT });
}

main().catch((error: unknown) => {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  process.stderr.write(`FlightLead failed to start: ${errorName}\n`);
  process.exitCode = 1;
});
