import { db } from "@db";
import { notifications, type InsertNotification } from "@db/schema";
import { eq, desc } from "drizzle-orm";

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
      const [notification] = await db.insert(notifications)
        .values(data)
        .returning();

      if (!notification) {
        throw new Error('Failed to create notification');
      }

      await this.sendNotificationToUser(notification.userId, notification);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async markAsRead(userId: number, notificationId?: number) {
    try {
      const query = notificationId 
        ? eq(notifications.id, notificationId)
        : eq(notifications.userId, userId);

      await db.update(notifications)
        .set({ isRead: true })
        .where(query);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async getUnreadNotifications(userId: number) {
    try {
      return await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  }

  private static async sendNotificationToUser(userId: number, notification: any) {
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

    for (const client of userClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  // Helper methods for specific notification types
  static async notifyPointsUpdate(userId: number, points: number, description: string, senderId?: number) {
    return this.createNotification({
      userId,
      type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
      title: points >= 0 ? `Earned ${points} points` : `Deducted ${Math.abs(points)} points`,
      message: description,
      senderId,
      isRead: false,
      metadata: JSON.stringify({ points }),
      createdAt: new Date()
    });
  }

  static async notifyQuoteStatusChange(userId: number, quoteId: number, status: string, senderId: number) {
    return this.createNotification({
      userId,
      type: 'QUOTE_STATUS_CHANGE',
      title: `Quote Status Updated`,
      message: `Your quote request status has been changed to ${status}`,
      senderId,
      relatedId: quoteId,
      isRead: false,
      metadata: JSON.stringify({ status }),
      createdAt: new Date()
    });
  }

  static async notifyCustomerAssignment(agentId: number, customerId: number, customerName: string) {
    return this.createNotification({
      userId: agentId,
      type: 'CUSTOMER_ASSIGNED',
      title: 'New Customer Assigned',
      message: `${customerName} has been assigned to you`,
      relatedId: customerId,
      isRead: false,
      createdAt: new Date()
    });
  }

  static async notifyCustomerRemoval(agentId: number, customerId: number, customerName: string) {
    return this.createNotification({
      userId: agentId,
      type: 'CUSTOMER_REMOVED',
      title: 'Customer Removed',
      message: `${customerName} has been removed from your assignments`,
      relatedId: customerId,
      isRead: false,
      createdAt: new Date()
    });
  }

  static async notifyProductAssignment(userId: number, productId: number, productName: string) {
    return this.createNotification({
      userId,
      type: 'PRODUCT_ASSIGNED',
      title: 'New Product Assigned',
      message: `${productName} has been assigned to you`,
      relatedId: productId,
      isRead: false,
      createdAt: new Date()
    });
  }

  static async notifyProductRemoval(userId: number, productId: number, productName: string) {
    return this.createNotification({
      userId,
      type: 'PRODUCT_REMOVED',
      title: 'Product Removed',
      message: `${productName} has been removed from your assignments`,
      relatedId: productId,
      isRead: false,
      createdAt: new Date()
    });
  }

  static async sendAdminMessage(userId: number, title: string, message: string, senderId: number) {
    return this.createNotification({
      userId,
      type: 'ADMIN_MESSAGE',
      title,
      message,
      senderId,
      isRead: false,
      createdAt: new Date()
    });
  }

  static async sendSystemUpdate(userId: number, title: string, message: string) {
    return this.createNotification({
      userId,
      type: 'SYSTEM_UPDATE',
      title,
      message,
      isRead: false,
      createdAt: new Date()
    });
  }
}