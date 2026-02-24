import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';

const EMAIL_FROM = 'cardin@cardinaltalent.ai';

// Support both AWS_* and SES_* env vars (e.g. from production .env)
const AWS_REGION = process.env.AWS_REGION || process.env.SES_REGION || 'us-east-1';
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || process.env.SES_ACCESS_KEY || '';
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || process.env.SES_SECRET_KEY || '';

const sesClient =
  AWS_ACCESS_KEY && AWS_SECRET_KEY
    ? new SESClient({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY,
          secretAccessKey: AWS_SECRET_KEY,
        },
      })
    : null;

/** Send an email via AWS SES using raw MIME. Requires AWS SES credentials in .env. */
async function sendEmailViaSES(
  to: string,
  subject: string,
  html: string,
  fromAddress: string,
  options?: { replyTo?: string; fromDisplayName?: string }
): Promise<void> {
  if (!sesClient) {
    throw new Error(
      'AWS SES credentials not configured. Set AWS_ACCESS_KEY and AWS_SECRET_KEY (or SES_ACCESS_KEY and SES_SECRET_KEY) and AWS_REGION (or SES_REGION) in .env.'
    );
  }
  const from = options?.fromDisplayName
    ? `"${options.fromDisplayName.replace(/"/g, '\\"')}" <${fromAddress}>`
    : fromAddress;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    ...(options?.replyTo ? [`Reply-To: ${options.replyTo}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ];
  const mime = headers.join('\r\n');
  const command = new SendRawEmailCommand({
    RawMessage: {
      Data: Buffer.from(mime, 'utf-8'),
    },
    Source: fromAddress,
    Destinations: [to],
  });
  await sesClient.send(command);
}

// Helper function to generate the common email HTML structure
function generateEmailHtml(title: string, headerContent: string, bodyContent: string, footerContent: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body {
                font-family: 'Inter', 'Outfit', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #e9ecef; /* Lighter background */
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
                width: 100% !important;
            }
            table {
                border-collapse: collapse;
                width: 100%;
            }
            td {
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 30px auto; /* Add vertical margin */
                background-color: #ffffff;
                border-radius: 12px; /* Slightly more rounded corners */
                overflow: hidden;
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1); /* More prominent shadow */
            }
            .header {
                background: linear-gradient(135deg, hsl(349 78% 44%), hsl(38 92% 50%)); /* Cardinal DEFAULT to Amber DEFAULT */
                padding: 30px 20px; /* Increased padding */
                text-align: center;
                color: #ffffff;
            }
            .header h1 {
                margin: 10px 0 0; /* Adjusted margin */
                font-size: 32px; /* Larger font size */
                font-family: 'Outfit', sans-serif;
                font-weight: 700; /* Bolder */
                color: hsl(38 92% 50%); /* Amber DEFAULT for text logo */
            }
            .content {
                padding: 40px 30px; /* Increased padding */
                color: #333333;
                line-height: 1.8; /* Improved line height */
                font-size: 16px; /* Slightly larger font size */
            }
            .content h2 {
                color: hsl(349 78% 44%); /* Cardinal DEFAULT */
                font-family: 'Outfit', sans-serif;
                font-size: 26px; /* Larger font size */
                margin-top: 0;
                margin-bottom: 20px; /* Added bottom margin */
                font-weight: 600;
            }
            .button {
                display: inline-block;
                background-color: hsl(38 92% 50%); /* Amber DEFAULT */
                color: #ffffff;
                padding: 15px 30px; /* Larger padding */
                border-radius: 8px; /* More rounded button */
                text-decoration: none;
                font-weight: bold;
                margin-top: 25px; /* Increased top margin */
                font-size: 16px;
                transition: background-color 0.3s ease; /* Smooth transition */
            }
            .button:hover {
                background-color: hsl(43 96% 56%); /* Amber light on hover */
            }
            .footer {
                background-color: #f0f0f0; /* Slightly darker footer background */
                padding: 25px 20px; /* Increased padding */
                text-align: center;
                font-size: 13px; /* Slightly larger font size */
                color: #666666; /* Darker text color */
                border-top: 1px solid #e0e0e0; /* Darker border */
            }
            .footer a {
                color: hsl(349 78% 44%); /* Cardinal DEFAULT */
                text-decoration: none;
                font-weight: 500;
            }
            .footer a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <table role="presentation" class="container" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                            <td class="header">
                                ${headerContent}
                            </td>
                        </tr>
                        <tr>
                            <td class="content">
                                ${bodyContent}
                            </td>
                        </tr>
                        <tr>
                            <td class="footer">
                                ${footerContent}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `;
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.APP_URL || 'http://172.17.252.184:5173'}/reset-password?token=${resetToken}`;

  const headerContent = `
    <h1>CardinalTalent</h1>
  `;

  const bodyContent = `
    <h2 style="text-align: center;">Password Reset Request</h2>
    <p>Hello ${name},</p>
    <p>We received a request to reset the password for your CardinalTalent account. If you made this request, please click the button below to set a new password:</p>
    <p style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="button">Reset Your Password</a>
    </p>
    <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
    <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
    <p>Best regards,<br>The CardinalTalent Team</p>
  `;

  const footerContent = `
    <p>&copy; ${new Date().getFullYear()} CardinalTalent. All rights reserved.</p>
    <p>
        <a href="${process.env.APP_URL || 'http://172.17.252.184:5173'}/privacy-policy" style="color: hsl(349 78% 44%); text-decoration: none;">Privacy Policy</a>
    </p>
  `;

  const html = generateEmailHtml('CardinalTalent Password Reset', headerContent, bodyContent, footerContent);

  try {
    await sendEmailViaSES(email, 'Password Reset Request - CardinalTalent', html, EMAIL_FROM);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<void> {
  const verifyUrl = `${process.env.APP_URL || 'http://172.17.252.184:5173'}/verify-email?token=${verificationToken}`;

  const headerContent = `
    <h1>CardinalTalent</h1>
  `;

  const bodyContent = `
    <h2 style="text-align: center;">Welcome to CardinalTalent!</h2>
    <p>Hello ${name},</p>
    <p>Thank you for registering with CardinalTalent. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
    <p style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" class="button">Verify Your Email</a>
    </p>
    <p>If you did not register for an account, please ignore this email or contact support if you have concerns.</p>
    <p>Best regards,<br>The CardinalTalent Team</p>
  `;

  const footerContent = `
    <p>&copy; ${new Date().getFullYear()} CardinalTalent. All rights reserved.</p>
    <p>
        <a href="${process.env.APP_URL || 'http://172.17.252.184:5173'}/privacy-policy" style="color: hsl(349 78% 44%); text-decoration: none;">Privacy Policy</a>
    </p>
  `;

  const html = generateEmailHtml('CardinalTalent Email Verification', headerContent, bodyContent, footerContent);

  try {
    await sendEmailViaSES(email, 'Verify Your Email - CardinalTalent', html, EMAIL_FROM);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendInterviewInviteEmail(
  candidateEmail: string,
  candidateName: string,
  interviewTitle: string,
  interviewLink: string
): Promise<void> {
  const headerContent = `
    <h1>CardinalTalent</h1>
  `;

  const bodyContent = `
    <h2 style="text-align: center;">You're Invited to an Interview!</h2>
    <p>Hello ${candidateName},</p>
    <p>You have been invited to participate in an AI interview: <strong>${interviewTitle}</strong></p>
    <p>Please click the button below to access your interview:</p>
    <p style="text-align: center; margin: 30px 0;">
        <a href="${interviewLink}" class="button">Start Interview</a>
    </p>
    <p>If you have any questions or need technical assistance, please contact our support team.</p>
    <p>Best regards,<br>The CardinalTalent Team</p>
  `;

  const footerContent = `
    <p>&copy; ${new Date().getFullYear()} CardinalTalent. All rights reserved.</p>
    <p>
        <a href="${process.env.APP_URL || 'http://172.17.252.184:5173'}/privacy-policy" style="color: hsl(349 78% 44%); text-decoration: none;">Privacy Policy</a>
    </p>
  `;

  const html = generateEmailHtml('CardinalTalent Interview Invitation', headerContent, bodyContent, footerContent);

  try {
    await sendEmailViaSES(candidateEmail, `Interview Invitation - ${interviewTitle} - CardinalTalent`, html, EMAIL_FROM);
    console.log(`Interview invite email sent to ${candidateEmail}`);
  } catch (error) {
    console.error('Error sending interview invite email:', error);
    throw new Error('Failed to send interview invite email');
  }
}

const COMPANY_APPROVAL_REQUEST_TO = process.env.COMPANY_APPROVAL_REQUEST_EMAIL || 'lokesha@poornam.com';

/** Send company approval request to internal team (AWS SES). Used when employer enters an unapproved company. */
export async function sendCompanyApprovalRequestEmail(
  displayName: string,
  userEmail: string,
  companyName: string
): Promise<void> {
  const headerContent = `
    <h1>CardinalTalent</h1>
  `;

  const bodyContent = `
    <h2 style="text-align: center;">Company approval request</h2>
    <p>An employer has requested that the following company be added as an approved organization:</p>
    <p><strong>Requester name:</strong> ${displayName}</p>
    <p><strong>Requester email:</strong> ${userEmail}</p>
    <p><strong>Company entered:</strong> ${companyName}</p>
    <p>Please add this company as an approved organization in Cardinal Talent if appropriate.</p>
    <p>Best regards,<br>CardinalTalent</p>
  `;

  const footerContent = `
    <p>&copy; ${new Date().getFullYear()} CardinalTalent. All rights reserved.</p>
  `;

  const html = generateEmailHtml('CardinalTalent - Company approval request', headerContent, bodyContent, footerContent);

  try {
    const fromDisplayName = userEmail ? `${displayName} <${userEmail}>` : displayName;
    await sendEmailViaSES(
      COMPANY_APPROVAL_REQUEST_TO,
      'Cardinal Talent - Company not approved - Approval request',
      html,
      EMAIL_FROM,
      { replyTo: userEmail || undefined, fromDisplayName: fromDisplayName }
    );
    console.log(`Company approval request email sent to ${COMPANY_APPROVAL_REQUEST_TO} for company: ${companyName}`);
  } catch (error) {
    console.error('Error sending company approval request email:', error);
    throw new Error('Failed to send company approval request email');
  }
}
