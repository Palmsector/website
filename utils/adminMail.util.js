import { sendEmail as resendSendEmail } from "./sendEmail.js";

//Constants
const AdminEmail = process.env.ADMIN_EMAIL;

export async function sendEmail(subject, text) {
  try {
    await resendSendEmail({
      to: AdminEmail,
      subject,
      html: `<pre>${text}</pre>`,
    });

    console.log(`✅ Admin email sent to ${AdminEmail} | ${subject}`);
  } catch (error) {
    console.error("❌ Failed to send admin email via Resend:", error);
  }
}
