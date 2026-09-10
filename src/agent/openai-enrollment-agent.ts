import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import type { EnrollmentAgent, EnrollmentAgentInput } from "../domain/ports.js";
import { EnrollmentAgentResultSchema, type EnrollmentAgentResult } from "../domain/schemas.js";
import { BASE_AGENT_INSTRUCTIONS, buildAgentInput } from "./prompt.js";

export class OpenAiEnrollmentAgent implements EnrollmentAgent {
  private readonly client: OpenAI;

  public constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  public async qualify(input: EnrollmentAgentInput): Promise<EnrollmentAgentResult> {
    const response = await this.client.responses.parse({
      model: this.model,
      store: false,
      input: [
        { role: "system", content: BASE_AGENT_INSTRUCTIONS },
        { role: "user", content: buildAgentInput(input) },
      ],
      text: {
        format: zodTextFormat(EnrollmentAgentResultSchema, "enrollment_qualification"),
      },
    });

    if (!response.output_parsed) {
      throw new Error("OpenAI returned no parsed enrollment result");
    }

    return EnrollmentAgentResultSchema.parse(response.output_parsed);
  }
}
