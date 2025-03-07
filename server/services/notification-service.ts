import { db } from "@db";
import { notifications, type InsertNotification } from "@db/schema";
import { eq, desc } from "drizzle-orm";

type NotificationCallback = (notification: any) => void;

export class NotificationService {
  private static clients = new Map<number, Set<NotificationCallback>>();

  static addClient(userId: number, callback: NotificationCallback) {
    const userCallbacks = this.clients.get(userId) || new Set();
    userCallbacks.add(callback);
    this.clients.set(userId, userCallbacks);
    console.log(`Client added for user ${userId}. Total clients: ${userCallbacks.size}`);
  }

  static removeClient(userId: number, callback: NotificationCallback) {
    const userCallbacks = this.clients.get(userId);
    if (userCallbacks) {
      userCallbacks.delete(callback);
      if (userCallbacks.size === 0) {
        this.clients.delete(userId);
      }
      console.log(`Client removed for user ${userId}. Remaining clients: ${userCallbacks.size}`);
    }
  }

  static async createNotification(data: InsertNotification) {
    try {
      console.log('Creating notification:', data);

      // Insert notification into database
      const [newNotification] = await db.insert(notifications).values(data).returning();

      if (!newNotification) {
        throw new Error('Failed to create notification');
      }

      console.log('Successfully created notification:', newNotification);

      // Send to connected clients
      const userCallbacks = this.clients.get(data.userId);
      if (userCallbacks) {
        userCallbacks.forEach(callback => callback(newNotification));
      }

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async getUnreadNotifications(userId: number) {
    try {
      console.log('Fetching unread notifications for user:', userId);
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));

      console.log(`Found ${userNotifications.length} notifications for user ${userId}`);
      return userNotifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  static async markAsRead(userId: number, notificationId?: number) {
    try {
      const query = notificationId 
        ? eq(notifications.id, notificationId)
        : eq(notifications.userId, userId);

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(query);

      console.log(`Marked notifications as read for user ${userId}${notificationId ? ` notification ${notificationId}` : ''}`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Activity tracking notifications
  static async notifyTransaction(userId: number, points: number, description: string) {
    try {
      return await this.createNotification({
        userId,
        type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
        title: points >= 0 ? `Earned ${points} points` : `Deducted ${Math.abs(points)} points`,
        message: description,
        isRead: false,
        metadata: JSON.stringify({ points, type: 'TRANSACTION' }),
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating transaction notification:', error);
      throw error;
    }
  }

  static async notifyProductActivity(userId: number, productId: number, activityType: string, pointsEarned: number) {
    try {
      return await this.createNotification({
        userId,
        type: 'PRODUCT_ACTIVITY',
        title: `Product Activity: ${activityType}`,
        message: `You earned ${pointsEarned} points for ${activityType}`,
        isRead: false,
        metadata: JSON.stringify({ productId, activityType, pointsEarned }),
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating product activity notification:', error);
      throw error;
    }
  }

  static async notifyRewardRedemption(userId: number, rewardId: number, pointsCost: number) {
    try {
      return await this.createNotification({
        userId,
        type: 'REWARD_REDEMPTION',
        title: 'Reward Redeemed',
        message: `You redeemed a reward for ${pointsCost} points`,
        isRead: false,
        metadata: JSON.stringify({ rewardId, pointsCost }),
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating reward redemption notification:', error);
      throw error;
    }
  }
  static async notifyReferralCommission(userId: number, referredUserId: number, points: number, level: number) {
    try {
      return await this.createNotification({
        userId,
        type: 'REFERRAL_COMMISSION',
        title: 'Referral Commission Earned',
        message: `You earned ${points} points from a level ${level} referral`,
        isRead: false,
        metadata: JSON.stringify({ referredUserId, points, level, type: 'REFERRAL_COMMISSION' }),
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating referral commission notification:', error);
      throw error;
    }
  }
  static async notifyPointsUpdate(userId: number, points: number, description: string) {
    try {
      console.log('Creating points notification:', { userId, points, description });

      return await this.createNotification({
        userId,
        type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
        title: points >= 0 ? `Earned ${points} points` : `Deducted ${Math.abs(points)} points`,
        message: description,
        isRead: false,
        metadata: JSON.stringify({ points }),
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating points notification:', error);
      throw error;
    }
  }

  static async sendAdminMessage(userId: number, title: string, message: string, senderId: number) {
    try {
      return await this.createNotification({
        userId,
        type: 'ADMIN_MESSAGE',
        title,
        message,
        senderId,
        isRead: false,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error sending admin message:', error);
      throw error;
    }
  }

  static async sendSystemUpdate(userId: number, title: string, message: string) {
    try {
      return await this.createNotification({
        userId,
        type: 'SYSTEM_UPDATE',
        title,
        message,
        isRead: false,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error sending system update:', error);
      throw error;
    }
  }
}