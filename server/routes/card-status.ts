import { Express, Request, Response } from "express";
import { createConnection } from "../db";
import { getUserFromTokenOrSession } from "../auth";

export function setupCardStatusRoutes(app: Express) {
  // Test endpoint for debugging only
  app.get("/api/admin/customers/card-status-test", async (req, res) => {
    console.log('Test endpoint called');
    const user = await getUserFromTokenOrSession(req);
    if (user) {
      res.json({ 
        success: true, 
        message: 'Authentication successful', 
        user: user,
        session: req.session
      });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // Endpoint to update card status for one or multiple users
  app.post("/api/admin/customers/update-card-status", async (req: Request, res: Response) => {
    console.log('Card status update request received');
    console.log('Request body:', req.body);
    console.log('Headers:', req.headers);
    
    // Use the token-session hybrid authentication approach
    const user = await getUserFromTokenOrSession(req);
    
    if (!user) {
      console.log('Authentication check failed - no user found');
      return res.status(401).json({ error: "Unauthorized - Not authenticated" });
    }
    
    console.log('Authenticated user:', {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      is_super_admin: user.is_super_admin
    });
    
    // Check for admin privileges
    const isAdmin = !!(user.is_admin || user.is_super_admin);
    
    console.log('Is admin check result:', isAdmin);
    
    if (!isAdmin) {
      console.log('Admin role check failed:', user);
      return res.status(401).json({ error: "Unauthorized - Not an admin" });
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
      
      // Clear the customers cache from the main routes file to refresh data
      console.log('Clearing customers cache after card status update');
      if (global.customersCache) {
        global.customersCache.clear();
        console.log('Customers cache cleared successfully');
      } else {
        console.warn('Could not access global customers cache for clearing');
      }

      // Log the action for each user
      const adminLogPromises = userIds.map(async (userId) => {
        await connection.execute(
          `INSERT INTO admin_logs 
          (admin_id, target_user_id, action_type, details) 
          VALUES (?, ?, ?, ?)`,
          [
            user.id, // Using the authenticated user from getUserFromTokenOrSession
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