// Test script to send an email
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function sendTestEmail(recipient) {
  try {
    console.log(`Attempting to send a test email to ${recipient}`);
    
    // Get SMTP configuration from environment variables
    const host = process.env.SMTP_HOST || process.env.OPIAN_SMTP_HOST || 'smtp.opianrewards.com';
    const portStr = process.env.SMTP_PORT || process.env.OPIAN_SMTP_PORT || '465';
    const port = parseInt(portStr);
    const user = process.env.SMTP_USER || process.env.OPIAN_SMTP_USER || 'clientservices@opianrewards.com';
    const pass = process.env.SMTP_PASSWORD || process.env.OPIAN_SMTP_PASSWORD;
    const secure = process.env.SMTP_SECURE === 'true' || process.env.OPIAN_SMTP_SECURE === 'true' || port === 465;
    
    console.log('Using SMTP config:', {
      host,
      port,
      user,
      secure,
      pass: pass ? 'PRESENT' : 'NOT SET'
    });
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      },
      debug: true // Show debug output
    });
    
    // Email content
    const mailOptions = {
      from: `"Opian Rewards" <${user}>`,
      to: recipient,
      subject: 'Opian Rewards Test Email',
      text: 'This is a test email from Opian Rewards system.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #4a5568;">Opian Rewards Test Email</h2>
          <p>This is a test email from the Opian Rewards system.</p>
          <p>If you received this email, it means our email system is working properly.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #718096;">
            <p>© ${new Date().getFullYear()} Opian Rewards. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

// Run the test with a test recipient
// Replace this with a real email address to test
const testRecipient = 'test@example.com'; 
sendTestEmail(testRecipient);