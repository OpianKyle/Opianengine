import { Express } from "express";
import { createConnection } from "../db";

export function setupCardStatusRoutes(app: Express) {
  // Endpoint to update card status for one or multiple users
  app.post("/api/admin/customers/update-card-status", async (req, res) => {
    if (!req.isAuthenticated() || !(req.user.isAdmin || req.user.isSuperAdmin)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userIds, cardStatus } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "No users selected" });
    }

    if (!cardStatus || !["NOT_DELIVERED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(cardStatus)) {
      return res.status(400).json({ error: "Invalid card status" });
    }

    const connection = await createConnection();
    try {
      // Format question marks for SQL query
      const questionMarks = userIds.map(() => '?').join(',');
      
      // Update card status for all selected users
      await connection.execute(
        `UPDATE users SET card_status = ? WHERE id IN (${questionMarks})`,
        [cardStatus, ...userIds]
      );

      // Log the action for each user
      const adminLogPromises = userIds.map(async (userId) => {
        await connection.execute(
          `INSERT INTO admin_logs 
          (admin_id, target_user_id, action_type, details) 
          VALUES (?, ?, ?, ?)`,
          [
            req.user.id,
            userId,
            "USER_UPDATED",
            `Card status updated to ${cardStatus}`
          ]
        );
      });

      await Promise.all(adminLogPromises);

      res.json({ 
        success: true,
        message: `Card status updated to ${cardStatus} for ${userIds.length} user(s)`
      });
    } catch (error) {
      console.error('Error updating card status:', error);
      res.status(500).json({ error: 'Failed to update card status' });
    } finally {
      await connection.end();
    }
  });
}