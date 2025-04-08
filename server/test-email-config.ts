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
  envVars?: {
    smtp_host: string;
    smtp_user: string;
    smtp_password: string;
    smtp_port: string;
    opian_smtp_host: string;
    opian_smtp_user: string;
    opian_smtp_password: string;
    opian_smtp_port: string;
  };
}> {
  try {
    console.log('Testing email configuration...');
    console.log('========== TESTING EMAIL CONFIGURATION ==========');
    
    // Load and log SMTP configuration
    const config = logSmtpConfig('TEST MODULE');
    
    // Check all possible environment variables
    console.log('Environment variable check:');
    console.log('SMTP_HOST:', process.env.SMTP_HOST ? 'Set' : 'Not set');
    console.log('OPIAN_SMTP_HOST:', process.env.OPIAN_SMTP_HOST ? 'Set' : 'Not set');
    console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set'); 
    console.log('OPIAN_SMTP_USER:', process.env.OPIAN_SMTP_USER ? 'Set' : 'Not set');
    console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? 'Set' : 'Not set');
    console.log('OPIAN_SMTP_PASSWORD:', process.env.OPIAN_SMTP_PASSWORD ? 'Set' : 'Not set');
    console.log('SMTP_PORT:', process.env.SMTP_PORT ? 'Set' : 'Not set');
    console.log('OPIAN_SMTP_PORT:', process.env.OPIAN_SMTP_PORT ? 'Set' : 'Not set');
    
    // Check which settings are being used
    console.log('Active configuration:');
    console.log(`Host: ${config.host} (from ${process.env.SMTP_HOST ? 'SMTP_HOST' : (process.env.OPIAN_SMTP_HOST ? 'OPIAN_SMTP_HOST' : 'default')})`);
    console.log(`User: ${config.user} (from ${process.env.SMTP_USER ? 'SMTP_USER' : (process.env.OPIAN_SMTP_USER ? 'OPIAN_SMTP_USER' : 'default')})`);
    console.log(`Password: ${config.pass ? 'Provided' : 'Missing'} (from ${process.env.SMTP_PASSWORD ? 'SMTP_PASSWORD' : (process.env.OPIAN_SMTP_PASSWORD ? 'OPIAN_SMTP_PASSWORD' : 'None')})`);
    console.log(`Port: ${config.port} (from ${process.env.SMTP_PORT ? 'SMTP_PORT' : (process.env.OPIAN_SMTP_PORT ? 'OPIAN_SMTP_PORT' : 'default')})`);
    
    // Provide password details for troubleshooting (masked)
    const passwordInfo = config.pass 
      ? `${config.pass.slice(0, 3)}...${config.pass.slice(-3)} (${config.pass.length} characters)` 
      : 'Not provided';
    console.log(`Password details: ${passwordInfo}`);
    
    return {
      configLoaded: true,
      configDetails: {
        host: "Configured (hidden)",
        port: config.port,
        user: "Configured (hidden)",
        secure: config.secure
      },
      // Include environment variable presence for debugging
      envVars: {
        smtp_host: process.env.SMTP_HOST ? 'Set' : 'Not set',
        smtp_user: process.env.SMTP_USER ? 'Set' : 'Not set',
        smtp_password: process.env.SMTP_PASSWORD ? 'Set' : 'Not set',
        smtp_port: process.env.SMTP_PORT ? 'Set' : 'Not set',
        opian_smtp_host: process.env.OPIAN_SMTP_HOST ? 'Set' : 'Not set',
        opian_smtp_user: process.env.OPIAN_SMTP_USER ? 'Set' : 'Not set',
        opian_smtp_password: process.env.OPIAN_SMTP_PASSWORD ? 'Set' : 'Not set',
        opian_smtp_port: process.env.OPIAN_SMTP_PORT ? 'Set' : 'Not set'
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