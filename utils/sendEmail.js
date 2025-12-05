import { Resend } from "resend";

//Constants
const api = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL;
const replyEmail = process.env.REPLY_EMAIL;

const resend = new Resend(api);

export async function sendEmail({ to, subject, html }) {
  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      replyTo: replyEmail,
    });
    console.log("✅ Email sent via Resend:", data);
    return data;
  } catch (error) {
    console.error("❌ Failed to send email via Resend:", error);
    throw error;
  }
}
