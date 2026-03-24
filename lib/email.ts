interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Development fallback - log to console
    console.log(`[EMAIL] To: ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    console.log(`[EMAIL] Body: ${html}`);
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "noreply@financefrz.com",
    to,
    subject,
    html,
  });
}

export function getVerificationEmailHtml(token: string, baseUrl: string) {
  const url = `${baseUrl}/verify-email?token=${token}`;
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #6366f1;">Verify your email</h1>
      <p>Click the button below to verify your email address for FinanceFrz.</p>
      <a href="${url}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
        Verify Email
      </a>
      <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
    </div>
  `;
}
