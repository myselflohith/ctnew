import nodemailer from 'nodemailer';

// Email configuration (using console for development, configure SMTP for production)
const transporter = nodemailer.createTransport({
  // For development, we'll log to console
  // In production, configure with actual SMTP settings
  streamTransport: true,
  newline: 'unix',
  buffer: true,
});

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@cardinaltalent.com',
    to: email,
    subject: 'Password Reset Request - CardinalTalent',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #b91c1c 0%, #f59e0b 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #b91c1c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CardinalTalent</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CardinalTalent. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // For development, log the email instead of sending
    console.log('\n' + '='.repeat(80));
    console.log('📧 PASSWORD RESET EMAIL (Development Mode)');
    console.log('='.repeat(80));
    console.log(`To: ${email}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send password reset email');
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<void> {
  const verifyUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@cardinaltalent.com',
    to: email,
    subject: 'Verify Your Email - CardinalTalent',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #b91c1c 0%, #f59e0b 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #b91c1c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CardinalTalent</h1>
          </div>
          <div class="content">
            <h2>Welcome to CardinalTalent!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for registering with CardinalTalent. Please verify your email address by clicking the button below:</p>
            <a href="${verifyUrl}" class="button">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CardinalTalent. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('\n📧 Verification email sent (logged in development mode)');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
