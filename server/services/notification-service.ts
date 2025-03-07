import { db } from "@db";
import { notifications, type InsertNotification } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { WebSocket } from 'ws';

export class NotificationService {
  private static clients = new Map<number, WebSocket[]>();

  static addClient(userId: number, ws: WebSocket) {
    const userClients = this.clients.get(userId) || [];
    userClients.push(ws);
    this.clients.set(userId, userClients);
    console.log(`Client added for user ${userId}. Total clients: ${userClients.length}`);
  }

  static removeClient(userId: number, ws: WebSocket) {
    const userClients = this.clients.get(userId) || [];
    const updatedClients = userClients.filter(client => client !== ws);

    if (updatedClients.length === 0) {
      this.clients.delete(userId);
    } else {
      this.clients.set(userId, updatedClients);
    }

    console.log(`Client removed for user ${userId}. Remaining clients: ${updatedClients.length}`);
  }

  static async createNotification(data: InsertNotification) {
    try {
      console.log('Creating notification:', data);

      // Insert notification and get the result
      const result = await db.insert(notifications).values(data);

      if (!result || typeof result.insertId !== 'number') {
        throw new Error('Failed to insert notification - invalid result');
      }

      // Fetch the inserted notification using the insertId
      const [newNotification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, result.insertId));

      if (!newNotification) {
        throw new Error('Failed to retrieve inserted notification');
      }

      console.log('Successfully created notification:', newNotification);

      // Send to connected clients
      await this.sendNotificationToUser(data.userId, newNotification);

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async getUnreadNotifications(userId: number) {
    try {
      console.log('Fetching unread notifications for user:', userId);
      const notifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));

      console.log(`Found ${notifications.length} notifications for user ${userId}`);
      return notifications;
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

  private static async sendNotificationToUser(userId: number, notification: any) {
    try {
      const userClients = this.clients.get(userId) || [];
      const message = JSON.stringify({
        id: notification.id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        timestamp: notification.createdAt.toISOString(),
        read: notification.isRead
      });

      console.log(`Attempting to send notification to ${userClients.length} clients for user ${userId}`);

      let sentCount = 0;
      for (const client of userClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
          sentCount++;
        }
      }

      console.log(`Successfully sent notification to ${sentCount}/${userClients.length} clients`);
    } catch (error) {
      console.error('Error sending notification to user:', error);
    }
  }

  static async notifyPointsUpdate(userId: number, points: number, description: string, senderId?: number) {
    try {
      console.log('Creating points notification:', { userId, points, description });

      return await this.createNotification({
        userId,
        type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
        title: points >= 0 ? `Earned ${points} points` : `Deducted ${Math.abs(points)} points`,
        message: description,
        senderId,
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