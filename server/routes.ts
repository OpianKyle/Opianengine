import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./websocket";
import { db } from "@db";
import { rewards, transactions, users, products, productAssignments, product_activities, adminLogs, quoteRequests, notifications } from "@db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { logAdminAction } from "./admin-logger";
import { sendEmail, formatPointsAssignmentEmail, formatAdminNotificationEmail, formatQuoteRequestEmail, formatAdminQuoteRequestEmail } from "./utils/emailService";
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { Readable } from 'stream';
import session from 'express-session';
import MemoryStore from 'memorystore';
import referralRouter from './routes/referral';  // Import referral routes
import { createConnection } from './db'; // Added import statement

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
};

export function registerRoutes(app: Express): Server {
  const MemoryStoreSession = MemoryStore(session);
  const sessionMiddleware = session({
    cookie: { 
      maxAge: 86400000, // 24 hours
      secure: false, // Set to true in production
      sameSite: 'lax'
    },
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'development-secret'
  });

  app.use(sessionMiddleware);
  setupAuth(app);

  // Mount referral routes
  app.use(referralRouter);

  const httpServer = createServer(app);
  const wsServer = setupWebSocketServer(httpServer, sessionMiddleware);

  app.get("/api/customer/referral", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log('Fetching referral info for user:', req.user.id);

      // Get the user's referral data using MySQL syntax
      const referralInfo = await db.select({
        referralCode: users.referralCode,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1)
      .execute();

      if (!referralInfo || referralInfo.length === 0) {
        console.error('User not found:', req.user.id);
        return res.status(404).json({ error: "User not found" });
      }

      const userInfo = referralInfo[0];

      if (!userInfo.referralCode) {
        // Generate a new referral code if one doesn't exist
        const newReferralCode = `REF${req.user.id}${Date.now().toString(36)}`;
        await db.update(users)
          .set({ referralCode: newReferralCode })
          .where(eq(users.id, req.user.id))
          .execute();

        userInfo.referralCode = newReferralCode;
      }

      console.log('Found referral code:', userInfo.referralCode);

      // Get users who were referred by this user
      const referrals = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.referredBy, userInfo.referralCode))
      .orderBy(desc(users.createdAt))
      .execute();

      console.log('Found referrals count:', referrals.length);

      res.json({
        referralCode: userInfo.referralCode,
        referralCount: referrals.length,
        referrals: referrals
      });
    } catch (error) {
      console.error('Error fetching referral data:', error);
      res.status(500).json({ error: 'Failed to fetch referral data' });
    }
  });



  app.get("/api/products/assignments/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;

    try {
      const assignment = await db.query.productAssignments.findFirst({
        where: eq(productAssignments.id, parseInt(id)),
        with: {
          product: true
        }
      });

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error('Error fetching assignment:', error);
      res.status(500).json({ error: 'Failed to fetch assignment' });
    }
  });

  app.get("/api/admin/logs", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    try {
      const logs = await db.query.adminLogs.findMany({
        orderBy: desc(adminLogs.createdAt),
        with: {
          admin: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          targetUser: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      res.json(logs);
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      res.status(500).json({ error: 'Failed to fetch admin logs' });
    }
  });

  app.post("/api/admin/points", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { userId, points, description } = req.body;

    try {
      const result = await db.transaction(async (tx) => {
        const [targetUser] = await tx
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            points: users.points
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
          .execute();

        if (!targetUser) {
          throw new Error("User not found");
        }

        const [admin] = await tx
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
          })
          .from(users)
          .where(eq(users.id, req.user.id))
          .limit(1)
          .execute();

        await tx.insert(transactions).values({
          userId,
          points,
          type: "ADMIN_ADJUSTMENT",
          description,
        }).execute();

        const [updatedUser] = await tx
          .update(users)
          .set({
            points: sql`${users.points} + ${points}`,
          })
          .where(eq(users.id, userId))
          .returning()
          .execute();

        const tierPoints = updatedUser.points;
        let currentTier = "Bronze";
        if (tierPoints >= 150000) currentTier = "Platinum";
        else if (tierPoints >= 100000) currentTier = "Gold";
        else if (tierPoints >= 50000) currentTier = "Purple";
        else if (tierPoints >= 10000) currentTier = "Silver";

        // Update WebSocket notification using the correct method
        await wsServer.notifyPointsUpdate(userId, points, description);

        const customerEmail = formatPointsAssignmentEmail(
          targetUser.firstName || "Valued Customer",
          points,
          description,
          currentTier
        );
        await sendEmail({
          to: targetUser.email,
          subject: "Points Added to Your Account",
          text: customerEmail.text,
          html: customerEmail.html
        });

        const adminEmail = formatAdminNotificationEmail(
          `${targetUser.firstName} ${targetUser.lastName}`,
          points,
          description,
          admin.firstName || "Admin"
        );
        await sendEmail({
          to: admin.email,
          subject: `Points Assignment Confirmation: ${targetUser.firstName} ${targetUser.lastName}`,
          text: adminEmail.text,
          html: adminEmail.html
        });

        await logAdminAction({
          adminId: req.user.id,
          actionType: "POINT_ADJUSTMENT",
          targetUserId: userId,
          details: `Adjusted points by ${points}. Reason: ${description}`,
        });

        return updatedUser;
      });

      res.json({ message: "Points adjusted successfully" });
    } catch (error) {
      console.error('Error adjusting points:', error);
      res.status(500).json({ error: 'Failed to adjust points' });
    }
  });

  app.post("/api/admin/users/create", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check super admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0 || adminCheck[0].role_type !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: "Only super admins can create new admins" });
      }

      const { email, password, firstName, lastName, phoneNumber } = req.body;

      // Check for existing user
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const hashedPassword = await crypto.hash(password);

      await connection.beginTransaction();

      try {
        // Create user
        const [userResult] = await connection.execute(
          `INSERT INTO users (email, password, first_name, last_name, phone_number, is_enabled, points)
           VALUES (?, ?, ?, ?, ?, 1, 0)`,
          [email, hashedPassword, firstName, lastName, phoneNumber]
        );

        const userId = userResult.insertId;

        // Create admin role
        await connection.execute(
          `INSERT INTO admin_users (user_id, role_type)
           VALUES (?, ?)`,
          [userId, 'ADMIN']
        );

        await connection.commit();

        const [newUser] = await connection.execute(
          'SELECT * FROM users WHERE id = ?',
          [userId]
        );

        const { password: _, ...safeUser } = newUser[0];

        res.json({
          ...safeUser,
          is_admin: true,
          is_super_admin: false
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
      res.status(500).json({ error: 'Failed to create admin user' });
    } finally {
      await connection.end();
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;
    const { email, firstName, lastName, phoneNumber, password } = req.body;

    try {
      const updates: any = {
        email,
        firstName,
        lastName,
        phoneNumber,
      };

      if (password) {
        updates.password = await authCrypto.hashPassword(password);
      }

      const [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, parseInt(id)))
        .returning()
        .execute();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await logAdminAction({
        adminId: req.user.id,
        actionType: "ADMIN_UPDATED",
        targetUserId: user.id,
        details: `Updated admin user: ${user.email}`,
      });

      res.json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.put("/api/admin/users/:id/details", async (req, res) => {
    console.log('Update user details request:', {
      isAuthenticated: req.isAuthenticated(),
      userId: req.params.id,
      user: req.user ? {
        id: req.user.id,
        email: req.user.email
      } : null
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        console.log('User not found in admin_users:', req.user.id);
        return res.status(403).json({ error: "Admin access required" });
      }

      // Convert selectedPackage to uppercase before update
      const updateData = {
        ...req.body,
        selected_package: req.body.selectedPackage ? String(req.body.selectedPackage).toUpperCase() : null
      };

      // Update user details
      const [result] = await connection.execute(
        `UPDATE users SET
          first_name = ?,
          last_name = ?,
          email = ?,
          phone_number = ?,
          selected_package = ?,
          industry = ?,
          occupation = ?,
          address = ?,
          city = ?,
          postal_code = ?
        WHERE id = ?`,
        [
          updateData.firstName,
          updateData.lastName,
          updateData.email,
          updateData.phoneNumber,
          updateData.selected_package,
          updateData.industry,
          updateData.occupation,
          updateData.address,
          updateData.city,
          updateData.postalCode,
          req.params.id
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Fetch updated user data
      const [updatedUser] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [req.params.id]
      );

      const user = updatedUser[0];
      const { password: _, ...safeUser } = user;

      res.json(safeUser);
    } catch (error) {
      console.error('Error updating user details:', error);
      res.status(500).json({ error: 'Failed to update user details' });
    } finally {
      await connection.end();
    }
  });

  app.put("/api/admin/users/:id/toggle-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { enabled } = req.body;

      const [result] = await connection.execute(
        'UPDATE users SET is_enabled = ? WHERE id = ?',
        [enabled ? 1 : 0, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const [updatedUser] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      const user = updatedUser[0];
      const { password: _, ...safeUser } = user;

      res.json(safeUser);
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({ error: 'Failed to toggle user status' });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/quote-requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const [requests] = await connection.execute(
        `SELECT qr.*, 
          u.email as user_email,
          u.first_name as user_first_name,
          u.last_name as user_last_name
         FROM quote_requests qr
         JOIN users u ON qr.user_id = u.id
         ORDER BY qr.created_at DESC`
      );

      res.json(requests);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      res.status(500).json({ error: 'Failed to fetch quote requests' });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, description, activities } = req.body;

      console.log('Creating product:', {
        name,
        description,
        activitiesCount: activities?.length
      });

      await connection.beginTransaction();

      try {
        // Create product
        const [productResult] = await connection.execute(
          `INSERT INTO products (name, description, is_enabled)
           VALUES (?, ?, 1)`,
          [name, description]
        );

        const productId = productResult.insertId;

        // Create product activities
        if (activities && Array.isArray(activities)) {
          for (const activity of activities) {
            await connection.execute(
              `INSERT INTO product_activities (product_id, type, points_value)
               VALUES (?, ?, ?)`,
              [productId, activity.type, activity.pointsValue]
            );
          }
        }

        await connection.commit();

        // Fetch complete product data
        const [products] = await connection.execute(
          `SELECT 
            p.*,
            COALESCE(
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', pa.id,
                  'type', pa.type,
                  'pointsValue', pa.points_value
                )
              ),
              '[]'
            ) as activities
           FROM products p
           LEFT JOIN product_activities pa ON p.id = pa.product_id
           WHERE p.id = ?
           GROUP BY p.id`,
          [productId]
        );

        if (!products || products.length === 0) {
          throw new Error('Product not found after creation');
        }

        const product = products[0];

        // Parse the activities JSON string
        let parsedActivities = [];
        try {
          parsedActivities = JSON.parse(product.activities);
          // Remove null entries if any
          parsedActivities = parsedActivities.filter(activity => activity != null);
        } catch (e) {
          console.error('Error parsing activities:', e);
          parsedActivities = [];
        }

        const transformedProduct = {
          id: product.id,
          name: product.name,
          description: product.description,
          isEnabled: Boolean(product.is_enabled),
          createdAt: product.created_at,
          activities: parsedActivities
        };

        console.log('Product created successfully:', {
          id: transformedProduct.id,
          name: transformedProduct.name,
          activitiesCount: transformedProduct.activities.length
        });

        res.json(transformedProduct);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ 
        error: 'Failed to create product',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/products", async (req, res) => {
    const connection = await createConnection();
    try {
      console.log('Fetching products...');
      const [products] = await connection.execute(
        `SELECT 
          p.*,
          COALESCE(
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', pa.id,
                'type', pa.type,
                'pointsValue', pa.points_value
              )
            ),
            '[]'
          ) as activities
        FROM products p
        LEFT JOIN product_activities pa ON p.id = pa.product_id
        GROUP BY p.id
        ORDER BY p.created_at DESC`
      );

      // Transform the products data
      const transformedProducts = products.map(product => {
        let activities = [];
        try {
          activities = JSON.parse(product.activities);
          // Remove null entries if any
          activities = activities.filter(activity => activity != null);
        } catch (e) {
          console.error('Error parsing activities for product:', product.id, e);
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          isEnabled: Boolean(product.is_enabled),
          createdAt: product.created_at,
          activities: activities
        };
      });

      console.log(`Found ${transformedProducts.length} products`);
      res.json(transformedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ 
        error: 'Failed to fetch products',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/products/customer", async (req, res) => {
    try {
      const allProducts = await db.query.products.findMany({
        where: eq(products.isEnabled, true),
        columns: {          id: true,
          name: true,
          description: true,
        },
        orderBy: desc(products.createdAt),
      });
      res.json(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { name, description, activities } = req.body;

      console.log('Updating product:', {
        id,
        name,
        description,
        activitiesCount: activities?.length
      });

      await connection.beginTransaction();

      try {
        // Update product
        await connection.execute(
          `UPDATE products 
           SET name = ?, description = ?
           WHERE id = ?`,
          [name, description, id]
        );

        // Delete existing activities
        await connection.execute(
          'DELETE FROM product_activities WHERE product_id = ?',
          [id]
        );

        // Insert new activities
        if (activities && Array.isArray(activities)) {
          for (const activity of activities) {
            await connection.execute(
              `INSERT INTO product_activities (product_id, type, points_value)
               VALUES (?, ?, ?)`,
              [id, activity.type, activity.pointsValue]
            );
          }
        }

        await connection.commit();

        // Fetch updated product with activities
        const [products] = await connection.execute(
          `SELECT 
            p.*,
            COALESCE(
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', pa.id,
                  'type', pa.type,
                  'pointsValue', pa.points_value
                )
              ),
              '[]'
            ) as activities
           FROM products p
           LEFT JOIN product_activities pa ON p.id = pa.product_id
           WHERE p.id = ?
           GROUP BY p.id`,
          [id]
        );

        if (!products || products.length === 0) {
          return res.status(404).json({ error: "Product not found" });
        }

        const product = products[0];

        // Parse the activities JSON string
        let parsedActivities = [];
        try {
          parsedActivities = JSON.parse(product.activities);
          // Remove null entries if any
          parsedActivities = parsedActivities.filter(activity => activity != null);
        } catch (e) {
          console.error('Error parsing activities:', e);
          parsedActivities = [];
        }

        const transformedProduct = {
          id: product.id,
          name: product.name,
          description: product.description,
          isEnabled: Boolean(product.is_enabled),
          createdAt: product.created_at,
          activities: parsedActivities
        };

        console.log('Product updated successfully:', {
          id: transformedProduct.id,
          name: transformedProduct.name,
          activitiesCount: transformedProduct.activities.length
        });

        res.json(transformedProduct);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ 
        error: 'Failed to update product',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/products/:id/toggle-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { enabled } = req.body;

      // Update product status
      const [result] = await connection.execute(
        'UPDATE products SET is_enabled = ? WHERE id = ?',
        [enabled ? 1 : 0, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Fetch updated product
      const [products] = await connection.execute(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );

      const product = products[0];

      // Transform the response
      const transformedProduct = {
        id: product.id,
        name: product.name,
        description: product.description,
        isEnabled: Boolean(product.is_enabled),
        createdAt: product.created_at
      };

      res.json(transformedProduct);
    } catch (error) {
      console.error('Error toggling product status:', error);
      res.status(500).json({ error: 'Failed to toggle product status' });
    } finally {
      await connection.end();
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;

    try {
      const connection = await createConnection();
      try {
        // First check if product exists
        const [products] = await connection.execute(
          'SELECT name FROM products WHERE id = ?',
          [id]
        );

        if(!products || products.length === 0) {
          return res.status(404).json({ error: "Product not found" });
        }

        const product = products[0];

        // Begin transaction
        await connection.beginTransaction();

        // Delete product activities first (due to foreign key constraint)
        await connection.execute(
          'DELETE FROM product_activities WHERE product_id = ?',
          [id]
        );

        // Delete product assignments (due to foreign key constraint)
        await connection.execute(
          'DELETE FROM product_assignments WHERE product_id = ?',
          [id]
        );

        // Finally delete the product
        await connection.execute(
          'DELETE FROM products WHERE id = ?',
          [id]
        );

        await connection.commit();

        await logAdminAction({
          adminId: req.user.id,
          actionType: "PRODUCT_DELETED",
          details: `Deleted product: ${product.name}`,
        });

        res.json({ message: "Product deleted successfully" });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  app.post("/api/products/:id/assign", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { userId } = req.body;

      // Check if assignment already exists
      const [existingAssignment] = await connection.execute(
        'SELECT id FROM product_assignments WHERE product_id = ? AND user_id = ?',
        [id, userId]
      );

      if (existingAssignment.length > 0) {
        return res.status(400).json({ error: "Customer is already assigned to this product" });
      }

      // Create the assignment
      const [result] = await connection.execute(
        'INSERT INTO product_assignments (product_id, user_id) VALUES (?, ?)',
        [id, userId]
      );

      // Fetch the created assignment with product details
      const [assignment] = await connection.execute(
        `SELECT pa.*, p.name as product_name
         FROM product_assignments pa
         JOIN products p ON pa.product_id = p.id
         WHERE pa.id = ?`,
        [result.insertId]
      );

      res.json(assignment[0]);
    } catch (error) {
      console.error('Error assigning product:', error);
      res.status(500).json({ error: 'Failed to assign product' });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/products/:id/unassign", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { userId } = req.body;

      // Delete the assignment
      const [result] = await connection.execute(
        'DELETE FROM product_assignments WHERE product_id = ? AND user_id = ?',
        [id, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      res.json({ message: "Product unassigned successfully" });
    } catch (error) {
      console.error('Error unassigning product:', error);
      res.status(500).json({ error: 'Failed to unassign product' });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/products/assignments/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;

    try {
      const assignment = await db.query.productAssignments.findFirst({
        where: eq(productAssignments.id, parseInt(id)),
        with: {
          product: true,
          user: true,
        }
      });

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error('Error fetching assignment:', error);
      res.status(500).json({ error: 'Failed to fetch assignment' });
    }
  });

  app.get("/api/products/customer", async (req, res) => {
    try {      const allProducts = await db.query.products.findMany({
        where: eq(products.isEnabled, true),
        columns: {          id: true,
          name: true,
          description: true,
        },
        orderBy: desc(products.createdAt),
      });
      res.json(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.post("/api/quote-requests", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { productId } = req.body;

    try {
      const existingRequest = await db.query.quoteRequests.findFirst({
        where: sql`${quoteRequests.userId} = ${req.user.id} AND 
                  ${quoteRequests.status} IN ('PENDING', 'IN_PROGRESS')`,
      });

      if (existingRequest) {
        return res.status(400).json({ 
          error: "You already have an active quote request. Please wait for it to be processed." 
        });
      }

      const [product] = await db
        .select()
        .from(products)
        .where(
          sql`${products.id} = ${productId} AND ${products.isEnabled} = true`
        )
        .limit(1)
        .execute();

      if (!product) {
        return res.status(404).json({ error: "Product not found or not available" });
      }

      const [quoteRequest] = await db
        .insert(quoteRequests)
        .values({
          userId: req.user.id,
          productId,
          status: "PENDING",
        })
        .returning()
        .execute();

      const customerEmailContent = formatQuoteRequestEmail(
        req.user.firstName || 'Customer',
        product.name
      );
      await sendEmail({
        to: req.user.email,
        subject: "Quote Request Confirmation",
        text: customerEmailContent.text,
        html: customerEmailContent.html
      });

      const adminUsers = await db
        .select()
        .from(users)
        .where(eq(users.isAdmin, true))
        .execute();

      for(const admin of adminUsers) {
        const adminEmailContent = formatAdminQuoteRequestEmail(
          `${req.user.firstName || 'Customer'} ${req.user.lastName || ''}`,
          req.user.email,
          product.name,
          admin.firstName || 'Admin'
        );

        await sendEmail({
          to: admin.email,
          subject: `New Quote Request - ${product.name}`,
          text: adminEmailContent.text,
          html: adminEmailContent.html
        });
      }

      res.json(quoteRequest);
    } catch (error) {
      console.error('Error creating quote request:', error);
      res.status(500).json({ error: 'Failed to create quote request' });
    }
  });

  app.get("/api/quote-requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const [requests] = await connection.execute(
        `SELECT qr.*, 
          u.email as user_email,
          u.first_name as user_first_name,
          u.last_name as user_last_name
         FROM quote_requests qr
         JOIN users u ON qr.user_id = u.id
         ORDER BY qr.created_at DESC`
      );

      res.json(requests);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      res.status(500).json({ error: 'Failed to fetch quote requests' });
    } finally {
      await connection.end();
    }
  });

  app.put("/api/quote-requests/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});

    const { id } = req.params;
    const { status, notes } = req.body;

    try {
      const [quoteRequest] = await db
        .select()
        .from(quoteRequests)
        .where(eq(quoteRequests.id, parseInt(id)))
        .limit(1)
        .execute();

      if (!quoteRequest) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      const updates: any = {
        status,
        notes,
        updatedAt: new Date(),
      };

      if (status === "COMPLETED" || status === "REJECTED") {
        updates.completedAt = new Date();
        updates.completedBy = req.user.id;
      }

      const [updatedRequest] = await db
        .update(quoteRequests)
        .set(updates)
        .where(eq(quoteRequests.id, parseInt(id)))
        .returning()
        .execute();

      await db.insert(notifications).values({
        userId: quoteRequest.userId,
        type: "QUOTE_STATUS_CHANGE",
        title: "Quote Request Update",
        message: `Your quote request has been ${status.toLowerCase()}${notes ? `: ${notes}` : ''}`,
        relatedId: quoteRequest.id
      }).execute();

      await logAdminAction({
        adminId: req.user.id,
        actionType: status === "COMPLETED" ? "QUOTE_REQUEST_COMPLETED" : 
                   status === "REJECTED" ? "QUOTE_REQUEST_REJECTED" : 
                   "QUOTE_REQUEST_UPDATED",
        targetUserId: quoteRequest.userId,
        details: `Updated quote request status to ${status}`,
      });

      const completeRequest = await db.query.quoteRequests.findFirst({
        where: eq(quoteRequests.id, parseInt(id)),
        with: {
          user: {
            columns: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          product: {
            columns: {
              name: true,
              description: true
            }
          },
          completedByUser: {
            columns: {
              firstName: true,
              lastName: true,
            }
          }
        }
      });

      res.json(completeRequest);
    } catch (error) {
      console.error('Error updating quote request:', error);
      res.status(500).json({ error: 'Failed to update quote request' });
    }
  });

  app.get("/api/customer/points", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id),
    });
    res.json(user);
  });

  // Add the customer transactions endpoint
  app.get("/api/customer/transactions", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log('Fetching transactions for user:', req.user.id);

      const transactions = await db.execute(
        `SELECT 
          t.*,
          DATE_FORMAT(t.created_at, '%Y-%m-%dT%H:%i:%s.000Z') as created_at
        FROM transactions t
        WHERE t.user_id = ?
        ORDER BY t.created_at DESC`,
        [req.user.id]
      );

      // Transform the data to match the expected format
      const formattedTransactions = transactions[0].map((t: any) => ({
        id: t.id,
        points: t.points,
        description: t.description,
        type: t.type,
        createdAt: t.created_at
      }));

      res.json(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.get("/api/customer/referral", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1)
        .execute();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let currentReferralCode = user.referral_code;
      if (!currentReferralCode) {
        currentReferralCode = randomBytes(8).toString("hex");
        await db
          .update(users)
          .set({ referral_code: currentReferralCode })
          .where(eq(users.id, req.user.id))
          .execute();
      }

      const referrals = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.referred_by, currentReferralCode))
        .orderBy(desc(users.createdAt))
        .execute();

      res.json({
        referralCode: currentReferralCode,
        referralCount: referrals.length,
        referrals,
      });
    } catch (error) {
      console.error('Error fetching referral info:', error);
      res.status(500).json({ error: 'Failed to fetch referral information' });
    }
  });

  app.get("/api/customer/referrals", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});

    try {
      console.log("Fetching referral stats for user:", req.user.id);

      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1)
        .execute();

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const level1Referrals = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          createdAt: users.createdAt,
          referral_code: users.referral_code
        })
        .from(users)
        .where(eq(users.referred_by, currentUser.referral_code))
        .execute();

      const level2Count = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          inArray(
            users.referred_by,
            level1Referrals.map(r => r.referral_code)
          )
        )
        .execute();

      const level2Referrals = await db
        .select({ referral_code: users.referral_code })
        .from(users)
        .where(
          inArray(
            users.referred_by,
            level1Referrals.map(r => r.referral_code)
          )
        )
        .execute();

      const level3Count = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          inArray(
            users.referred_by,
            level2Referrals.map(r => r.referral_code)
          )
        )
        .execute();

      const referralsWithCounts = await Promise.all(
        level1Referrals.map(async (referral) => {
          const referralCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.referred_by, referral.referral_code))
            .execute();

          return {
            ...referral,
            referralCount: Number(referralCount[0]?.count || 0),
          };
        })
      );

      console.log("Sending referral stats:", {
        referralCode: currentUser.referral_code,
        level1Count: level1Referrals.length,
        level2Count: Number(level2Count[0]?.count || 0),
        level3Count: Number(level3Count[0]?.count || 0),
      });

      res.json({
        referralCode: currentUser.referral_code,
        level1Count: level1Referrals.length,
        level2Count: Number(level2Count[0]?.count || 0),
        level3Count: Number(level3Count[0]?.count || 0),
        referrals: referralsWithCounts,
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });

  app.get("/api/rewards", async (req, res) => {
    const allRewards = await db.query.rewards.findMany({
      where: eq(rewards.available, true),
    });
    res.json(allRewards);
  });

  app.post("/api/rewards", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    try {
      const [reward] = await db.insert(rewards).values({
        ...req.body,
        available: true,
      }).returning().execute();

      await logAdminAction({
        adminId: req.user.id,
        actionType: "REWARD_CREATED",
        details: `Created new ${req.body.type === 'CASH' ? 'cash redemption' : ''} reward: ${reward.name} (Cost: ${reward.pointsCost} points${req.body.type === 'CASH' ? `, R${(reward.pointsCost * 0.015).toFixed(2)}` : ''})`,
      });

      res.json(reward);
    } catch (error) {
      console.error('Error creating reward:', error);
      res.status(500).json({ error: 'Failed to create reward' });
    }
  });

  app.put("/api/rewards/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;
    const { name, description, pointsCost, imageUrl, available } = req.body;

    try {
      const [reward] = await db
        .update(rewards)
        .set({
          name,
          description,
          pointsCost,
          imageUrl,
          available,
        })
        .where(eq(rewards.id, parseInt(id)))
        .returning()
        .execute();

      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }

      await logAdminAction({
        adminId: req.user.id,
        actionType: "REWARD_UPDATED",
        details: `Updated reward: ${reward.name} (New Cost: ${reward.pointsCost} points)`,
      });

      res.json(reward);
    } catch (error) {
      console.error('Error updating reward:', error);
      res.status(500).json({ error: 'Failed to update reward' });
    }
  });

  app.delete("/api/rewards/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;

    try {
      const [reward] = await db
        .select()
        .from(rewards)
        .where(eq(rewards.id, parseInt(id)))
        .limit(1)
        .execute();

      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }

      await db
        .update(rewards)
        .set({ available: false })
        .where(eq(rewards.id, parseInt(id)))
        .execute();

      await logAdminAction({
        adminId: req.user.id,
        actionType: "REWARD_DELETED",
        details: `Deleted reward: ${reward.name}`,
      });

      res.json({ message: "Reward deleted successfully" });
    } catch (error) {
      console.error('Error deleting reward:', error);
      res.status(500).json({ error: 'Failed to delete reward' });
    }
  });

  app.post("/api/rewards/redeem", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});
    const { rewardId } = req.body;

    const reward = await db.query.rewards.findFirst({
      where: eq(rewards.id, rewardId),
    });

    if (!reward) return res.status(404).json({ error: "Reward not found" });

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id),
    });

    if (!user || user.points < reward.pointsCost) {
      return res.status(400).json({ error: "Insufficient points" });
    }

    try {
      await db.transaction(async (tx) => {
        await tx.insert(transactions).values({
          userId: user.id,
          points: -reward.pointsCost,
          type: reward.type === "CASH" ? "CASH_REDEMPTION" : "REDEEMED",
          description: reward.type === "CASH"
            ? `Redeemed points for R${(reward.pointsCost * 0.015).toFixed(2)}`
            : `Redeemed ${reward.name}`,
          rewardId,
        }).execute();

        await tx
          .update(users)
          .set({ points: user.points - reward.pointsCost })
          .where(eq(users.id, user.id))
          .execute();

        await logAdminAction({
          adminId: user.id,
          actionType: "POINT_ADJUSTMENT",
          targetUserId: user.id,
          details: reward.type === "CASH"
            ? `Points deducted (-${reward.pointsCost}) for cash redemption of R${(reward.pointsCost * 0.015).toFixed(2)}`
            : `Points deducted (-${reward.pointsCost}) for redeeming reward: ${reward.name}`,
        });
      });

      res.json({
        success: true,
        message: reward.type === "CASH"
          ? `Successfully redeemed R${(reward.pointsCost * 0.015).toFixed(2)}`
          : `Successfully redeemed ${reward.name}`
      });
    } catch (error) {
      console.error('Error processing reward redemption:', error);
      res.status(500).json({ error: 'Failed to process reward redemption' });
    }
  });

  app.post("/api/rewards/redeem-cash", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ error: "Invalid points amount" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
      });

      if (!user || user.points < points) {
        return res.status(400).json({ error: "Insufficient points" });
      }

      await db.transaction(async (tx) => {
        const [transaction] = await tx.insert(transactions).values({
          userId: user.id,
          points: -points,
          type: "CASH_REDEMPTION",
          description: `Redeemed points for R${(points * 0.015).toFixed(2)}`,
          status: "PENDING",
          createdAt: new Date(),
        }).returning().execute();

        await tx
          .update(users)
          .set({
            points: sql`${users.points} - ${points}`
          })
          .where(eq(users.id, user.id))
          .execute();


      });

      res.json({
        success: true,
        message: `Successfully redeemed R${(points * 0.015).toFixed(2)}`
      });
    } catch (error) {
      console.error('Error processing cash redemption:', error);
      res.status(500).json({ error: 'Failed to process cash redemption' });
    }
  });

  app.get("/api/admin/cash-redemptions", async (req, res) => {
    console.log('Cash redemptions request:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        is_admin: req.user.is_admin,
        is_super_admin: req.user.is_super_admin
      } : null
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        console.log('User not found in admin_users:', req.user.id);
        return res.status(403).json({ error: "Admin access required" });
      }

      // Fetch cash redemptions with user details
      const [redemptions] = await connection.execute(
        `SELECT 
          t.*,
          u.email as user_email,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          CASE WHEN t.processed_by IS NOT NULL THEN
            JSON_OBJECT(
              'id', p.id,
              'email', p.email,
              'firstName', p.first_name,
              'lastName', p.last_name
            )
          ELSE NULL END as processor
        FROM transactions t
        INNER JOIN users u ON t.user_id = u.id
        LEFT JOIN users p ON t.processed_by = p.id
        WHERE t.type = 'CASH_REDEMPTION'
        ORDER BY t.created_at DESC`
      );

      console.log(`Found ${redemptions.length} cash redemptions`);

      // Transform the redemptions data
      const transformedRedemptions = redemptions.map(redemption => ({
        ...redemption,
        processor: redemption.processor ? JSON.parse(redemption.processor) : null,
        status: redemption.status || 'PENDING'
      }));

      res.json(transformedRedemptions);
    } catch (error) {
      console.error('Error fetching cash redemptions:', error);
      res.status(500).json({ error: 'Failed to fetch cash redemptions' });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/admin/cash-redemptions/:id/process", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;

    try {
      const [transaction] = await db
        .update(transactions)
        .set({
          status: 'PROCESSED',
          processedAt: new Date(),
          processedBy: req.user.id
        })
        .where(eq(transactions.id, parseInt(id)))
        .returning()
        .execute();

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      await logAdminAction({
        adminId: req.user.id,
        actionType: "POINT_ADJUSTMENT",
        targetUserId: transaction.userId,
        details: `Processed cash redemption of R${(Math.abs(transaction.points) * 0.015).toFixed(2)} (${Math.abs(transaction.points)} points)`,
      });

      res.json(transaction);
    } catch (error) {
      console.error('Error processing cash redemption:', error);
      res.status(500).json({ error: 'Failed to process cash redemption' });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const userNotifications = await db.query.notifications.findMany({
        where: eq(notifications.userId, req.user.id),
        orderBy: desc(notifications.createdAt),
        limit: 50 
      });

      res.json(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.post("/api/notifications/mark-read", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { notificationId } = req.body;

    try {
      if (notificationId) {
        const [deletedNotification] = await db
          .delete(notifications)
          .where(
            and(
              eq(notifications.id, parseInt(notificationId)),
              eq(notifications.userId, req.user.id)
            )
          )
          .returning()
          .execute();

        if (!deletedNotification) {
          return res.status(404).json({ error:"Notification not found" });
        }
      } else {
        await db
          .delete(notifications)
          .where(eq(notifications.userId, req.user.id))
          .execute();
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    const { email } = req.body;

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
        .execute();

      if (user) {
        const resetToken = randomBytes(32).toString("hex");
        const tokenExpiry = new Date(Date.now() + 3600000); 

        await db
          .update(users)
          .set({
            resetToken,
            resetTokenExpiry: tokenExpiry,
          })
          .where(eq(users.id, user.id))
          .execute();

        console.log('\n');
        console.log('🔑 PASSWORD RESET REQUEST 🔑');
        console.log('=============================');
        console.log('Email:', email);
        console.log('Reset Token:', resetToken);
        console.log('Token Expiry:', tokenExpiry);
        console.log('=============================');

        const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
        console.log('📧 RESET PASSWORD LINK:');
        console.log('=============================');
        console.log(resetLink);
        console.log('=============================\n');

        await sendEmail({
          to: email,
          subject: "Password Reset Request",
          text: `
            You requested a password reset. Click the following link to reset your password:
            ${resetLink}

            This link will expire in 1 hour.

            If you didn't request this, please ignore this email.
          `,
          html: `
            <h1>Password Reset Request</h1>
            <p>You requested a password reset. Click the following link to reset your password:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `
        });
      }

      res.json({ message: "If an account exists with that email, you will receive password reset instructions." });
    } catch (error) {
      console.error('Error in password reset:', error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/reset-password/:token", async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          sql`${users.resetToken} = ${token} AND ${users.resetTokenExpiry} > NOW()`
        )
        .limit(1)
        .execute();

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      const hashedPassword = await authCrypto.hashPassword(newPassword);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        })
        .where(eq(users.id, user.id))
        .execute();

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error('Error in password reset:', error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.put("/api/user", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try{
      const {
        firstName,
        lastName,
        phoneNumber,
        address,
        city,
        postalCode,
        idNumber,
        dateOfBirth,
        industry,
        occupation,
        isSouthAfrican,
        selectedPackage,
        bankName,
        accountType,
        accountNumber,
        hasCreditCard
        
      } = req.body;

      const updates: any = {
        firstName,
        lastName,
        phoneNumber,
        address,
        city,
        postalCode,
        idNumber,
        dateOfBirth,
        industry,
        occupation,
        isSouthAfrican,
        selectedPackage,
        bankName,
        accountType,
        accountNumber,
        hasCreditCard
      };

      if (password) {
        const hashedPassword = await crypto.hash(password);
        updates.password = hashedPassword;
      }

      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, req.user.id))
        .returning()
        .execute();

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ 
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  });
  app.get("/api/user", (req, res) => {
    console.log('User request:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
      session: req.session
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get complete user details from database
    db.execute(
      `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone_number,
        u.is_admin,
        u.is_super_admin,
        u.is_enabled,
        u.points,
        u.referral_code,
        u.referred_by,
        u.created_at,
        u.is_south_african,
        u.id_number,
        u.date_of_birth,
        u.address,
        u.city,
        u.postal_code,
        u.industry,
        u.occupation,
        u.bank_name,
        u.account_type,
        u.account_number,
        u.account_holder_name,
        u.branch_code,
        u.selected_package,
        u.gender,
        u.has_credit_card,
        u.signature
      FROM users u
      WHERE u.id = ?`,
      [req.user.id]
    )
    .then(([users]) => {
      if (users && users.length > 0) {
        const user = users[0];
        // Format dates properly
        if (user.created_at) {
          user.created_at = new Date(user.created_at).toISOString();
        }
        if (user.date_of_birth) {
          user.date_of_birth = new Date(user.date_of_birth).toISOString().split('T')[0];
        }
        res.json(user);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    })
    .catch(error => {
      console.error('Error fetching user details:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
    });
  });

  app.post("/api/admin/products/assign", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    try {
      const connection = await createConnection();
      try {
        const { userId, productId, type } = req.body;

        // First get the product activity points value
        const [activities] = await connection.execute(
          `SELECT points_value 
           FROM product_activities 
           WHERE product_id = ? AND type = ?`,
          [productId, type]
        );

        if (!activities || activities.length === 0) {
          return res.status(404).json({ error: "Product activity not found" });
        }

        const pointsValue = activities[0].points_value;

        // Begin transaction
        await connection.beginTransaction();

        // Create product assignment
        const [result] = await connection.execute(
          `INSERT INTO product_assignments (user_id, product_id, type, points_value) 
           VALUES (?, ?, ?, ?)`,
          [userId, productId, type, pointsValue]
        );

        // Create points transaction
        await connection.execute(
          `INSERT INTO transactions (user_id, points, type, description) 
           VALUES (?, ?, ?, ?)`,
          [
            userId, 
            pointsValue,
            'EARNED',
            `Points earned for product activation`
          ]
        );

        // Update user points
        await connection.execute(
          `UPDATE users 
           SET points = points + ? 
           WHERE id = ?`,
          [pointsValue, userId]
        );

        await connection.commit();

        await logAdminAction({
          adminId: req.user.id,
          actionType: "PRODUCT_ASSIGNED",
          details: `Assigned product (ID: ${productId}) to user (ID: ${userId})`
        });

        // Get updated assignment with product details
        const [assignment] = await connection.execute(
          `SELECT pa.*, p.name as product_name
           FROM product_assignments pa
           JOIN products p ON pa.product_id = p.id
           WHERE pa.id = ?`,
          [result.insertId]
        );

        res.json(assignment[0]);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Error assigning product:', error);
      res.status(500).json({ error: 'Failed to assign product' });
    }
  });

  // Add new route for admin dashboard stats
  app.get("/api/admin/dashboard/stats", async (req, res) => {
    console.log('Admin dashboard stats request:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        is_admin: req.user.is_admin,
        is_super_admin: req.user.is_super_admin
      } : null
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        console.log('User not found in admin_users:', req.user.id);
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get total customers (non-admin users)
      const [customerCount] = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM users u 
         LEFT JOIN admin_users au ON u.id = au.user_id 
         WHERE au.user_id IS NULL`
      );

      // Get total points in circulation
      const [pointsTotal] = await connection.execute(
        'SELECT COALESCE(SUM(points), 0) as total FROM users'
      );

      // Get active rewards count
      const [rewardsCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM rewards WHERE available = 1'
      );

      // Get total redemptions
      const [redemptionsCount] = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM transactions 
         WHERE type = 'REDEEMED'`
      );

      // Get recent transactions for charts
      const [transactions] = await connection.execute(
        `SELECT 
          t.*,
          u.first_name,
          u.last_name,
          u.email
         FROM transactions t
         JOIN users u ON t.user_id = u.id
         ORDER BY t.created_at DESC
         LIMIT 50`
      );

      // Transform transaction data for frontend
      const transformedTransactions = transactions.map((t: any) => ({
        date: new Date(t.created_at).toLocaleDateString(),
        points: Math.abs(Number(t.points)),
        type: t.type,
        user: {
          firstName: t.first_name,
          lastName: t.last_name,
          email: t.email
        }
      }));

      const response = {
        totalCustomers: Number(customerCount[0].count),
        totalPoints: Number(pointsTotal[0].total),
        activeRewards: Number(rewardsCount[0].count),
        totalRedemptions: Number(redemptionsCount[0].count),
        recentTransactions: transformedTransactions
      };

      console.log('Sending dashboard stats:', response);
      res.json(response);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    } finally {
      await connection.end();
    }
  });

  return httpServer;
}