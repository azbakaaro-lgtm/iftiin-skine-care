import { ENV } from "./env";

/**
 * Sends a transactional email via Resend (https://resend.com) — free tier
 * covers a small app comfortably, no SMTP setup needed. Set RESEND_API_KEY
 * and RESEND_FROM_EMAIL to enable. If unset, the email is just logged to
 * the console instead of failing the request (useful for local dev).
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!ENV.resendApiKey || !ENV.resendFromEmail) {
    console.log(`[email] (RESEND not configured) To: ${to} | Subject: ${subject}\n${html}`);
    return true;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.resendApiKey}`,
      },
      body: JSON.stringify({ from: ENV.resendFromEmail, to, subject, html }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[email] Failed to send (${response.status}): ${detail}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[email] Error sending email:", error);
    return false;
  }
}
