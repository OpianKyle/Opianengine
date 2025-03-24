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
  email: string
): { text: string; html: string } {
  const text = `
    Dear ${firstName},

    Welcome to Opian Rewards!

    Thank you for joining us on your journey to grow, save, and earn through Opian Rewards. Here, every financial decision is an Opportunity—whether it's reducing costs, earning rewards, or building long-term wealth.

    Your Next Steps:
    1. Sign in: Visit our platform and log in using your credentials:
       Username: ${email}
       Password: 123456
    2. Secure your account: Change your password to something strong and unique.
    3. Activate your rewards: Start engaging on the Opian journey with referral, financial product engagement and merchant rewards and unlock great benefits!
    4. Earn as you go: Every interaction brings you closer to bigger rewards and exclusive perks. We will guide you on your journey all the way, so expect regular communication from us.

    White-list the numbers and email addresses you receive communication from us, so you can always stay in the LOOP!

    The Opian Rewards System is designed to empower you financially—whether through savings, earnings, or smart financial choices.

    For assistance, contact our support team:
    📞 Call: 0861 263 346
    💬 WhatsApp: 0861 263 346
    📧 Email: clientservices@opianfsgroup.com

    Your biggest financial journey starts now! Let's make it rewarding!

    Best regards,

    Lance Heynes
    CEO, Opian Financial Services (Pty) Ltd

    Opian Financial Services (Pty) Ltd is an Authorised Financial Services Provider
    Company Registration Number: 2018/584168/07 FSP No: 50974
    Company Address: 260 Uys Krige Drive, Loevenstein, Bellville, 7530, Western Cape
    Tel: 0861 263 346 | Email: info@opianfsgroup.com | Website: www.opianfsgroup.com
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #011d3d;">Dear ${firstName},</h2>
      <h1 style="color: #43EB3E;">Welcome to Opian Rewards!</h1>

      <p style="color: #011d3d; line-height: 1.6;">
        Thank you for joining us on your journey to grow, save, and earn through Opian Rewards. Here, every financial decision is an Opportunity—whether it's reducing costs, earning rewards, or building long-term wealth.
      </p>

      <div style="background-color: #011d3d; padding: 20px; border-radius: 5px; color: white; margin: 20px 0;">
        <h3 style="color: #43EB3E;">Your Next Steps:</h3>
        <ol style="line-height: 1.8;">
          <li><strong>Sign in:</strong> Visit our platform and log in using your credentials:
            <div style="background: rgba(255,255,255,0.1); padding: 10px; margin: 10px 0; border-radius: 3px;">
              Username: ${email}<br>
              Password: 123456
            </div>
          </li>
          <li><strong>Secure your account:</strong> Change your password to something strong and unique.</li>
          <li><strong>Activate your rewards:</strong> Start engaging on the Opian journey with referral, financial product engagement and merchant rewards and unlock great benefits!</li>
          <li><strong>Earn as you go:</strong> Every interaction brings you closer to bigger rewards and exclusive perks.</li>
        </ol>
      </div>

      <p style="color: #011d3d; background-color: #f5f5f5; padding: 15px; border-left: 4px solid #43EB3E;">
        <strong>Important:</strong> White-list the numbers and email addresses you receive communication from us, so you can always stay in the LOOP!
      </p>

      <p style="color: #011d3d; line-height: 1.6;">
        The Opian Rewards System is designed to empower you financially—whether through savings, earnings, or smart financial choices.
      </p>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #011d3d; margin-top: 0;">For assistance, contact our support team:</h3>
        <p style="line-height: 1.8;">
          📞 Call: <a href="tel:0861263346" style="color: #43EB3E;">0861 263 346</a><br>
          💬 WhatsApp: <a href="tel:0861263346" style="color: #43EB3E;">0861 263 346</a><br>
          📧 Email: <a href="mailto:clientservices@opianfsgroup.com" style="color: #43EB3E;">clientservices@opianfsgroup.com</a>
        </p>
      </div>

      <p style="color: #011d3d; font-size: 18px; font-weight: bold;">
        Your biggest financial journey starts now! Let's make it rewarding!
      </p>

      <p style="color: #011d3d; margin: 20px 0;">
        Best regards,<br><br>
        <img src="https://opianrewards.co.za/Assets/lance.png" alt="Lance Heynes Signature" style="max-width: 200px; margin: 10px 0;"><br>
        <strong>Lance Heynes</strong><br>
        CEO, Opian Financial Services (Pty) Ltd
      </p>

      <hr style="border: 1px solid #eee; margin: 30px 0;">

      <div style="color: #666; font-size: 12px; line-height: 1.6;">
        <p><strong>Opian Financial Services (Pty) Ltd</strong> is an Authorised Financial Services Provider</p>
        <p>Company Registration Number: 2018/584168/07 FSP No: 50974</p>
        <p>Company Address: 260 Uys Krige Drive, Loevenstein, Bellville, 7530, Western Cape</p>
        <p>
          Tel: <a href="tel:0861263346" style="color: #43EB3E;">0861 263 346</a> |
          Email: <a href="mailto:info@opianfsgroup.com" style="color: #43EB3E;">info@opianfsgroup.com</a> |
          Website: <a href="http://www.opianfsgroup.com" style="color: #43EB3E;">www.opianfsgroup.com</a>
        </p>
      </div>
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