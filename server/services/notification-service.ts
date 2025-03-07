import { db } from "@db";
import { notifications, type InsertNotification } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { createConnection } from '../db';

type NotificationCallback = (notification: any) => void;

export class NotificationService {
  private static clients = new Map<number, Set<NotificationCallback>>();

  static addClient(userId: number, callback: NotificationCallback) {
    const userCallbacks = this.clients.get(userId) || new Set();
    userCallbacks.add(callback);
    this.clients.set(userId, userCallbacks);
    console.log(`SSE client added for user ${userId}. Total clients: ${userCallbacks.size}`);
  }

  static removeClient(userId: number, callback: NotificationCallback) {
    const userCallbacks = this.clients.get(userId);
    if (userCallbacks) {
      userCallbacks.delete(callback);
      if (userCallbacks.size === 0) {
        this.clients.delete(userId);
      }
      console.log(`SSE client removed for user ${userId}. Remaining clients: ${userCallbacks.size}`);
    }
  }

  static async createNotification(data: InsertNotification) {
    const connection = await createConnection();
    try {
      console.log('Creating notification:', data);

      // Insert notification into MariaDB
      const [result] = await connection.execute(
        `INSERT INTO notifications (
          user_id, type, title, message, is_read, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.userId,
          data.type,
          data.title,
          data.message,
          data.isRead ? 1 : 0,
          data.metadata || null,
          new Date()
        ]
      );

      // Get the created notification
      const [notifications] = await connection.execute(
        'SELECT * FROM notifications WHERE id = LAST_INSERT_ID()'
      );

      const newNotification = Array.isArray(notifications) ? notifications[0] : null;

      if (!newNotification) {
        throw new Error('Failed to create notification');
      }

      console.log('Successfully created notification:', newNotification);

      // Send to connected clients
      const userCallbacks = this.clients.get(data.userId);
      if (userCallbacks) {
        const notificationEvent = {
          ...newNotification,
          isRead: Boolean(newNotification.is_read),
          createdAt: newNotification.created_at
        };
        console.log('Sending notification to clients:', notificationEvent);
        userCallbacks.forEach(callback => callback(notificationEvent));
      }

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }

  static async getUnreadNotifications(userId: number) {
    const connection = await createConnection();
    try {
      console.log('Fetching unread notifications for user:', userId);
      const [notifications] = await connection.execute(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      const transformedNotifications = Array.isArray(notifications) ? notifications.map(n => ({
        ...n,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at
      })) : [];

      console.log(`Found ${transformedNotifications.length} notifications for user ${userId}`);
      return transformedNotifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }

  static async markAsRead(userId: number, notificationId?: number) {
    const connection = await createConnection();
    try {
      const query = notificationId 
        ? 'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
        : 'UPDATE notifications SET is_read = 1 WHERE user_id = ?';

      const params = notificationId ? [notificationId, userId] : [userId];

      await connection.execute(query, params);

      console.log(`Marked notifications as read for user ${userId}${notificationId ? ` notification ${notificationId}` : ''}`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    } finally {
      await connection.end();
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