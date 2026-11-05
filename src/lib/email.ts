// import { Resend } from 'resend';
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
console.log(process.env.GMAIL_USER,"email");
// const resend = new Resend(process.env.RESEND_API_KEY);

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  console.log("1. Email function started");
  console.log("2. Gmail user:", process.env.GMAIL_USER);
  console.log("3. Recipient:", to);

  try {
    console.log("4. Checking SMTP connection...");

    await transporter.verify();

    console.log("5. SMTP connection successful");

    const info = await transporter.sendMail({
      from: `"Intervia" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("6. Email sent successfully:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });

    return info;
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    throw error;
  }
};

export const interviewEmailTemplate = ({
  interviewLink,
  companyName,
  jobRole,
}: {
  interviewLink: string;
  companyName: string;
  jobRole: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Interview Invitation</title>
</head>

<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7fb;padding:40px 16px;">
    <tr>
      <td align="center">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:580px;
            background-color:#ffffff;
            border-radius:16px;
            overflow:hidden;
            border:1px solid #e5e7eb;
          "
        >

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px;background-color:#111827;text-align:center;">
              <h1 style="
                margin:0;
                color:#ffffff;
                font-size:26px;
                line-height:34px;
              ">
                Interview Invitation
              </h1>

              <p style="
                margin:10px 0 0;
                color:#d1d5db;
                font-size:14px;
              ">
                ${companyName}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">

              <p style="
                margin:0 0 18px;
                font-size:16px;
                line-height:26px;
                color:#374151;
              ">
                Hello,
              </p>

              <p style="
                margin:0 0 24px;
                font-size:16px;
                line-height:26px;
                color:#374151;
              ">
                Thank you for your interest in joining
                <strong style="color:#111827;">
                  ${companyName}
                </strong>.
                We would like to invite you to an interview for the
                <strong style="color:#111827;">
                  ${jobRole}
                </strong>
                position.
              </p>

              <!-- Job Details -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background-color:#f9fafb;
                  border:1px solid #e5e7eb;
                  border-radius:12px;
                  margin-bottom:28px;
                "
              >
                <tr>
                  <td style="padding:20px;">

                    <p style="
                      margin:0 0 8px;
                      font-size:13px;
                      color:#6b7280;
                    ">
                      Company
                    </p>

                    <p style="
                      margin:0 0 18px;
                      font-size:16px;
                      font-weight:bold;
                      color:#111827;
                    ">
                      ${companyName}
                    </p>

                    <p style="
                      margin:0 0 8px;
                      font-size:13px;
                      color:#6b7280;
                    ">
                      Position
                    </p>

                    <p style="
                      margin:0;
                      font-size:16px;
                      font-weight:bold;
                      color:#111827;
                    ">
                      ${jobRole}
                    </p>

                  </td>
                </tr>
              </table>

              <p style="
                margin:0 0 28px;
                font-size:15px;
                line-height:24px;
                color:#4b5563;
              ">
                When you're ready, click the button below to start your interview.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">

                    <a
                      href="${interviewLink}"
                      style="
                        display:inline-block;
                        padding:15px 30px;
                        background-color:#111827;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:10px;
                        font-size:15px;
                        font-weight:bold;
                      "
                    >
                      Start Interview
                    </a>

                  </td>
                </tr>
              </table>

              <p style="
                margin:28px 0 0;
                font-size:13px;
                line-height:21px;
                color:#9ca3af;
                text-align:center;
              ">
                Please make sure you have a stable internet connection before starting your interview.
              </p>

              <!-- Fallback Link -->
              <p style="
                margin:24px 0 0;
                font-size:13px;
                line-height:21px;
                color:#9ca3af;
                word-break:break-all;
              ">
                If the button doesn't work, copy and paste this link into your browser:
                <br />
                <a
                  href="${interviewLink}"
                  style="
                    color:#4f46e5;
                    text-decoration:none;
                  "
                >
                  ${interviewLink}
                </a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              padding:24px 40px;
              background-color:#f9fafb;
              border-top:1px solid #e5e7eb;
              text-align:center;
            ">

              <p style="
                margin:0;
                font-size:12px;
                line-height:20px;
                color:#9ca3af;
              ">
                This email was sent by ${companyName} regarding your application for ${jobRole}.
              </p>

              <p style="
                margin:8px 0 0;
                font-size:12px;
                color:#9ca3af;
              ">
                © 2026 ${companyName}
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;






export const invitationEmailTemplate = (inviteLink: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Organization Invitation</title>
</head>

<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7fb;padding:40px 16px;">
    <tr>
      <td align="center">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;"
        >

          <tr>
            <td style="padding:32px 40px;background-color:#111827;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;">
                You're Invited!
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">

              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">
                Hello,
              </p>

              <p style="margin:0 0 28px;font-size:16px;line-height:26px;color:#374151;">
                You've been invited to join an organization. Click the button below to accept your invitation and get started.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">

                    <a
                      href="${inviteLink}"
                      style="
                        display:inline-block;
                        padding:14px 28px;
                        background-color:#111827;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:10px;
                        font-size:15px;
                        font-weight:bold;
                      "
                    >
                      Accept Invitation
                    </a>

                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;line-height:21px;color:#9ca3af;text-align:center;">
                This invitation will expire in 24 hours.
              </p>

              <p style="margin:24px 0 0;font-size:13px;line-height:21px;color:#9ca3af;word-break:break-all;">
                If the button doesn't work, copy and paste this link into your browser:
                <br />
                <a
                  href="${inviteLink}"
                  style="color:#4f46e5;text-decoration:none;"
                >
                  ${inviteLink}
                </a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:20px;color:#9ca3af;">
                This email was sent because you were invited to join an organization.
              </p>

              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                © 2026 Your Application
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

