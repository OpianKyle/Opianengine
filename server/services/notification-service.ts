import { createConnection } from '../db';

type NotificationCallback = (notification: any) => void;
type NotificationType = 
  | 'POINTS_AWARDED'
  | 'POINTS_DEDUCTED'
  | 'ADMIN_MESSAGE'
  | 'SYSTEM_UPDATE';

export class NotificationService {
  private static clients = new Map<number, Set<NotificationCallback>>();

  private static async ensureNotificationsTable() {
    const connection = await createConnection();
    try {
      console.log('Attempting to create/verify notifications table...');

      // First check if table exists
      const [tables] = await connection.execute(
        'SHOW TABLES LIKE "notifications"'
      );

      if (Array.isArray(tables) && tables.length === 0) {
        console.log('Notifications table does not exist, creating...');
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS notifications (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            user_id BIGINT NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
        `);
        console.log('Notifications table created successfully');
      } else {
        console.log('Notifications table already exists');
      }
    } catch (error) {
      console.error('Error in ensureNotificationsTable:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }

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

  static async createNotification(data: {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
  }) {
    await this.ensureNotificationsTable();
    const connection = await createConnection();

    try {
      console.log('Creating notification:', {
        ...data,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null
      });

      // Insert notification
      const [result] = await connection.execute(
        `INSERT INTO notifications (
          user_id, type, title, message, is_read, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          data.userId,
          data.type,
          data.title,
          data.message,
          false,
          data.metadata ? JSON.stringify(data.metadata) : null
        ]
      );

      console.log('Notification inserted, retrieving created notification...');

      // Get the created notification
      const [notifications] = await connection.execute(
        'SELECT * FROM notifications WHERE id = LAST_INSERT_ID()'
      );

      if (!Array.isArray(notifications) || notifications.length === 0) {
        throw new Error('Failed to create notification: could not retrieve created record');
      }

      const newNotification = notifications[0];
      console.log('Successfully created notification:', newNotification);

      // Send to connected clients
      const userCallbacks = this.clients.get(data.userId);
      if (userCallbacks) {
        const notificationEvent = {
          ...newNotification,
          isRead: Boolean(newNotification.is_read),
          createdAt: newNotification.created_at,
          metadata: newNotification.metadata ? JSON.parse(newNotification.metadata) : null
        };
        console.log('Sending notification to clients:', notificationEvent);
        userCallbacks.forEach(callback => callback(notificationEvent));
      } else {
        console.log('No connected clients found for user:', data.userId);
      }

      return notificationEvent;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }

  static async getUnreadNotifications(userId: number) {
    await this.ensureNotificationsTable();
    const connection = await createConnection();

    try {
      console.log('Fetching unread notifications for user:', userId);
      const [notifications] = await connection.execute(
        'SELECT * FROM notifications WHERE user_id = ? AND is_read = false ORDER BY created_at DESC',
        [userId]
      );

      const transformedNotifications = Array.isArray(notifications) ? notifications.map(n => ({
        ...n,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
        metadata: n.metadata ? JSON.parse(n.metadata) : null
      })) : [];

      console.log(`Found ${transformedNotifications.length} unread notifications for user ${userId}`);
      return transformedNotifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }

  static async markAsRead(userId: number, notificationId?: number) {
    await this.ensureNotificationsTable();
    const connection = await createConnection();

    try {
      const query = notificationId 
        ? 'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?'
        : 'UPDATE notifications SET is_read = true WHERE user_id = ?';

      const params = notificationId ? [notificationId, userId] : [userId];

      const [result] = await connection.execute(query, params);
      console.log(`Marked notifications as read for user ${userId}${notificationId ? ` notification ${notificationId}` : ''}`);

      return result;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }

  // Helper method to test notification creation
  static async createTestNotification(userId: number) {
    try {
      console.log('Creating test notification for user:', userId);
      const notification = await this.createNotification({
        userId,
        type: 'SYSTEM_UPDATE',
        title: 'Test Notification',
        message: 'This is a test notification.',
        metadata: { test: true, timestamp: new Date().toISOString() }
      });
      console.log('Test notification created:', notification);
      return notification;
    } catch (error) {
      console.error('Error creating test notification:', error);
      throw error;
    }
  }
  // Helper method to test notification creation and verification
  static async createTestNotifications(userId: number) {
    try {
      console.log('Creating multiple test notifications for user:', userId);

      const testNotifications = [
        {
          userId,
          type: 'POINTS_AWARDED' as NotificationType,
          title: 'Points Awarded',
          message: 'You received 100 points for completing a task',
          metadata: { points: 100, type: 'task_completion' }
        },
        {
          userId,
          type: 'SYSTEM_UPDATE' as NotificationType,
          title: 'Welcome!',
          message: 'Welcome to the rewards system',
          metadata: { type: 'welcome' }
        },
        {
          userId,
          type: 'ADMIN_MESSAGE' as NotificationType,
          title: 'Profile Update',
          message: 'Please complete your profile information',
          metadata: { type: 'profile_reminder' }
        }
      ];

      const results = [];
      for (const notification of testNotifications) {
        console.log('Creating test notification:', notification);
        const result = await this.createNotification(notification);
        results.push(result);
      }

      console.log('Created test notifications:', results);
      return results;
    } catch (error) {
      console.error('Error creating test notifications:', error);
      throw error;
    }
  }

}