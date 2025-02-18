import nodemailer from 'nodemailer';

// Create reusable transporter with more detailed options
const transporter = nodemailer.createTransport({
  host: 'mail.opianfsgroup.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  debug: true, // Enable debug output
  logger: true // Log information to the console
});

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: EmailParams): Promise<boolean> {
  try {
    console.log('========== EMAIL SENDING ATTEMPT ==========');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Using EMAIL_USER:', process.env.EMAIL_USER);

    // Check if credentials are present
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('Missing email credentials');
      return false;
    }

    // Verify SMTP connection configuration
    console.log('Verifying SMTP connection...');
    const verification = await transporter.verify();
    console.log('SMTP Connection verified:', verification);

    // Attempt to send email
    console.log('Attempting to send email...');
    const result = await transporter.sendMail({
      from: `"OPIAN Rewards" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });

    console.log('Email sent successfully. Message ID:', result.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(result));
    console.log('Full result:', result);
    return true;
  } catch (error) {
    console.error('========== EMAIL ERROR ==========');
    console.error('Detailed email error:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return false;
  }
}

export function formatPointsAssignmentEmail(
  customerName: string,
  points: number,
  description: string,
  currentTier: string
): { text: string; html: string } {
  const text = `
    Dear ${customerName},

    ${points} points have been assigned to your account.
    Reason: ${description}

    Your current tier is: ${currentTier}

    Thank you for your business!
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Points Assignment Notification</h2>
      <p>Dear ${customerName},</p>
      <p><strong>${points}</strong> points have been assigned to your account.</p>
      <p><strong>Reason:</strong> ${description}</p>
      <p><strong>Your current tier:</strong> ${currentTier}</p>
      <br/>
      <p>Thank you for your business!</p>
    </div>
  `;

  return { text, html };
}

export function formatAdminNotificationEmail(
  customerName: string,
  points: number,
  description: string,
  adminName: string
): { text: string; html: string } {
  const text = `
    Hello ${adminName},

    Points Assignment Notification:
    Customer: ${customerName}
    Points: ${points}
    Reason: ${description}
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Points Assignment Notification</h2>
      <p>Hello ${adminName},</p>
      <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #0070f3;">
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Points:</strong> ${points}</p>
        <p><strong>Reason:</strong> ${description}</p>
      </div>
    </div>
  `;

  return { text, html };
}

export function formatRegistrationEmail(
  firstName: string,
  referralCode: string
): { text: string; html: string } {
  const text = `
    Welcome to OPIAN Rewards, ${firstName}!

    Thank you for joining our rewards program. Your account has been successfully created with 2,000 welcome bonus points!

    Your unique referral code is: ${referralCode}
    Share this code with friends to earn additional rewards when they sign up!

    Start exploring our rewards and benefits now.

    Best regards,
    The OPIAN Rewards Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #43EB3E;">Welcome to OPIAN Rewards!</h2>
      <p>Dear ${firstName},</p>
      <p>Thank you for joining our rewards program. Your account has been successfully created with <strong>2,000 welcome bonus points!</strong></p>
      <div style="background-color: #011d3d; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="color: #ffffff; margin: 0;">Your unique referral code is: <strong>${referralCode}</strong></p>
        <p style="color: #43EB3E; margin: 10px 0 0 0;">Share this code with friends to earn additional rewards when they sign up!</p>
      </div>
      <p>Start exploring our rewards and benefits now.</p>
      <br/>
      <p>Best regards,<br/>The OPIAN Rewards Team</p>
    </div>
  `;

  return { text, html };
}