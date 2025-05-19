import { sendEmail } from './emailService';

/**
 * Formats an email notification for cash redemption requests
 */
export function formatCashRedemptionEmail(
  userName: string,
  points: number,
  randAmount: number
): { text: string; html: string } {
  // Use Replit domain for images
  const logoImageUrl = "https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev/opian-logo-white.png";
  
  const text = `
    Cash Redemption Notification
    
    User: ${userName}
    Points Redeemed: ${points.toLocaleString()}
    Cash Value: R${randAmount.toFixed(2)}
    
    A user has submitted a cash redemption request. Please process this request according to standard procedures.
    
    This is an automated notification from the Opian Rewards system.
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #011d3d; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${logoImageUrl}" alt="Opian Rewards Logo" style="max-width: 200px;">
      </div>
      
      <div style="background-color: #022b5c; padding: 20px; border-radius: 10px; color: white;">
        <h2 style="color: white; margin-top: 0;">Cash Redemption Notification</h2>
        
        <div style="margin: 20px 0; padding: 15px; background-color: rgba(255,255,255,0.1); border-radius: 5px;">
          <p style="margin: 5px 0;"><strong>User:</strong> ${userName}</p>
          <p style="margin: 5px 0;"><strong>Points Redeemed:</strong> ${points.toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Cash Value:</strong> <span style="color: #4cd964; font-weight: bold;">R${randAmount.toFixed(2)}</span></p>
        </div>
        
        <p>A user has submitted a cash redemption request. Please process this request according to standard procedures.</p>
        
        <p style="font-size: 12px; margin-top: 30px; color: #8a9cb0;">This is an automated notification from the Opian Rewards system.</p>
      </div>
    </div>
  `;

  return { text, html };
}

/**
 * Sends an email notification about a cash redemption request
 */
export async function sendCashRedemptionNotification(
  userName: string,
  points: number,
  randAmount: number
): Promise<boolean> {
  try {
    console.log('Sending cash redemption notification email for', userName);
    const { text, html } = formatCashRedemptionEmail(userName, points, randAmount);
    
    return await sendEmail({
      to: 'clientservices@opianrewards.com',
      subject: `Cash Redemption Request - R${randAmount.toFixed(2)}`,
      text,
      html,
      emailType: 'CASH_REDEMPTION',
      templateData: { userName, points, randAmount }
    });
  } catch (error) {
    console.error('Failed to send cash redemption notification:', error);
    return false;
  }
}