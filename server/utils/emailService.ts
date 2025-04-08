import nodemailer from 'nodemailer';
import htmlPdf from 'html-pdf';
import { promisify } from 'util';
import mysql from 'mysql2/promise';

// Create reusable transporter with SMTP configuration
const createTransporter = () => {
  // Default to environment variables with specific fallbacks
  const host = process.env.SMTP_HOST || 'mail.opian.co.za';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || 'clientservices@opianrewards.com';
  const pass = process.env.SMTP_PASSWORD;
  
  // Determine if connection should be secure
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  // For debugging
  console.log('Email transporter configuration:', {
    host,
    port,
    secure,
    user,
    passProvided: pass ? 'Yes' : 'No'
  });
  
  return nodemailer.createTransport({
    host,
    port, 
    secure,
    auth: {
      user,
      pass
    },
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false
    },
    debug: process.env.NODE_ENV !== 'production',
    logger: process.env.NODE_ENV !== 'production'
  });
};

// Create transporter on demand to ensure we have the latest environment variables
let transporter: nodemailer.Transporter;

// Create connection pool
const pool = mysql.createPool({
  host: 'dedi1350.jnb1.host-h.net',
  user: 'admin',
  password: '8E33U976qa800F',
  database: 'opianrewards',
  port: 3306,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Add email logging function
async function logEmail(params: {
  recipientEmail: string;
  subject: string;
  emailType: string;
  status: 'SENT' | 'FAILED';
  errorMessage?: string;
  hasAttachments?: boolean;
  templateData?: any;
  htmlContent?: string;
  textContent?: string;
}) {
  const connection = await pool.getConnection();
  try {
    const query = `
      INSERT INTO email_logs (
        recipient_email, subject, html_content, text_content, 
        email_type, status, has_attachments, error_message, 
        template_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(query, [
      params.recipientEmail,
      params.subject,
      params.htmlContent || null,
      params.textContent || null,
      params.emailType,
      params.status,
      params.hasAttachments || false,
      params.errorMessage || null,
      params.templateData ? JSON.stringify(params.templateData) : null
    ]);

    console.log('Email logged successfully:', params);
  } catch (error) {
    console.error('Failed to log email:', error);
  } finally {
    connection.release();
  }
}

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  emailType?: string;
  templateData?: any;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export async function sendEmail({ to, subject, text, html, emailType = 'GENERAL', templateData, attachments }: EmailParams): Promise<boolean> {
  console.log(`Sending ${emailType} email to: ${to}`);
  if (attachments?.length) {
    console.log(`Email has ${attachments.length} attachment(s)`);
  }
  // Create a fresh transporter using the latest environment variables
  transporter = createTransporter();
  
  try {
    console.log('========== EMAIL SENDING ATTEMPT ==========');
    console.log('To:', to);
    console.log('Subject:', subject);
    
    // Attempt to send the email using our configured transporter
    console.log('Attempting to send email...');
    const mailOptions: any = {
      from: `"OPIAN Rewards" <clientservices@opianrewards.com>`,
      to,
      subject,
      text,
      html
    };
    
    // Add attachments if they exist
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }
    
    const result = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully. Message ID:', result.messageId);
    
    await logEmail({
      recipientEmail: to,
      subject,
      emailType,
      status: 'SENT',
      templateData,
      htmlContent: html,
      textContent: text
    });

    return true;
  } catch (error) {
    console.error('========== EMAIL ERROR ==========');
    console.error('Email sending failed:', error instanceof Error ? error.message : 'Unknown error');
    
    await logEmail({
      recipientEmail: to,
      subject,
      emailType,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      templateData,
      htmlContent: html,
      textContent: text
    });

    return false;
  }
}

export function formatPointsAssignmentEmail(
  customerName: string,
  points: number,
  description: string,
  currentTier: string
): { text: string; html: string } {
  // Use Replit domain for images (they actually work)
  const logoImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/opian-logo-white.png";
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
  // Use Replit domain for images (they actually work)
  const logoImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/opian-logo-white.png";
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

export function formatFundCardEmail(
  firstName: string,
): { text: string; html: string } {
  // Use Replit domain for images (they actually work)
  const signatureImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/lance.png";
  const logoImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/opian-logo-white.png";
  
  const text = `
    Dear ${firstName},
    
    Next STEP. Fund your Opian Rewards card!
    
    Thank you for joining this exciting journey to grow your Rewards through Opian Rewards Programme.
    
    Over the next weeks and months, you will be receiving a series of emails guiding you on the steps to get the maximum value out of your Rewards journey. Please engage so that you can attain the maximum value on rewards Remember, you get rewarded for:
    Your card transactions at merchant stores
    ‣ Upgrading your Financial portfolio
    Accepting comparative quotes on Life and Short-Term Insurance
    ➤ Buying financial and related products via our financial partners
    
    Your Next Step - Funding your card
    You would have received your Rewards card by now. Now is the time to fund your card!
    Visti any Standard Bank or do an EFT from your current bank account and deposit money into the following account
    Name: CENTRAL PAY Bank: STANDARD BANK Acc No: 1021 652 7021
    Important! Use the 8 Digit Number at the back, Card Number on the front, or Your ID Number as reference
    DO NOT USE YOUR NAME!
    
    Now you can start spending with your card at point-of-sale facilities, use your referral link to earn commission, and engage with our financial partners to get more value for your money!
    
    Please ensure you whitelist the numbers and email addresses where you receive communication from us, so you can always stay in the LOOP! Remember: The Opian Rewards System is designed to empower you financially-whether through savings, earnings, or smart financial choices.
    
    For assistance, contact our support team:
    📞 Call: 0861 263 346
    💬 WhatsApp: 063 581 2042
    📧 Email: clientservices@opianrewards.com
    
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #011d3d; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoImageUrl}" alt="Opian Rewards Logo" style="max-width: 200px;">
      </div>

      <div style="background-color: #011d3d; padding: 30px; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; margin: 20px 0; color: white;">
        <h2 style="color: white; margin-top: 0;">Dear ${firstName},</h2>
        <h1 style="color: #43EB3E;">Next STEP. Fund your Opian Rewards card!</h1>

        <p style="color: white; line-height: 1.6;">
          Thank you for joining this exciting journey to grow your Rewards through Opian Rewards Programme.
        </p>

        <p style="color: white; line-height: 1.6;">
          Over the next weeks and months, you will be receiving a series of emails guiding you on the steps to get the maximum value out of your Rewards journey. Please engage so that you can attain the maximum value on rewards.
        </p>

        <div style="background-color: rgba(255,255,255,0.05); padding: 20px; border-radius: 5px; color: white; margin: 20px 0;">
          <h3 style="color: #43EB3E; margin-top: 0;">Remember, you get rewarded for:</h3>
          <ul style="line-height: 1.8;">
            <li>Your card transactions at merchant stores</li>
            <li>Upgrading your Financial portfolio</li>
            <li>Accepting comparative quotes on Life and Short-Term Insurance</li>
            <li>Buying financial and related products via our financial partners</li>
          </ul>
        </div>

        <div style="background-color: rgba(255,255,255,0.05); padding: 20px; border-radius: 5px; color: white; margin: 30px 0;">
          <h3 style="color: #43EB3E; margin-top: 0;">Your Next Step - Funding your card</h3>
          <p style="line-height: 1.6;">You would have received your Rewards card by now. Now is the time to fund your card!</p>
          <p style="line-height: 1.6;">Visit any Standard Bank or do an EFT from your current bank account and deposit money into the following account:</p>
          
          <div style="background: rgba(255,255,255,0.1); padding: 15px; margin: 10px 0; border-radius: 3px;">
            <p style="margin: 5px 0; color: white;">Name: <strong>CENTRAL PAY</strong></p>
            <p style="margin: 5px 0; color: white;">Bank: <strong>STANDARD BANK</strong></p>
            <p style="margin: 5px 0; color: white;">Acc No: <strong>1021 652 7021</strong></p>
          </div>
          
          <div style="background-color: rgba(67,235,62,0.1); padding: 15px; border-left: 4px solid #43EB3E; margin: 20px 0;">
            <p style="color: white; margin: 0;"><strong>Important!</strong> Use the 8 Digit Number at the back, Card Number on the front, or Your ID Number as reference</p>
            <p style="color: white; font-weight: bold; margin-top: 10px;">DO NOT USE YOUR NAME!</p>
          </div>
        </div>

        <p style="color: white; line-height: 1.6;">
          Now you can start spending with your card at point-of-sale facilities, use your referral link to earn commission, and engage with our financial partners to get more value for your money!
        </p>

        <div style="background-color: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: white; line-height: 1.6;">
            Please ensure you whitelist the numbers and email addresses where you receive communication from us, so you can always stay in the LOOP! Remember: The Opian Rewards System is designed to empower you financially—whether through savings, earnings, or smart financial choices.
          </p>
        </div>

        <div style="background-color: rgba(255,255,255,0.05); padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #43EB3E; margin-top: 0;">For assistance, contact our support team:</h3>
          <p style="line-height: 1.8; color: white !important;">
            📞 Call: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="tel:0861263346" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">0861 263 346</a></span><br>
            💬 WhatsApp: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="tel:0635812042" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">063 581 2042</a></span><br>
            📧 Email: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="mailto:clientservices@opianrewards.com" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">clientservices@opianrewards.com</a></span>
          </p>
        </div>

        <p style="color: white; font-size: 18px; font-weight: bold;">
          Your biggest financial journey starts now! Let's make it rewarding!
        </p>

        <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
          <p style="color: white; margin: 20px 0;">
            Best regards,<br><br>
            <img src="${signatureImageUrl}" alt="Lance Heynes Signature" style="max-width: 200px; margin: 10px 0;"><br>
            <strong>Lance Heynes</strong><br>
            CEO, Opian Financial Services (Pty) Ltd
          </p>
        </div>

        <div style="color: rgba(255,255,255,0.7); font-size: 12px; line-height: 1.6; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
          <p><strong>Opian Financial Services (Pty) Ltd</strong> is an Authorised Financial Services Provider</p>
          <p>Company Registration Number: 2018/584168/07 FSP No: 50974</p>
          <p>Company Address: 260 Uys Krige Drive, Loevenstein, Bellville, 7530, Western Cape</p>
          <p style="color: white !important;">
            Tel: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="tel:0861263346" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">0861 263 346</a></span> |
            Email: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="mailto:info@opianfsgroup.com" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">info@opianfsgroup.com</a></span> |
            Website: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="http://www.opianfsgroup.com" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">www.opianfsgroup.com</a></span>
          </p>
        </div>
      </div>
    </div>
  `;

  return { text, html };
}

function getSignatureHTML(): string {
  // Use Replit domain for images (they actually work)
  const signatureImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/lance.png";
  const logoImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/opian-logo-white.png";
  
  return `
    <table cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 15px; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: top; width: 150px; padding-right: 15px;">
          <img src="${signatureImageUrl}" alt="Lance Heynes Signature" style="width: 140px; margin-bottom: 10px;">
          <img src="${logoImageUrl}" alt="Opian Logo" style="width: 100px;">
        </td>
        <td style="vertical-align: top; border-left: 2px solid #43EB3E; padding-left: 15px;">
          <p style="color: white; margin: 0 0 5px 0; font-size: 18px;"><strong>Lance Heynes</strong></p>
          <p style="color: white; margin: 0 0 5px 0; font-size: 14px;">Chief Executive Officer</p>
          <p style="color: #43EB3E; margin: 0 0 10px 0; font-size: 12px;">Opian Financial Services (Pty) Ltd</p>
        </td>
      </tr>
    </table>
  `;
}

export function formatRegistrationEmail(
  firstName: string,
  email: string
): { text: string; html: string } {
  // Use Replit domain for images (they actually work)
  const signatureImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/lance.png";
  const logoImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/opian-logo-white.png";
  const text = `
    Dear ${firstName},

    Welcome to Opian Rewards!

    Thank you for joining us on your journey to grow, save, and earn through Opian Rewards. Here, every financial decision is an Opportunity—whether it's reducing costs, earning rewards, or building long-term wealth.

    Your Next Steps:
    1. Sign in: Visit our platform at www.opian.co.za and log in using your credentials:
       Username: ${email}
       Password: 12345678
    2. Secure your account: Change your password to something strong and unique.
    3. Activate your rewards: Start engaging on the Opian journey with referral, financial product engagement and merchant rewards and unlock great benefits!
    4. Earn as you go: Every interaction brings you closer to bigger rewards and exclusive perks. We will guide you on your journey all the way, so expect regular communication from us.

    White-list the numbers and email addresses you receive communication from us, so you can always stay in the LOOP!

    The Opian Rewards System is designed to empower you financially—whether through savings, earnings, or smart financial choices.

    For assistance, contact our support team:
    📞 Call: 0861 263 346
    💬 WhatsApp: 0861 263 346
    📧 Email: clientservices@opianrewards.com

    Your biggest financial journey starts now! Let's make it rewarding!

    Best regards,

    Lance Heynes
    Chief Executive Officer
    Opian Financial Services (Pty) Ltd

    Opian Financial Services (Pty) Ltd is an Authorised Financial Services Provider
    Company Registration Number: 2018/584168/07 FSP No: 50974
    Company Address: 260 Uys Krige Drive, Loevenstein, Bellville, 7530, Western Cape
    Tel: 0861 263 346 | Email: info@opianfsgroup.com | Website: www.opianfsgroup.com
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #011d3d; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoImageUrl}" alt="Opian Rewards Logo" style="max-width: 200px;">
      </div>

      <div style="background-color: #011d3d; padding: 30px; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; margin: 20px 0; color: white;">
        <h2 style="color: white; margin-top: 0;">Dear ${firstName},</h2>
        <h1 style="color: #43EB3E;">Welcome to Opian Rewards!</h1>

        <p style="color: white; line-height: 1.6;">
          Thank you for joining us on your journey to grow, save, and earn through Opian Rewards. Here, every financial decision is an Opportunity—whether it's reducing costs, earning rewards, or building long-term wealth.
        </p>

        <div style="background-color: rgba(255,255,255,0.05); padding: 20px; border-radius: 5px; color: white; margin: 20px 0;">
          <h3 style="color: #43EB3E; margin-top: 0;">Your Next Steps:</h3>
          <ol style="line-height: 1.8;">
            <li><strong>Sign in:</strong> Visit our platform at <a href="https://www.opian.co.za" style="color: #43EB3E; text-decoration: underline; font-weight: bold;">www.opian.co.za</a> and log in using your credentials:
              <div style="background: rgba(255,255,255,0.1); padding: 15px; margin: 10px 0; border-radius: 3px;">
                <span style="color: #43EB3E;">Username:</span> <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;">${email}</span><br>
                <span style="color: #43EB3E;">Password:</span> <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;">12345678</span>
              </div>
            </li>
            <li><strong>Secure your account:</strong> Change your password to something strong and unique.</li>
            <li><strong>Activate your rewards:</strong> Start engaging on the Opian journey with referral, financial product engagement and merchant rewards and unlock great benefits!</li>
            <li><strong>Earn as you go:</strong> Every interaction brings you closer to bigger rewards and exclusive perks.</li>
          </ol>
        </div>

        <div style="background-color: rgba(67,235,62,0.1); padding: 15px; border-left: 4px solid #43EB3E; margin: 20px 0;">
          <strong>Important:</strong> White-list the numbers and email addresses you receive communication from us, so you can always stay in the LOOP!
        </div>

        <p style="color: white; line-height: 1.6;">
          The Opian Rewards System is designed to empower you financially—whether through savings, earnings, or smart financial choices.
        </p>

        <div style="background-color: rgba(255,255,255,0.05); padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #43EB3E; margin-top: 0;">For assistance, contact our support team:</h3>
          <p style="line-height: 1.8; color: white !important;">
            📞 Call: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="tel:0861263346" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">0861 263 346</a></span><br>
            💬 WhatsApp: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="tel:0861263346" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">0861 263 346</a></span><br>
            📧 Email: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="mailto:clientservices@opianrewards.com" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">clientservices@opianrewards.com</a></span>
          </p>
        </div>

        <p style="color: white; font-size: 18px; font-weight: bold;">
          Your biggest financial journey starts now! Let's make it rewarding!
        </p>

        <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
          <table cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 15px; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: top; width: 150px; padding-right: 15px;">
                <img src="${signatureImageUrl}" alt="Lance Heynes Signature" style="width: 140px; margin-bottom: 10px;">
                <img src="${logoImageUrl}" alt="Opian Logo" style="width: 100px;">
              </td>
              <td style="vertical-align: top; border-left: 2px solid #43EB3E; padding-left: 15px;">
                <p style="color: white; margin: 0 0 5px 0; font-size: 18px;"><strong>Lance Heynes</strong></p>
                <p style="color: white; margin: 0 0 5px 0; font-size: 14px;">Chief Executive Officer</p>
                <p style="color: #43EB3E; margin: 0 0 10px 0; font-size: 12px;">Opian Financial Services (Pty) Ltd</p>
              </td>
            </tr>
          </table>
        </div>

        <div style="color: rgba(255,255,255,0.7); font-size: 12px; line-height: 1.6; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
          <p><strong>Opian Financial Services (Pty) Ltd</strong> is an Authorised Financial Services Provider</p>
          <p>Company Registration Number: 2018/584168/07 FSP No: 50974</p>
          <p>Company Address: 260 Uys Krige Drive, Loevenstein, Bellville, 7530, Western Cape</p>
          <p style="color: white !important;">
            Tel: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="tel:0861263346" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">0861 263 346</a></span> |
            Email: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="mailto:info@opianfsgroup.com" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">info@opianfsgroup.com</a></span> |
            Website: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="http://www.opianfsgroup.com" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">www.opianfsgroup.com</a></span>
          </p>
        </div>
      </div>
    </div>
  `;

  return { text, html };
}

export function formatQuoteRequestEmail(
  customerName: string,
  productName: string
): { text: string; html: string } {
  // Use Replit domain for images (they actually work)
  const logoImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/opian-logo-white.png";
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
  // Use Replit domain for images (they actually work)
  const logoImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/opian-logo-white.png";
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

export function formatNewCustomerAdminEmail(
  customerData: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    selectedPackage: string;
    referralCode?: string;
    signature?: string;
    isSouthAfrican?: boolean;
    idNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    occupation?: string;
    industry?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    hasCreditCard?: boolean;
    bankName?: string;
    accountType?: string;
    accountNumber?: string;
    accountHolderName?: string;
    branchCode?: string;
    mandate_accepted?: boolean;
  }
): { text: string; html: string } {
  // Debug log to verify mandate_accepted is passed correctly
  console.log('Mandate accepted value in formatNewCustomerAdminEmail:', customerData.mandate_accepted);
  
  // Use Replit domain for images (they actually work)
  const logoImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/opian-logo-white.png";
  
  const text = `
    New Customer Registration

    Personal Details:
    First Name: ${customerData.firstName}
    Last Name: ${customerData.lastName}
    Email: ${customerData.email}
    Mobile Number: ${customerData.mobileNumber}
    ID Number: ${customerData.idNumber || 'Not provided'}
    Date of Birth: ${customerData.dateOfBirth || 'Not provided'}
    Gender: ${customerData.gender || 'Not provided'}
    South African Resident: ${customerData.isSouthAfrican ? 'Yes' : 'No'}

    Professional Information:
    Occupation: ${customerData.occupation || 'Not provided'}
    Industry: ${customerData.industry || 'Not provided'}

    Address Information:
    Address: ${customerData.address || 'Not provided'}
    City: ${customerData.city || 'Not provided'}
    Postal Code: ${customerData.postalCode || 'Not provided'}

    Banking Details:
    Has Credit Card: ${customerData.hasCreditCard ? 'Yes' : 'No'}
    Bank Name: ${customerData.bankName || 'Not provided'}
    Account Type: ${customerData.accountType || 'Not provided'}
    Account Number: ${customerData.accountNumber || 'Not provided'}
    Account Holder Name: ${customerData.accountHolderName || 'Not provided'}
    Branch Code: ${customerData.branchCode || 'Not provided'}

    Package Information:
    Selected Package: ${customerData.selectedPackage}
    Referral Code: ${customerData.referralCode || 'None'}
    
    Legal Information:
    Mandate Accepted: ${customerData.mandate_accepted ? 'Yes' : 'No'}

    Please find the attached PDF with complete registration details including the customer's signature.
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #011d3d; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoImageUrl}" alt="Opian Rewards Logo" style="max-width: 200px;">
      </div>

      <div style="background-color: #011d3d; padding: 30px; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; margin: 20px 0; color: white;">
        <h2 style="color: white; margin-top: 0;">Admin Notification</h2>
        <h1 style="color: #43EB3E;">New Customer Registration</h1>

        <div style="background-color: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #43EB3E; margin-top: 0;">Personal Details</h3>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">First Name:</strong> ${customerData.firstName}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Last Name:</strong> ${customerData.lastName}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Email:</strong> ${customerData.email}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Mobile Number:</strong> ${customerData.mobileNumber}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">ID Number:</strong> ${customerData.idNumber || 'Not provided'}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Date of Birth:</strong> ${customerData.dateOfBirth || 'Not provided'}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Gender:</strong> ${customerData.gender || 'Not provided'}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">South African Resident:</strong> ${customerData.isSouthAfrican ? 'Yes' : 'No'}</p>
        </div>

        <div style="background-color: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #43EB3E; margin-top: 0;">Professional Information</h3>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Occupation:</strong> ${customerData.occupation || 'Not provided'}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Industry:</strong> ${customerData.industry || 'Not provided'}</p>
        </div>

        <div style="background-color: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #43EB3E; margin-top: 0;">Address Information</h3>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Address:</strong> ${customerData.address || 'Not provided'}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">City:</strong> ${customerData.city || 'Not provided'}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Postal Code:</strong> ${customerData.postalCode || 'Not provided'}</p>
        </div>

        <div style="background-color: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #43EB3E; margin-top: 0;">Banking Details</h3>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Has Credit Card:</strong> ${customerData.hasCreditCard ? 'Yes' : 'No'}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Bank Name:</strong> ${customerData.bankName || 'Not provided'}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Account Type:</strong> ${customerData.accountType || 'Not provided'}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Account Number:</strong> ${customerData.accountNumber || 'Not provided'}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Account Holder Name:</strong> ${customerData.accountHolderName || 'Not provided'}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Branch Code:</strong> ${customerData.branchCode || 'Not provided'}</p>
        </div>

        <div style="background-color: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #43EB3E; margin-top: 0;">Package Information</h3>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Selected Package:</strong> ${customerData.selectedPackage}</p>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Referral Code:</strong> ${customerData.referralCode || 'None'}</p>
        </div>

        <div style="background-color: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #43EB3E; margin-top: 0;">Legal Information</h3>
          <p style="margin: 10px 0;"><strong style="color: #43EB3E;">Mandate Accepted:</strong> ${customerData.mandate_accepted ? 'Yes' : 'No'}</p>
        </div>

        ${customerData.signature ? `
          <div style="background-color: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #43EB3E; margin-top: 0;">Customer Signature</h3>
            <div style="background-color: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
              <img src="${customerData.signature.startsWith('data:') 
                ? customerData.signature 
                : (customerData.signature.includes('googleusercontent') 
                  ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' 
                  : customerData.signature)}" 
                alt="Customer Signature" style="max-width: 300px; filter: invert(1); -webkit-filter: invert(1);"/>
            </div>
          </div>
        ` : `
          <div style="background-color: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #43EB3E; margin-top: 0;">Customer Signature</h3>
            <p>No signature provided.</p>
          </div>
        `}

        <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
          A PDF containing complete registration details is attached to this email.
        </p>
        
        <div style="color: rgba(255,255,255,0.7); font-size: 12px; line-height: 1.6; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
          <p><strong>Opian Financial Services (Pty) Ltd</strong> is an Authorised Financial Services Provider</p>
          <p>Company Registration Number: 2018/584168/07 FSP No: 50974</p>
          <p>Company Address: 260 Uys Krige Drive, Loevenstein, Bellville, 7530, Western Cape</p>
          <p style="color: white !important;">
            Tel: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="tel:0861263346" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">0861 263 346</a></span> |
            Email: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="mailto:info@opianfsgroup.com" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">info@opianfsgroup.com</a></span> |
            Website: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="http://www.opianfsgroup.com" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">www.opianfsgroup.com</a></span>
          </p>
        </div>
      </div>
    </div>
  `;

  return { text, html };
}

export async function generateRegistrationPDF(customerData: any): Promise<Buffer> {
  console.log('Generating registration PDF with signature type:', 
    customerData.signature 
      ? (customerData.signature.startsWith('data:') 
          ? 'data URL' 
          : (customerData.signature.includes('googleusercontent') 
              ? 'Google URL (using placeholder image)' 
              : 'direct URL'))
      : 'no signature');
  
  // Define logo URL - using a Replit-hosted image
  const logoImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/opian-logo-white.png";
  
  const pdfHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          color: white; 
          line-height: 1.4;
          margin: 0;
          padding: 0;
          background-color: #011d3d;
          font-size: 13px;
        }
        .container { 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px;
        }
        .header { 
          background-color: rgba(255,255,255,0.05); 
          color: white; 
          text-align: center; 
          padding: 25px 15px; 
          margin-bottom: 20px;
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .header h1 {
          color: white;
          margin: 10px 0;
          font-size: 20px;
        }
        .header p {
          color: #43EB3E;
          margin: 8px 0;
          font-size: 14px;
        }
        .logo {
          max-width: 160px;
          margin-bottom: 15px;
        }
        .section { 
          background-color: rgba(255,255,255,0.05); 
          margin: 15px 0; 
          padding: 18px;
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .section h2 { 
          color: #43EB3E; 
          border-bottom: 1px solid rgba(255,255,255,0.2); 
          padding-bottom: 8px; 
          margin-top: 0;
          font-size: 16px;
        }
        .section p { 
          margin: 8px 0; 
        }
        .section strong { 
          color: #43EB3E; 
        }
        .signature { 
          background-color: rgba(255,255,255,0.05); 
          margin-top: 15px; 
          padding: 18px;
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .signature h2 { 
          color: #43EB3E; 
          border-bottom: 1px solid rgba(255,255,255,0.2); 
          padding-bottom: 8px; 
          margin-top: 0;
          font-size: 16px;
        }
        .highlight {
          color: #43EB3E;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          font-size: 11px;
          color: rgba(255,255,255,0.7);
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://opianfsgroup.com/opian-logo-white.png" alt="Opian FS Group Logo" class="logo" />
          <h1>OPIAN Rewards - Customer Registration</h1>
          <p>Registration Date: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section">
          <h2>Personal Details</h2>
          <p><strong>First Name:</strong> ${customerData.firstName}</p>
          <p><strong>Last Name:</strong> ${customerData.lastName}</p>
          <p><strong>Email:</strong> ${customerData.email}</p>
          <p><strong>Mobile Number:</strong> ${customerData.mobileNumber}</p>
          <p><strong>ID Number:</strong> ${customerData.idNumber || 'Not provided'}</p>
          <p><strong>Date of Birth:</strong> ${customerData.dateOfBirth || 'Not provided'}</p>
          <p><strong>Gender:</strong> ${customerData.gender || 'Not provided'}</p>
          <p><strong>South African Resident:</strong> ${customerData.isSouthAfrican ? 'Yes' : 'No'}</p>
        </div>

        <div class="section">
          <h2>Professional Information</h2>
          <p><strong>Occupation:</strong> ${customerData.occupation || 'Not provided'}</p>
          <p><strong>Industry:</strong> ${customerData.industry || 'Not provided'}</p>
        </div>

        <div class="section">
          <h2>Address Information</h2>
          <p><strong>Address:</strong> ${customerData.address || 'Not provided'}</p>
          <p><strong>City:</strong> ${customerData.city || 'Not provided'}</p>
          <p><strong>Postal Code:</strong> ${customerData.postalCode || 'Not provided'}</p>
        </div>

        <div class="section">
          <h2>Banking Details</h2>
          <p><strong>Has Credit Card:</strong> ${customerData.hasCreditCard ? 'Yes' : 'No'}</p>
          <p><strong>Bank Name:</strong> ${customerData.bankName || 'Not provided'}</p>
          <p><strong>Account Type:</strong> ${customerData.accountType || 'Not provided'}</p>
          <p><strong>Account Number:</strong> ${customerData.accountNumber || 'Not provided'}</p>
          <p><strong>Account Holder Name:</strong> ${customerData.accountHolderName || 'Not provided'}</p>
          <p><strong>Branch Code:</strong> ${customerData.branchCode || 'Not provided'}</p>
        </div>

        <div class="section">
          <h2>Package Information</h2>
          <p><strong>Selected Package:</strong> <span class="highlight">${customerData.selectedPackage}</span></p>
          <p><strong>Referral Code:</strong> ${customerData.referralCode || 'None'}</p>
        </div>
        
        <div class="section">
          <h2>Legal Information</h2>
          <p><strong>Mandate Accepted:</strong> ${customerData.mandate_accepted ? 'Yes' : 'No'}</p>
        </div>

        ${customerData.signature ? `
          <div class="signature">
            <h2>Customer Signature</h2>
            <div style="background-color: rgba(255,255,255,0.1); padding: 15px; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px;">
              <img src="${customerData.signature.startsWith('data:') 
                ? customerData.signature 
                : (customerData.signature.includes('googleusercontent')
                  ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' 
                  : customerData.signature)}" 
                style="max-width: 240px; filter: invert(1); -webkit-filter: invert(1);"/>
            </div>
          </div>
        ` : `
          <div class="signature">
            <h2>Customer Signature</h2>
            <p>No signature provided.</p>
          </div>
        `}
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Opian Financial Services Group. All rights reserved.</p>
          <p>Company Registration Number: 2018/584168/07 | FSP No: 50974</p>
          <p>260 Uys Krige Drive, Loevenstein, Bellville, 7530, Western Cape</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return new Promise((resolve, reject) => {
    // Create PDF with proper options
    const pdfOptions = {
      format: 'A4',
      border: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    };
    
    htmlPdf.create(pdfHtml, pdfOptions).toBuffer((err: Error | null, buffer?: Buffer) => {
      if (err) {
        console.error('PDF generation error:', err);
        reject(err);
      } else if (buffer) {
        resolve(buffer);
      } else {
        reject(new Error('PDF generation failed: No buffer returned'));
      }
    });
  });
}

export async function sendAdminRegistrationNotification(customerData: any): Promise<boolean> {
  try {
    console.log('Generating PDF for admin notification...');
    const pdfBuffer = await generateRegistrationPDF(customerData);

    const { text, html } = formatNewCustomerAdminEmail(customerData);

    // Use the sendEmail function to ensure consistent email configuration
    return await sendEmail({
      to: 'clientservices@opianrewards.com', // This is the actual recipient email
      subject: 'New Customer Registration',
      text,
      html,
      emailType: 'ADMIN_REGISTRATION',
      templateData: customerData,
      attachments: [{
        filename: `${customerData.firstName}_${customerData.lastName}_Registration.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    return false;
  }
}