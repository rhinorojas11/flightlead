import formBody from "@fastify/formbody";
import Fastify, { type FastifyInstance } from "fastify";

import type { EnrollmentTurnProcessor } from "../domain/ports.js";
import { TwilioInboundSmsSchema } from "../domain/schemas.js";
import { UnknownInboundNumberError } from "../services/enrollment-service.js";
import type { TwilioSignatureValidator } from "./twilio-signature.js";

export interface AppDependencies {
  processor: EnrollmentTurnProcessor;
  validateTwilioSignature: TwilioSignatureValidator;
  logger?: boolean;
}

export async function buildApp(dependencies: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({
    logger: dependencies.logger ?? false,
    bodyLimit: 16 * 1024,
  });
  await app.register(formBody);

  app.get("/health", async () => ({ status: "ok" }));

  app.post("/webhooks/twilio/sms", async (request, reply) => {
    const rawBody = asStringRecord(request.body);
    const parsed = TwilioInboundSmsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_twilio_payload" });
    }

    const signatureHeader = request.headers["x-twilio-signature"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (
      !dependencies.validateTwilioSignature({
        signature,
        requestUrl: request.url,
        params: rawBody,
      })
    ) {
      return reply.code(403).send({ error: "invalid_twilio_signature" });
    }

    try {
      const result = await dependencies.processor.handleInbound(parsed.data);
      return reply.code(200).send({ status: result.kind });
    } catch (error) {
      if (error instanceof UnknownInboundNumberError) {
        return reply.code(404).send({ error: "unknown_inbound_number" });
      }
      request.log.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "SMS turn failed");
      return reply.code(500).send({ error: "sms_processing_failed" });
    }
  });

  return app;
}

function asStringRecord(body: unknown): Record<string, string> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};

  return Object.fromEntries(
    Object.entries(body).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}
