import nodemailer from 'nodemailer';
import htmlPdf from 'html-pdf';
import { promisify } from 'util';
import mysql from 'mysql2/promise';
import { 
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
  isProduction,
  dbConfig
} from '../config';

// Create reusable transporter with Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  },
  debug: !isProduction,
  logger: !isProduction
});

// Create connection pool using environment variables
const pool = mysql.createPool(dbConfig);

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
}

export async function sendEmail({ to, subject, text, html, emailType = 'GENERAL', templateData }: EmailParams): Promise<boolean> {
  try {
    console.log('========== EMAIL SENDING ATTEMPT ==========');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Using Gmail account:', GMAIL_USER);

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error('Missing Gmail credentials');
      await logEmail({
        recipientEmail: to,
        subject,
        emailType,
        status: 'FAILED',
        errorMessage: 'Missing Gmail credentials',
        templateData,
        htmlContent: html,
        textContent: text
      });
      return false;
    }

    const verification = await transporter.verify();
    console.log('SMTP Connection verified:', verification);

    const result = await transporter.sendMail({
      from: `"OPIAN Rewards" <${GMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });

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
    console.error('Detailed email error:', error);

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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #011d3d; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/Assets/opian-logo-white.png" alt="Opian Rewards Logo" style="max-width: 200px;">
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
            <li><strong>Sign in:</strong> Visit our platform and log in using your credentials:
              <div style="background: rgba(255,255,255,0.1); padding: 15px; margin: 10px 0; border-radius: 3px;">
                <span style="color: #43EB3E;">Username:</span> <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;">${email}</span><br>
                <span style="color: #43EB3E;">Password:</span> <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;">123456</span>
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
            📧 Email: <span style="color: white !important; mso-color-alt: white; -webkit-text-fill-color: white;"><a href="mailto:clientservices@opianfsgroup.com" style="color: white !important; text-decoration: none; mso-color-alt: white; -webkit-text-fill-color: white;">clientservices@opianfsgroup.com</a></span>
          </p>
        </div>

        <p style="color: white; font-size: 18px; font-weight: bold;">
          Your biggest financial journey starts now! Let's make it rewarding!
        </p>

        <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
          <p style="color: white; margin: 20px 0;">
            Best regards,<br><br>
            <img src="https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/Assets/lance.png" alt="Lance Heynes Signature" style="max-width: 200px; margin: 10px 0;"><br>
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
  }
): { text: string; html: string } {
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

    Please find the attached PDF with complete registration details including the customer's signature.
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Customer Registration</h2>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Personal Details</h3>
        <p><strong>First Name:</strong> ${customerData.firstName}</p>
        <p><strong>Last Name:</strong> ${customerData.lastName}</p>
        <p><strong>Email:</strong> ${customerData.email}</p>
        <p><strong>Mobile Number:</strong> ${customerData.mobileNumber}</p>
        <p><strong>ID Number:</strong> ${customerData.idNumber || 'Not provided'}</p>
        <p><strong>Date of Birth:</strong> ${customerData.dateOfBirth || 'Not provided'}</p>
        <p><strong>Gender:</strong> ${customerData.gender || 'Not provided'}</p>
        <p><strong>South African Resident:</strong> ${customerData.isSouthAfrican ? 'Yes' : 'No'}</p>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Professional Information</h3>
        <p><strong>Occupation:</strong> ${customerData.occupation || 'Not provided'}</p>
        <p><strong>Industry:</strong> ${customerData.industry || 'Not provided'}</p>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Address Information</h3>
        <p><strong>Address:</strong> ${customerData.address || 'Not provided'}</p>
        <p><strong>City:</strong> ${customerData.city || 'Not provided'}</p>
        <p><strong>Postal Code:</strong> ${customerData.postalCode || 'Not provided'}</p>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Banking Details</h3>
        <p><strong>Has Credit Card:</strong> ${customerData.hasCreditCard ? 'Yes' : 'No'}</p>
        <p><strong>Bank Name:</strong> ${customerData.bankName || 'Not provided'}</p>
        <p><strong>Account Type:</strong> ${customerData.accountType || 'Not provided'}</p>
        <p><strong>Account Number:</strong> ${customerData.accountNumber || 'Not provided'}</p>
        <p><strong>Account Holder Name:</strong> ${customerData.accountHolderName || 'Not provided'}</p>
        <p><strong>Branch Code:</strong> ${customerData.branchCode || 'Not provided'}</p>
      </div>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Package Information</h3>
        <p><strong>Selected Package:</strong> ${customerData.selectedPackage}</p>
        <p><strong>Referral Code:</strong> ${customerData.referralCode || 'None'}</p>
      </div>

      ${customerData.signature ? `
        <div style="margin-top: 20px; background-color: white; padding: 20px; border-radius: 5px;">
          <h3>Customer Signature</h3>
          <div style="background-color: white; padding: 10px; border: 1px solid #eee;">
            <img src="${customerData.signature}" alt="Customer Signature" style="max-width: 300px; filter: invert(1); -webkit-filter: invert(1);"/>
          </div>
        </div>
      ` : ''}

      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        A PDF containing complete registration details is attached to this email.
      </p>
    </div>
  `;

  return { text, html };
}

async function generateRegistrationPDF(customerData: any): Promise<Buffer> {
  const pdfHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; padding: 15px; background-color: #f5f5f5; }
        .signature { margin-top: 30px; background-color: white; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
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
          <p><strong>Selected Package:</strong> ${customerData.selectedPackage}</p>
          <p><strong>Referral Code:</strong> ${customerData.referralCode || 'None'}</p>
        </div>

        ${customerData.signature ? `
          <div class="signature">
            <h2>Customer Signature</h2>
            <div style="background-color: white; padding: 10px; border: 1px solid #eee;">
              <img src="${customerData.signature}" style="max-width: 300px; filter: invert(1); -webkit-filter: invert(1);"/>
            </div>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;

  return new Promise((resolve, reject) => {
    htmlPdf.create(pdfHtml).toBuffer((err, buffer) => {
      if (err) {
        console.error('PDF generation error:', err);
        reject(err);
      } else {
        resolve(buffer);
      }
    });
  });
}

export async function sendAdminRegistrationNotification(customerData: any): Promise<boolean> {
  try {
    console.log('Generating PDF for admin notification...');
    const pdfBuffer = await generateRegistrationPDF(customerData);

    const { text, html } = formatNewCustomerAdminEmail(customerData);

    const result = await transporter.sendMail({
      from: `"OPIAN Rewards" <${GMAIL_USER}>`,
      to: 'clientservices@opianfsgroup.com',
      subject: 'New Customer Registration',
      text,
      html,
      attachments: [{
        filename: `${customerData.firstName}_${customerData.lastName}_Registration.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });

    console.log('Admin notification sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    return false;
  }
}