import "server-only";
import { env } from "@/lib/cf";

export type SendEmailInput = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/**
 * Send an outbound email through the Cloudflare Email Service binding.
 * Docs: https://developers.cloudflare.com/email-service/get-started/send-emails/
 *
 * The binding takes a structured payload (no MIME assembly) and delivers via
 * the verified sender domain configured in the dashboard. Sender must be on
 * an onboarded domain — see `EMAIL_FROM` in wrangler.toml.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const e = env();
  const fromAddr = e.EMAIL_FROM;
  const fromName = e.EMAIL_FROM_NAME;

  // Email Service binding wants either a bare address or { name, email } —
  // it rejects RFC-822 `Name <addr>` style with "Invalid email user".
  const from = fromName ? { name: fromName, email: fromAddr } : fromAddr;

  await e.SEND_EMAIL.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  });
}
