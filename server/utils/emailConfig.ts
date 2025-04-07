/**
 * Centralized Email Configuration
 * 
 * This file provides a consistent SMTP configuration across the application
 * to ensure that all email communication uses the same settings.
 */

// Get all SMTP settings from environment variables with fallbacks
export const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || 'smtp.opianrewards.com';
  const port = parseInt(process.env.SMTP_PORT || '465');
  const user = process.env.SMTP_USER || 'clientservices@opianrewards.com';
  const pass = process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  return {
    host,
    port,
    user,
    pass,
    secure
  };
};

// Log SMTP configuration
export const logSmtpConfig = (prefix = 'SMTP') => {
  const config = getSmtpConfig();
  console.log(`========== ${prefix} CONFIGURATION ==========`);
  console.log('Host:', config.host);
  console.log('Port:', config.port);
  console.log('Secure:', config.secure);
  console.log('User:', config.user);
  console.log('Password provided:', config.pass ? 'Yes' : 'No');
  
  return config;
};