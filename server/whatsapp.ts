import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '@db';
import { users, transactions } from '@db/schema';
import { eq } from 'drizzle-orm';

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: {
    body: string;
  };
  type: string;
}

interface WhatsAppWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: WhatsAppMessage[];
        statuses?: any[];
      };
      field: string;
    }>;
  }>;
}

/**
 * WhatsApp Business API integration for OPIAN Rewards
 * Handles customer notifications and support interactions
 */
export class WhatsAppService {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly verifyToken: string;
  private readonly webhookSecret: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN!;
    this.webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET!;

    if (!this.accessToken || !this.phoneNumberId || !this.verifyToken) {
      console.warn('WhatsApp configuration incomplete. Please check environment variables.');
    }
  }

  /**
   * Verify webhook endpoint for WhatsApp
   */
  verifyWebhook(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.error('WhatsApp webhook verification failed');
      res.sendStatus(403);
    }
  }

  /**
   * Handle incoming WhatsApp messages
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      // Verify webhook signature for security
      if (!this.verifySignature(req)) {
        console.error('Invalid WhatsApp webhook signature');
        return res.sendStatus(403);
      }

      const body: WhatsAppWebhookBody = req.body;

      if (body.object !== 'whatsapp_business_account') {
        return res.sendStatus(404);
      }

      // Process incoming messages
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            for (const message of change.value.messages) {
              await this.processMessage(message);
            }
          }
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      res.sendStatus(500);
    }
  }

  /**
   * Process individual WhatsApp message
   */
  private async processMessage(message: WhatsAppMessage) {
    try {
      const phoneNumber = message.from;
      const messageText = message.text?.body?.toLowerCase() || '';

      console.log(`WhatsApp message from ${phoneNumber}: ${messageText}`);

      // Find user by phone number
      const user = await this.findUserByPhone(phoneNumber);

      if (!user) {
        await this.sendWelcomeMessage(phoneNumber);
        return;
      }

      // Handle different command types
      if (messageText.includes('balance') || messageText.includes('points')) {
        await this.sendPointsBalance(phoneNumber, user);
      } else if (messageText.includes('package') || messageText.includes('plan')) {
        await this.sendPackageInfo(phoneNumber);
      } else if (messageText.includes('help') || messageText.includes('support')) {
        await this.sendHelpMenu(phoneNumber);
      } else if (messageText.includes('referral') || messageText.includes('refer')) {
        await this.sendReferralInfo(phoneNumber, user);
      } else {
        await this.sendDefaultResponse(phoneNumber, user.first_name);
      }
    } catch (error) {
      console.error('Error processing WhatsApp message:', error);
    }
  }

  /**
   * Send a WhatsApp message
   */
  private async sendMessage(to: string, text: string) {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: text
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('WhatsApp send error:', error);
      } else {
        console.log(`WhatsApp message sent to ${to}`);
      }
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
    }
  }

  /**
   * Send notification to customer
   */
  async sendNotification(phoneNumber: string, message: string) {
    await this.sendMessage(phoneNumber, message);
  }

  /**
   * Send points allocation notification
   */
  async sendPointsNotification(phoneNumber: string, firstName: string, points: number, description: string) {
    const message = `🎉 Hi ${firstName}!\n\nGreat news! You've earned ${points} points.\n\n💰 Reason: ${description}\n\nCheck your account for your updated balance.\n\n*OPIAN Rewards*`;
    await this.sendMessage(phoneNumber, message);
  }

  /**
   * Send cash deposit notification
   */
  async sendCashDepositNotification(phoneNumber: string, firstName: string, amount: number) {
    const message = `💳 Hi ${firstName}!\n\nYour cash deposit of R${amount} has been processed and converted to points.\n\nYou can now withdraw these points when you reach the minimum of R5,000.\n\n*OPIAN Rewards*`;
    await this.sendMessage(phoneNumber, message);
  }

  /**
   * Send redemption confirmation
   */
  async sendRedemptionConfirmation(phoneNumber: string, firstName: string, amount: number) {
    const message = `✅ Hi ${firstName}!\n\nYour redemption request for R${amount} has been processed.\n\nPlease allow 3-5 business days for the funds to reflect in your account.\n\n*OPIAN Rewards*`;
    await this.sendMessage(phoneNumber, message);
  }

  // Private helper methods
  private async findUserByPhone(phoneNumber: string) {
    // Remove country code and format phone number
    const cleanPhone = phoneNumber.replace(/^27/, '0').replace(/\D/g, '');
    
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.phone_number, cleanPhone))
        .limit(1);
      
      return user || null;
    } catch (error) {
      console.error('Error finding user by phone:', error);
      return null;
    }
  }

  private async sendWelcomeMessage(phoneNumber: string) {
    const message = `👋 Welcome to OPIAN Rewards!\n\nI don't have your details yet. Please register at our website or contact our support team.\n\n📞 Support: 011 234 5678\n🌐 Website: opianrewards.com\n\n*OPIAN Rewards*`;
    await this.sendMessage(phoneNumber, message);
  }

  private async sendPointsBalance(phoneNumber: string, user: any) {
    const message = `💰 Hi ${user.first_name}!\n\nYour current points balance:\n🎯 Rewards Points: ${user.points}\n💳 Cash Deposit Points: ${user.cash_deposit_points || 0}\n\nTotal Value: R${((user.points || 0) + (user.cash_deposit_points || 0))}\n\n*OPIAN Rewards*`;
    await this.sendMessage(phoneNumber, message);
  }

  private async sendPackageInfo(phoneNumber: string) {
    const message = `📋 Our Insurance Packages:\n\n🥉 *Bronze* - R150/month\n• Life Cover: R50,000\n• Points: 300/month\n\n🥈 *Silver* - R300/month\n• Life Cover: R100,000\n• Points: 600/month\n\n🥇 *Gold* - R500/month\n• Life Cover: R200,000\n• Points: 1,000/month\n\nContact us to upgrade!\n\n*OPIAN Rewards*`;
    await this.sendMessage(phoneNumber, message);
  }

  private async sendReferralInfo(phoneNumber: string, user: any) {
    const message = `🤝 Your Referral Code: *${user.referral_code}*\n\nShare this code with friends and family!\n\n💰 You earn 1,500 points for each successful referral\n🎁 They get 500 bonus points\n\nSpread the word and earn more rewards!\n\n*OPIAN Rewards*`;
    await this.sendMessage(phoneNumber, message);
  }

  private async sendHelpMenu(phoneNumber: string) {
    const message = `🆘 How can I help you?\n\nType any of these:\n• *balance* - Check your points\n• *package* - View insurance plans\n• *referral* - Get your referral code\n• *support* - Contact human agent\n\nOr just ask me anything!\n\n*OPIAN Rewards*`;
    await this.sendMessage(phoneNumber, message);
  }

  private async sendDefaultResponse(phoneNumber: string, firstName: string) {
    const message = `Hi ${firstName}! 👋\n\nI'm your OPIAN Rewards assistant. I can help you with:\n\n💰 Check your points balance\n📋 View insurance packages\n🤝 Get your referral code\n🆘 Connect you with support\n\nJust type what you need help with!\n\n*OPIAN Rewards*`;
    await this.sendMessage(phoneNumber, message);
  }

  private verifySignature(req: Request): boolean {
    if (!this.webhookSecret) return true; // Skip verification if no secret set

    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) return false;

    const payload = JSON.stringify(req.body);
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();