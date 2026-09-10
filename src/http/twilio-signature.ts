import twilio from "twilio";

export interface TwilioSignatureInput {
  signature: string | undefined;
  requestUrl: string;
  params: Record<string, string>;
}

export type TwilioSignatureValidator = (input: TwilioSignatureInput) => boolean;

export function createTwilioSignatureValidator(
  authToken: string,
  publicBaseUrl: string,
  enabled = true,
): TwilioSignatureValidator {
  const baseUrl = publicBaseUrl.replace(/\/$/, "");

  return ({ signature, requestUrl, params }) => {
    if (!enabled) return true;
    if (!signature) return false;
    return twilio.validateRequest(authToken, signature, `${baseUrl}${requestUrl}`, params);
  };
}
