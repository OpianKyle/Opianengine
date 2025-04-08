// Email Configuration Test Script
// Run with: npx tsx test-email-config.js

import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the root directory
const result = dotenv.config({
  path: path.resolve(__dirname, '.env')
});

// Check if dotenv loaded successfully
if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Get SMTP configuration from environment variables
const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || process.env.OPIAN_SMTP_HOST || 'smtp.opianrewards.com';
  const portStr = process.env.SMTP_PORT || process.env.OPIAN_SMTP_PORT || '465';
  const port = parseInt(portStr);
  const user = process.env.SMTP_USER || process.env.OPIAN_SMTP_USER || 'clientservices@opianrewards.com';
  
  // Force the password to be the updated one
  const pass = 'D0321879rQq8I2';
  console.log('Using fixed password from code: D0321879rQq8I2');
  
  // Check what's actually in the environment
  console.log('Raw SMTP_PASSWORD from env:', process.env.SMTP_PASSWORD);
  
  const secure = process.env.SMTP_SECURE === 'true' || process.env.OPIAN_SMTP_SECURE === 'true' || port === 465;
  
  console.log('Email config source: ', {
    hostFrom: process.env.SMTP_HOST ? 'SMTP_HOST' : (process.env.OPIAN_SMTP_HOST ? 'OPIAN_SMTP_HOST' : 'default'),
    portFrom: process.env.SMTP_PORT ? 'SMTP_PORT' : (process.env.OPIAN_SMTP_PORT ? 'OPIAN_SMTP_PORT' : 'default'),
    userFrom: process.env.SMTP_USER ? 'SMTP_USER' : (process.env.OPIAN_SMTP_USER ? 'OPIAN_SMTP_USER' : 'default'),
    passFrom: 'hardcoded for testing',
  });
  
  return {
    host,
    port,
    user,
    pass,
    secure
  };
};

// Log SMTP configuration
const logSmtpConfig = (prefix = 'SMTP') => {
  const config = getSmtpConfig();
  console.log(`========== ${prefix} CONFIGURATION ==========`);
  console.log('Host:', config.host);
  console.log('Port:', config.port);
  console.log('Secure:', config.secure);
  console.log('User:', config.user);
  console.log('Password provided:', config.pass ? 'Yes' : 'No');
  if (config.pass) {
    console.log('Password length:', config.pass.length);
    console.log('Password preview:', `${config.pass.slice(0, 3)}...${config.pass.slice(-3)}`);
  }
  
  return config;
};

const testSmtpConnection = async () => {
  try {
    const config = logSmtpConfig();
    
    console.log('Creating SMTP transporter with config...');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    });
    
    console.log('Testing SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully!');
    
    return true;
  } catch (error) {
    console.error('SMTP connection test failed:', error);
    
    // Enhanced error handling for authentication issues
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('Invalid login') || 
        errorMessage.includes('authentication failed') || 
        errorMessage.includes('535') || 
        errorMessage.includes('Incorrect authentication data')) {
      
      console.error('AUTHENTICATION ERROR DETECTED - This is likely due to incorrect SMTP credentials!');
      console.error('Please check the following:');
      console.error('1. Verify that SMTP_PASSWORD or OPIAN_SMTP_PASSWORD has the correct value');
      console.error('2. Ensure SMTP_USER or OPIAN_SMTP_USER is correct');
      console.error('3. Confirm SMTP_HOST or OPIAN_SMTP_HOST is correct');
      console.error('4. Check if SMTP_PORT or OPIAN_SMTP_PORT is correct');
      console.error('5. Ensure special characters in the password are properly escaped in environment variables');
    }
    
    return false;
  }
};

// Run the test
(async () => {
  console.log('Starting SMTP connection test...');
  const success = await testSmtpConnection();
  
  if (success) {
    console.log('✅ SMTP connection test successful!');
  } else {
    console.log('❌ SMTP connection test failed. Check the logs above for details.');
  }
})();