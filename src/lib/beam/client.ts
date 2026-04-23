import "server-only";
import { env } from "../cf";

/**
 * Beamcheckout — thin API client.
 * Docs: https://docs.beamcheckout.com/
 *
 * Flow:
 *   1. Server → POST /api/v1/charges  (QR PromptPay charge, returns a
 *      hosted payment page URL + charge id)
 *   2. Browser → redirected to the hosted page (or renders QR in-line)
 *   3. Customer scans QR and pays via PromptPay
 *   4. Beam → POST /api/checkout/webhook  (our endpoint, HMAC-signed)
 *   5. On verified "succeeded" event we mark the order paid and grant
 *      entitlements.
 *
 * The API base path (`/api/v1`) is already baked into `BEAM_API_URL` in
 * wrangler.toml so callers just pass `/charges`.
 */

export interface BeamChargeInput {
  amount: number; // in satang (smallest unit)
  currency: "THB";
  referenceId: string; // our order id
  description: string;
  customer?: {
    email?: string;
    name?: string;
    phoneNumber?: string;
  };
  returnUrl: string;
  metadata?: Record<string, string>;
}

/**
 * Charge-create response shape as observed from Beam (April 2026).
 * Example for QR_PROMPT_PAY:
 *   { chargeId, paymentMethodType: "QR_PROMPT_PAY",
 *     actionRequired: "ENCODED_IMAGE",
 *     encodedImage: { imageBase64Encoded, rawData, expiry } }
 */
export interface BeamChargeResponse {
  chargeId: string;
  paymentMethodType?: string;
  actionRequired?: string;
  redirect?: { url?: string } | null;
  encodedImage?: {
    imageBase64Encoded?: string;
    rawData?: string;
    expiry?: string;
  };
  // Optional fields that may appear on other endpoints / methods
  status?: string;
  amount?: number;
  currency?: string;
  referenceId?: string;
  createdAt?: string;
}

async function beamFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const e = env();
  // Beam auth: HTTP Basic with `MerchantID:MerchantAPIKey`.
  // (Not Bearer. Docs: https://docs.beamcheckout.com/get-started/authentication)
  const basic = btoa(`${e.BEAM_MERCHANT_ID}:${e.BEAM_SECRET_KEY}`);
  const r = await fetch(`${e.BEAM_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "cudlaimue/1.0 (+https://www.cudlaimue.com)",
      ...(init.headers ?? {}),
    },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Beam ${path} ${r.status}: ${text.slice(0, 400)}`);
  }
  return (await r.json()) as T;
}

/**
 * Create a PromptPay QR charge. We only support PromptPay right now — the
 * payment method object shape means adding card/linepay later requires a
 * different field (`card: {...}` etc.), not an array of types.
 */
export async function createCharge(input: BeamChargeInput): Promise<BeamChargeResponse> {
  // QR expires 30 min from now — enough time for customer to scan + confirm
  // in their banking app.
  const expiryTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  return beamFetch<BeamChargeResponse>("/charges", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      referenceId: input.referenceId,
      description: input.description,
      customer: input.customer,
      returnUrl: input.returnUrl,
      paymentMethod: {
        paymentMethodType: "QR_PROMPT_PAY",
        qrPromptPay: { expiryTime },
      },
      skip3dsFlow: false,
      metadata: input.metadata,
    }),
  });
}

export async function getCharge(id: string) {
  return beamFetch<BeamChargeResponse & { status: string }>(`/charges/${id}`);
}
