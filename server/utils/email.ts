import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || '"OPIAN Rewards" <noreply@opianrewards.com>',
      ...params,
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

export function generatePasswordSetupEmail(email: string, token: string) {
  const resetLink = `${process.env.APP_URL}/set-password?token=${token}`;

  return {
    to: email,
    subject: 'Welcome to OPIAN Rewards - Set Your Password',
    html: `
      <h1>Welcome to OPIAN Rewards!</h1>
      <p>Your account has been created by your agent. To get started, please set your password by clicking the link below:</p>
      <p><a href="${resetLink}">Set Your Password</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not request this account, please ignore this email.</p>
    `,
  };
}