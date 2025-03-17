import nodemailer from 'nodemailer';

// Create reusable transporter with Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail's predefined settings
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
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
    console.log('Using Gmail account:', process.env.GMAIL_USER);

    // Check if credentials are present
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Missing Gmail credentials');
      return false;
    }

    // Verify SMTP connection configuration
    console.log('Verifying SMTP connection...');
    const verification = await transporter.verify();
    console.log('SMTP Connection verified:', verification);

    // Attempt to send email
    console.log('Attempting to send email...');
    const result = await transporter.sendMail({
      from: `"OPIAN Rewards" <${process.env.GMAIL_USER}>`,
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

// Keep existing email formatting functions unchanged
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

export function formatQuoteRequestEmail(
  customerName: string,
  productName: string
): { text: string; html: string } {
  const text = `
    Dear ${customerName},

    Thank you for submitting a quote request for ${productName}. Your request has been received and is being processed.

    Our team will review your request and get back to you shortly with a detailed quote.

    Product: ${productName}
    Status: Under Review

    If you have any questions in the meantime, please don't hesitate to contact us.

    Best regards,
    The OPIAN Rewards Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #43EB3E;">Quote Request Confirmation</h2>
      <p>Dear ${customerName},</p>
      <p>Thank you for submitting a quote request. Your request has been received and is being processed.</p>

      <div style="background-color: #011d3d; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="color: #ffffff; margin: 0;"><strong>Product:</strong> ${productName}</p>
        <p style="color: #43EB3E; margin: 10px 0 0 0;"><strong>Status:</strong> Under Review</p>
      </div>

      <p>Our team will review your request and get back to you shortly with a detailed quote.</p>
      <p>If you have any questions in the meantime, please don't hesitate to contact us.</p>
      <br/>
      <p>Best regards,<br/>The OPIAN Rewards Team</p>
    </div>
  `;

  return { text, html };
}

export function formatAdminQuoteRequestEmail(
  customerName: string,
  customerEmail: string,
  productName: string,
  adminName: string
): { text: string; html: string } {
  const text = `
    Hello ${adminName},

    A new quote request has been submitted:

    Customer: ${customerName}
    Email: ${customerEmail}
    Product: ${productName}

    Please review this request and prepare a quote for the customer.

    Best regards,
    OPIAN Rewards System
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Quote Request</h2>
      <p>Hello ${adminName},</p>
      <p>A new quote request has been submitted.</p>

      <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #0070f3;">
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Product:</strong> ${productName}</p>
      </div>

      <p>Please review this request and prepare a quote for the customer.</p>
      <br/>
      <p>Best regards,<br/>OPIAN Rewards System</p>
    </div>
  `;

  return { text, html };
}