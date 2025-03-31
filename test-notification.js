// test-notification.js - ES Module
import { createPool } from 'mysql2/promise';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import htmlPdf from 'html-pdf';

dotenv.config();

// Create connection pool
const pool = createPool({
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

// Configure mailer
function createTransporter() {
  // Use environment variables with fallbacks
  const host = process.env.SMTP_HOST || 'mail.opian.co.za';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || 'admin@opian.co.za';
  const pass = process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  console.log(`Creating transporter with: ${host}:${port}, user: ${user}, secure: ${secure}`);
  
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: true,
    logger: true
  });
}

async function generateRegistrationPDF(customerData) {
  const pdfHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Customer Registration</title>
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.5; }
        .container { padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { max-width: 200px; margin-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #4a5568; }
        .subtitle { font-size: 16px; color: #718096; margin-bottom: 20px; }
        .section { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0; }
        .section:last-child { border-bottom: none; }
        h2 { font-size: 18px; color: #2d3748; margin-bottom: 10px; }
        p { margin: 5px 0; }
        .signature { margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://opianfsgroup.com/opian-logo.png" alt="Opian FS Group Logo" class="logo" />
          <div class="title">New Customer Registration</div>
          <div class="subtitle">Registration Date: ${new Date(customerData.createdAt).toLocaleDateString()}</div>
        </div>

        <div class="section">
          <h2>Personal Information</h2>
          <p><strong>Name:</strong> ${customerData.firstName} ${customerData.lastName}</p>
          <p><strong>Email:</strong> ${customerData.email}</p>
          <p><strong>Mobile Number:</strong> ${customerData.mobileNumber || 'Not provided'}</p>
          <p><strong>Date of Birth:</strong> ${customerData.dateOfBirth || 'Not provided'}</p>
          <p><strong>Gender:</strong> ${customerData.gender || 'Not provided'}</p>
          <p><strong>ID Number:</strong> ${customerData.idNumber || 'Not provided'}</p>
          <p><strong>South African Resident:</strong> ${customerData.isSouthAfrican ? 'Yes' : 'No'}</p>
        </div>

        <div class="section">
          <h2>Address Information</h2>
          <p><strong>Address:</strong> ${customerData.addressLine1 || 'Not provided'}</p>
          <p><strong>Suburb:</strong> ${customerData.suburb || 'Not provided'}</p>
          <p><strong>Postal Code:</strong> ${customerData.postalCode || 'Not provided'}</p>
        </div>

        <div class="section">
          <h2>Professional Information</h2>
          <p><strong>Occupation:</strong> ${customerData.occupation || 'Not provided'}</p>
          <p><strong>Industry:</strong> ${customerData.industry || 'Not provided'}</p>
        </div>

        <div class="section">
          <h2>Banking Details</h2>
          <p><strong>Has Credit Card:</strong> ${customerData.hasCreditCard ? 'Yes' : 'No'}</p>
          <p><strong>Bank Name:</strong> ${customerData.bankName || 'Not provided'}</p>
          <p><strong>Account Type:</strong> ${customerData.accountType || 'Not provided'}</p>
          <p><strong>Account Number:</strong> ${customerData.accountNumber || 'Not provided'}</p>
          <p><strong>Account Holder:</strong> ${customerData.accountHolderName || 'Not provided'}</p>
          <p><strong>Branch Code:</strong> ${customerData.branchCode || 'Not provided'}</p>
        </div>

        <div class="section">
          <h2>Package Information</h2>
          <p><strong>Selected Package:</strong> ${customerData.selectedPackage}</p>
          <p><strong>Agent ID:</strong> ${customerData.agentId || 'None'}</p>
        </div>
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

function formatNewCustomerAdminEmail(customerData) {
  const text = `
New Customer Registration - Agent Created Customer

A new customer has been registered with the following details:

Name: ${customerData.firstName} ${customerData.lastName}
Email: ${customerData.email}
Mobile: ${customerData.mobileNumber || 'Not provided'}
Package: ${customerData.selectedPackage}
Agent ID: ${customerData.agentId}

A complete PDF with all details is attached.
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Customer Registration</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.5; }
    .container { padding: 20px; max-width: 600px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; background-color: #152F48; padding: 20px; color: white; }
    .logo { max-width: 150px; margin-bottom: 20px; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; }
    .section { margin-bottom: 20px; }
    h1 { font-size: 22px; margin-bottom: 15px; }
    h2 { font-size: 18px; margin-top: 25px; margin-bottom: 10px; color: #152F48; }
    p { margin: 10px 0; }
    .highlight { color: #6c5ce7; font-weight: bold; }
    .note { font-style: italic; color: #666; margin-top: 20px; }
    .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://opianfsgroup.com/opian-logo-white.png" alt="Opian Logo" class="logo" />
      <h1>New Customer Registration by Agent</h1>
    </div>
    
    <div class="content">
      <p>A new customer has been registered through an agent with the following details:</p>
      
      <div class="section">
        <h2>Customer Information</h2>
        <p><strong>Name:</strong> ${customerData.firstName} ${customerData.lastName}</p>
        <p><strong>Email:</strong> ${customerData.email}</p>
        <p><strong>Mobile:</strong> ${customerData.mobileNumber || 'Not provided'}</p>
      </div>
      
      <div class="section">
        <h2>Package Selection</h2>
        <p><strong>Package:</strong> <span class="highlight">${customerData.selectedPackage}</span></p>
      </div>
      
      <div class="section">
        <h2>Agent Information</h2>
        <p><strong>Agent ID:</strong> ${customerData.agentId}</p>
      </div>
      
      <p class="note">A complete PDF with all customer details is attached to this email.</p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Opian Financial Services Group. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

  return { text, html };
}

async function sendAdminRegistrationNotification(customerData) {
  try {
    console.log('Generating PDF for admin notification...');
    const pdfBuffer = await generateRegistrationPDF(customerData);
    
    const { text, html } = formatNewCustomerAdminEmail(customerData);
    
    const transporter = createTransporter();
    
    const result = await transporter.sendMail({
      from: `"OPIAN Rewards" <clientservices@opianfsgroup.com>`,
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

// Test data
const customerData = {
  firstName: "Test",
  lastName: "Customer",
  email: "testcustomer@example.com",
  mobileNumber: "1234567890",
  dateOfBirth: "1990-01-01",
  gender: "Male",
  idNumber: "9001015000080",
  occupation: "Engineer",
  industry: "Technology",
  addressLine1: "123 Test Street",
  suburb: "Test Suburb",
  postalCode: "1234",
  selectedPackage: "OPPORTUNITY",
  bankName: "Test Bank",
  accountType: "Savings",
  accountNumber: "1234567890",
  accountHolderName: "Test Customer",
  branchCode: "12345",
  isSouthAfrican: true,
  hasCreditCard: true,
  createdAt: new Date().toISOString(),
  mandateAccepted: true,
  agentId: 1
};

// Run the test
async function runTest() {
  console.log('Testing admin notification email...');
  try {
    const result = await sendAdminRegistrationNotification(customerData);
    console.log('Email send result:', result);
  } catch (error) {
    console.error('Error sending admin notification:', error);
  } finally {
    await pool.end();
  }
}

runTest();