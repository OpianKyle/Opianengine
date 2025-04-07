/**
 * Email Configuration Test Module
 * 
 * This file provides a simple way to test the centralized email configuration
 * to ensure that email settings are properly loaded from environment variables.
 */

import { getSmtpConfig, logSmtpConfig } from './utils/emailConfig';
import { sendEmail } from './utils/emailService';

interface EmailConfigDetails {
  host: string;
  port: number;
  user: string;
  secure: boolean;
  pass?: string;
}

// Test function to verify email configuration
export async function testEmailConfig(): Promise<{
  configLoaded: boolean;
  configDetails: EmailConfigDetails | null;
  error?: string;
}> {
  try {
    console.log('========== TESTING EMAIL CONFIGURATION ==========');
    
    // Load and log SMTP configuration
    const config = logSmtpConfig('TEST MODULE');
    
    return {
      configLoaded: true,
      configDetails: {
        host: config.host,
        port: config.port,
        user: config.user,
        secure: config.secure,
        // Don't include password in the returned object for security
        pass: config.pass ? '********' : undefined
      }
    };
  } catch (error) {
    console.error('Error in email configuration test:', error);
    return {
      configLoaded: false,
      configDetails: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Test function to send a test email
export async function sendTestEmail(recipientEmail: string): Promise<{
  sent: boolean;
  error?: string;
}> {
  try {
    console.log(`Sending test email to ${recipientEmail}...`);
    
    const result = await sendEmail({
      to: recipientEmail,
      subject: 'Email Configuration Test',
      text: 'This is a test email to verify email configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Configuration Test</h2>
          <p>This is a test email to verify that the email configuration is working properly.</p>
          <p>If you received this email, it means the SMTP settings are correct.</p>
          <hr>
          <p><small>This is an automated test message. Please do not reply.</small></p>
        </div>
      `,
      emailType: 'TEST_CONFIG'
    });
    
    if (result) {
      console.log('Test email sent successfully!');
      return { sent: true };
    } else {
      console.error('Failed to send test email');
      return { 
        sent: false,
        error: 'Email sending returned false' 
      };
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}