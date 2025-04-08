// Test script for email functionality
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testSmtpConnection() {
  try {
    console.log('Testing SMTP connection...');
    
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
      debug: true, // Show debug output
      logger: true // Log information
    });
    
    // Verify connection
    const verification = await transporter.verify();
    console.log('SMTP Verification successful:', verification);
    return true;
  } catch (error) {
    console.error('SMTP connection test failed:', error);
    return false;
  }
}

testSmtpConnection();