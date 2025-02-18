import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, authCrypto } from "./auth";
import { db } from "@db";
import { rewards, transactions, users, products, productAssignments, product_activities, adminLogs, referralStats } from "@db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { logAdminAction, getAdminLogs } from "./admin-logger";
import { sendEmail, formatPointsAssignmentEmail, formatAdminNotificationEmail } from "./utils/emailService";
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { Readable } from 'stream';

// Global notifications queue with timestamp-based cleanup
const notificationsQueue = new Map<number, Array<{
  type: string;
  userId: number;
  points: number;
  description: string;
  timestamp: string;
}>>();

// Configuration for polling
const POLLING_CONFIG = {
  maxQueueSize: 100, // Maximum notifications per user
  retentionPeriod: 5 * 60 * 1000, // 5 minutes retention for notifications
  cleanupInterval: 60 * 1000 // Cleanup every minute
};

// Cleanup old notifications periodically
setInterval(() => {
  const cutoffTime = new Date(Date.now() - POLLING_CONFIG.retentionPeriod);
  for (const [userId, notifications] of notificationsQueue.entries()) {
    const validNotifications = notifications.filter(
      n => new Date(n.timestamp) > cutoffTime
    );
    if (validNotifications.length === 0) {
      notificationsQueue.delete(userId);
    } else {
      notificationsQueue.set(userId, validNotifications);
    }
  }
}, POLLING_CONFIG.cleanupInterval);

// Helper function to add notification
function addNotification(notification: {
  type: string;
  userId: number;
  points: number;
  description: string;
}) {
  const userNotifications = notificationsQueue.get(notification.userId) || [];
  const newNotification = {
    ...notification,
    timestamp: new Date().toISOString()
  };

  console.log('Adding notification:', newNotification); // Debug log

  // Add to queue, maintain max size
  userNotifications.push(newNotification);
  if (userNotifications.length > POLLING_CONFIG.maxQueueSize) {
    userNotifications.shift(); // Remove oldest
  }

  notificationsQueue.set(notification.userId, userNotifications);
}

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
};

export function registerRoutes(app: Express): Server {
  setupAuth(app);
  const httpServer = createServer(app);

  // New endpoint for polling notifications
  app.get("/api/notifications/poll", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");

    const userNotifications = notificationsQueue.get(req.user.id) || [];
    // Clear notifications after sending
    if (userNotifications.length > 0) {
      notificationsQueue.set(req.user.id, []);
      console.log('Sending notifications:', userNotifications); // Debug log
    }

    res.json(userNotifications);
  });

  // Add new endpoint to fetch admin logs
  app.get("/api/admin/logs", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
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
      res.status(500).send('Failed to fetch admin logs');
    }
  });

  // Modify points allocation to include email notifications
  app.post("/api/admin/points", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const { userId, points, description } = req.body;

    try {
      const result = await db.transaction(async (tx) => {
        // Get the target user's details
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
          .limit(1);

        if (!targetUser) {
          throw new Error("User not found");
        }

        // Get the admin's details
        const [admin] = await tx
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
          })
          .from(users)
          .where(eq(users.id, req.user.id))
          .limit(1);

        await tx.insert(transactions).values({
          userId,
          points,
          type: "ADMIN_ADJUSTMENT",
          description,
        });

        const [updatedUser] = await tx
          .update(users)
          .set({
            points: sql`${users.points} + ${points}`,
          })
          .where(eq(users.id, userId))
          .returning();

        // Get the user's tier after points update
        const tierPoints = updatedUser.points;
        let currentTier = "Bronze";
        if (tierPoints >= 150000) currentTier = "Platinum";
        else if (tierPoints >= 100000) currentTier = "Gold";
        else if (tierPoints >= 50000) currentTier = "Purple";
        else if (tierPoints >= 10000) currentTier = "Silver";

        // Send email to customer
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

        // Send email to admin
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
      res.status(500).send('Failed to adjust points');
    }
  });

  // Admin Management Routes
  app.post("/api/admin/users/create", async (req, res) => {
    if (!req.user?.isSuperAdmin) return res.status(403).send("Only super admins can create new admins");
    const { email, password, firstName, lastName, phoneNumber } = req.body;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return res.status(400).send("Email already exists");
    }

    try {
      const hashedPassword = await authCrypto.hashPassword(password);
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phoneNumber,
          isAdmin: true,
          isSuperAdmin: false,
          isEnabled: true,
          points: 0,
        })
        .returning();

      // Log admin creation
      await logAdminAction({
        adminId: req.user.id,
        actionType: "ADMIN_CREATED",
        targetUserId: newUser.id,
        details: `Created new admin user: ${email}`,
      });

      res.json(newUser);
    } catch (error) {
      console.error('Error creating admin user:', error);
      res.status(500).send('Failed to create admin user');
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
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
        .returning();

      if (!user) {
        return res.status(404).send("User not found");
      }

      // Log the user update
      await logAdminAction({
        adminId: req.user.id,
        actionType: "ADMIN_UPDATED",
        targetUserId: user.id,
        details: `Updated admin user: ${user.email}`,
      });

      res.json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).send('Failed to update user');
    }
  });

  app.post("/api/admin/users/:id/toggle-status", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const { id } = req.params;
    const { enabled } = req.body;

    try {
      const [user] = await db
        .update(users)
        .set({ isEnabled: enabled })
        .where(eq(users.id, parseInt(id)))
        .returning();

      if (!user) {
        return res.status(404).send("User not found");
      }

      // Log the status change using a valid action type
      await logAdminAction({
        adminId: req.user.id,
        actionType: "ADMIN_REMOVED", // Using ADMIN_REMOVED as it's the closest valid action type
        targetUserId: user.id,
        details: `${enabled ? 'Enabled' : 'Disabled'} admin user: ${user.email}`,
      });

      res.json(user);
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).send('Failed to toggle user status');
    }
  });

  // Updated admin removal logic to handle foreign key constraints
  app.post("/api/admin/users/toggle-admin", async (req, res) => {
    if (!req.user?.isSuperAdmin) return res.status(403).send("Unauthorized");
    const { userId, isAdmin } = req.body;

    if (userId === req.user.id) {
      return res.status(400).send("Cannot change your own admin status");
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (targetUser?.isSuperAdmin) {
      return res.status(400).send("Cannot modify super admin status");
    }

    try {
      if (!isAdmin) {
        // Instead of deleting, we'll update the user to remove admin status and disable the account
        const [updatedUser] = await db
          .update(users)
          .set({
            isAdmin: false,
            isEnabled: false
          })
          .where(eq(users.id, userId))
          .returning();

        // Log admin removal
        await logAdminAction({
          adminId: req.user.id,
          actionType: "ADMIN_REMOVED",
          targetUserId: userId,
          details: `Removed admin user: ${targetUser.email}`,
        });

        res.json({ message: "Admin user removed successfully" });
      } else {
        // If adding admin status, update the user
        const [updatedUser] = await db
          .update(users)
          .set({ isAdmin })
          .where(eq(users.id, userId))
          .returning();

        // Log admin updated
        await logAdminAction({
          adminId: req.user.id,
          actionType: "ADMIN_ENABLED",
          targetUserId: userId,
          details: `${isAdmin ? 'Enabled' : 'Disabled'} admin user: ${targetUser.email}`,
        });

        res.json(updatedUser);
      }
    } catch (error) {
      console.error('Error modifying admin status:', error);
      res.status(500).send('Failed to modify admin status');
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const allUsers = await db.query.users.findMany({
      where: eq(users.isAdmin, true),
      orderBy: desc(users.createdAt),
    });
    res.json(allUsers);
  });

  // Add the customers endpoint right after the admin users endpoint
  app.get("/api/admin/customers", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const customers = await db.query.users.findMany({
      where: eq(users.isAdmin, false),
      orderBy: desc(users.createdAt),
      with: {
        transactions: true,
        productAssignments: {
          with: {
            product: {
              with: {
                activities: {
                  columns: {
                    id: true,
                    type: true,
                    pointsValue: true
                  }
                }
              }
            },
          },
        },
      },
    });
    res.json(customers);
  });

  // Add customer deletion endpoint
  app.delete("/api/admin/customers/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const { id } = req.params;
    const userId = parseInt(id);

    try {
      // Get customer details before deletion for logging
      const [customer] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          isAdmin: users.isAdmin,
          referral_code: users.referral_code
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!customer) {
        return res.status(404).send("Customer not found");
      }

      // Prevent deletion of admin users through this endpoint
      if (customer.isAdmin) {
        return res.status(403).send("Cannot delete admin users through this endpoint");
      }

      // Begin transaction to handle the deletion and related records
      await db.transaction(async (tx) => {
        // Delete admin logs first
        await tx
          .delete(adminLogs)
          .where(eq(adminLogs.targetUserId, userId));

        // Delete product assignments
        await tx
          .delete(productAssignments)
          .where(eq(productAssignments.userId, userId));

        // Delete transactions
        await tx
          .delete(transactions)
          .where(eq(transactions.userId, userId));

        // Delete referral stats
        await tx
          .delete(referralStats)
          .where(eq(referralStats.userId, userId));

        // Update referred_by to null for any users this customer referred
        await tx
          .update(users)
          .set({ referred_by: null })
          .where(eq(users.referred_by, customer.referral_code));

        // Finally delete the user
        await tx
          .delete(users)
          .where(eq(users.id, userId));

        // Log the customer deletion
        await logAdminAction({
          adminId: req.user.id,
          actionType: "ADMIN_REMOVED", // Changed to use a valid enum value
          targetUserId: userId,
          details: `Deleted customer: ${customer.email} (${customer.firstName} ${customer.lastName})`,
        });
      });

      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).send('Failed to delete customer');
    }
  });


  // Export customers to CSV
  app.get("/api/admin/customers/export", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");

    try {
      const customers = await db.query.users.findMany({
        where: eq(users.isAdmin, false),
        orderBy: desc(users.createdAt),
        with: {
          productAssignments: {
            with: {
              product: true
            }
          }
        }
      });

      const csvData = customers.map(customer => ({
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phoneNumber: customer.phoneNumber,
        points: customer.points,
        isEnabled: customer.isEnabled,
        createdAt: customer.createdAt,
        assignedProducts: customer.productAssignments
          ?.map(assignment => assignment.product.name)
          .join(", ") || "None"
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');

      stringify(csvData, {
        header: true,
        columns: [
          'email',
          'firstName',
          'lastName',
          'phoneNumber',
          'points',
          'isEnabled',
          'createdAt',
          'assignedProducts'
        ]
      }, (err, output) => {
        if (err) throw err;
        res.send(output);
      });
    } catch (error) {
      console.error('Error exporting customers:', error);
      res.status(500).send('Failed to export customers');
    }
  });

  // Import customers from CSV
  app.post("/api/admin/customers/import", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");

    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const file = req.files.file;
      const csvData = file.data.toString();

      const records = await new Promise((resolve, reject) => {
        parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }, (err, records) => {
          if (err) reject(err);
          else resolve(records);
        });
      });

      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const record of records) {
        try {
          const hashedPassword = await authCrypto.hashPassword('ChangeMe123!'); // Use authCrypto instead of crypto

          // Check if user already exists
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, record.email))
            .limit(1);

          if (existingUser) {
            results.failed++;
            results.errors.push(`User with email ${record.email} already exists`);
            continue;
          }

          // Create new user
          await db.insert(users).values({
            email: record.email,
            password: hashedPassword,
            firstName: record.firstName,
            lastName: record.lastName,
            phoneNumber: record.phoneNumber || '',
            isAdmin: false,
            isSuperAdmin: false,
            isEnabled: true,
            points: parseInt(record.points) || 0,
          });

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to import user ${record.email}: ${error.message}`);
        }
      }

      // Log the import action
      await logAdminAction({
        adminId: req.user.id,
        actionType: "ADMIN_CREATED",
        details: `Imported ${results.success} customers (${results.failed} failed)`,
      });

      res.json(results);
    } catch (error) {
      console.error('Error importing customers:', error);
      res.status(500).json({
        error: 'Failed to import customers',
        details: error.message
      });
    }
  });

  // Product Management Routes
  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db.query.products.findMany({
        with: {
          activities: {
            columns: {
              id: true,
              productId: true,
              type: true,
              pointsValue: true
            }
          }
        },
        orderBy: desc(products.createdAt),
      });
      res.json(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).send('Failed to fetch products');
    }
  });

  app.post("/api/products", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");

    try {
      const { name, description, activities } = req.body;

      const result = await db.transaction(async (tx) => {
        // Create the product first
        const [product] = await tx
          .insert(products)
          .values({
            name,
            description,
            isEnabled: true,
          })
          .returning();

        // Then create all activities for this product
        if (activities && Array.isArray(activities)) {
          await Promise.all(
            activities.map((activity) =>
              tx.insert(product_activities).values({
                productId: product.id,
                type: activity.type,
                pointsValue: activity.pointsValue,
              })
            )
          );
        }

        return product;
      });

      // Log the product creation
      await logAdminAction({
        adminId: req.user.id,
        actionType: "PRODUCT_CREATED",
        details: `Created new product: ${result.name}`,
      });

      // Fetch the complete product with activities
      const completeProduct = await db.query.products.findFirst({
        where: eq(products.id, result.id),
        with: {
          activities: {
            columns: {
              id: true,
              productId: true,
              type: true,
              pointsValue: true
            }
          }
        },
      });

      res.json(completeProduct);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).send('Failed to create product');
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const { id } = req.params;
    const { name, description, activities } = req.body;

    try {
      const result = await db.transaction(async (tx) => {
        // Update the product
        const [product] = await tx
          .update(products)
          .set({
            name,
            description,
          })
          .where(eq(products.id, parseInt(id)))
          .returning();

        // Delete existing activities
        await tx
          .delete(product_activities)
          .where(eq(product_activities.productId, parseInt(id)));

        // Create new activities
        const activityPromises = activities.map(async (activity: any) => {
          return tx.insert(product_activities).values({
            productId: parseInt(id),
            type: activity.type,
            pointsValue: activity.pointsValue,
          });
        });

        await Promise.all(activityPromises);

        return product;
      });

      // Log the product update
      await logAdminAction({
        adminId: req.user.id,
        actionType: "PRODUCT_UPDATED",
        details: `Updated product: ${result.name}`,
      });

      // Fetch the complete product with activities
      const completeProduct = await db.query.products.findFirst({
        where: eq(products.id, parseInt(id)),
        with: {
          activities: true,
        },
      });

      res.json(completeProduct);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).send('Failed to update product');
    }
  });

  app.post("/api/products/:id/toggle-status", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const { id } = req.params;
    const { enabled } = req.body;

    try {
      const [product] = await db
        .update(products)
        .set({ isEnabled: enabled })
        .where(eq(products.id, parseInt(id)))
        .returning();

      if (!product) {
        return res.status(404).send("Product not found");
      }

      // Log the status change
      await logAdminAction({
        adminId: req.user.id,
        actionType: enabled ? "PRODUCT_CREATED" : "PRODUCT_DELETED",
        details: `${enabled ? 'Enabled' : 'Disabled'} product: ${product.name}`,
      });

      res.json(product);
    } catch (error) {
      console.error('Error toggling product status:', error);
      res.status(500).send('Failed to toggle product status');
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const { id } = req.params;

    try {
      const [product] = await db
        .delete(products)
        .where(eq(products.id, parseInt(id)))
        .returning();

      if (!product) {
        return res.status(404).send("Product not found");
      }

      // Log the product deletion
      await logAdminAction({
        adminId: req.user.id,
        actionType: "PRODUCT_DELETED",
        details: `Deleted product: ${product.name}`,
      });

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).send('Failed to delete product');
    }
  });

  app.post("/api/products/:id/assign", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const { id } = req.params;
    const { userId } = req.body;

    try {
      // Check if assignment already exists
      const existingAssignment = await db.query.productAssignments.findFirst({
        where: sql`${productAssignments.userId} = ${userId} AND ${productAssignments.productId} = ${parseInt(id)}`,
      });

      if (existingAssignment) {
        return res.status(400).json({ error: "Customer is already assigned to this product" });
      }

      const [assignment] = await db
        .insert(productAssignments)
        .values({
          userId,
          productId: parseInt(id),
        })
        .returning();

      // Log the product assignment
      await logAdminAction({
        adminId: req.user.id,
        actionType: "PRODUCT_ASSIGNED",
        targetUserId: userId,
        details: `Assigned product ID ${id} to user ID ${userId}`,
      });

      res.json(assignment);
    } catch (error) {
      console.error('Error assigning product:', error);
      res.status(500).send('Failed to assign product');
    }
  });

  app.post("/api/products/:id/unassign", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const { id } = req.params;
    const { userId } = req.body;

    try {
      const [deletedAssignment] = await db
        .delete(productAssignments)
        .where(sql`${productAssignments.userId} = ${userId} AND ${productAssignments.productId} = ${parseInt(id)}`)
        .returning();

      if (!deletedAssignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // Log the product unassignment
      await logAdminAction({
        adminId: req.user.id,
        actionType: "PRODUCT_UNASSIGNED",
        targetUserId: userId,
        details: `Unassigned product ID ${id} from user ID ${userId}`,
      });

      res.json({ message: "Product unassigned successfully" });
    } catch (error) {
      console.error('Error unassigning product:', error);
      res.status(500).send('Failed to unassign product');
    }
  });


  app.get("/api/products/assignments/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized")
    const { id } = req.params;

    try {
      const assignment = await db.query.productAssignments.findFirst({
        where: eq(productAssignments.id, parseInt(id)),
        with: {
          product: true,
          user: true,
        }
      })
      if (!assignment) {
        return res.status(404).send("Assignment not found")
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).send("Failed to fetch assignment");
    }
  })


  app.delete("/api/products/assignments/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const { id } = req.params;

    try {
      const [assignment] = await db
        .delete(productAssignments)
        .where(eq(productAssignments.id, parseInt(id)))
        .returning();

      if (!assignment) {
        return res.status(404).send("Assignment not found");
      }

      // Log the product unassignment
      await logAdminAction({
        adminId: req.user.id,
        actionType: "PRODUCT_UNASSIGNED",
        targetUserId: assignment.userId,
        details: `Unassigned product ID ${assignment.productId} from user ID ${assignment.userId}`,
      });

      res.json({ message: "Product assignment removed successfully" });
    } catch (error) {
      console.error('Error removing product assignment:', error);
      res.status(500).send('Failed to remove product assignment');
    }
  });

  // Customer Routes
  app.get("/api/customer/points", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id),
    });
    res.json(user);
  });

  app.get("/api/customer/transactions", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const userTransactions = await db.query.transactions.findMany({
      where: eq(transactions.userId, req.user.id),
      orderBy: desc(transactions.createdAt),
      with: {
        reward: true,
      },
    });
    res.json(userTransactions);
  });

  // Add the new customer referralendpoint
  app.get("/api/customer/referral", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");

    try {
      // Get the current user with their referral code
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user) {
        return res.status(404).send("User not found");
      }

      // If user doesn't have a referral code, generate one
      let currentReferralCode = user.referral_code;
      if (!currentReferralCode) {
        currentReferralCode = randomBytes(8).toString("hex");
        await db
          .update(users)
          .set({ referral_code: currentReferralCode })
          .where(eq(users.id, req.user.id));
      }

      // Get all users who used this user's referral code
      const referrals = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.referred_by, currentReferralCode))
        .orderBy(desc(users.createdAt));

      res.json({
        referralCode: currentReferralCode,
        referralCount: referrals.length,
        referrals,
      });
    } catch (error) {
      console.error('Error fetching referral info:', error);
      res.status(500).send('Failed to fetch referral information');
    }
  });

  // Update the query in the /api/customer/referrals endpoint
  app.get("/api/customer/referrals", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");

    try {
      console.log("Fetching referral stats for user:", req.user.id);

      // Get the user's referral code and direct referrals
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!currentUser) {
        return res.status(404).send("User not found");
      }

      // Get level 1 referrals (direct referrals)
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
        .where(eq(users.referred_by, currentUser.referral_code));

      // Get level 2 referrals count
      const level2Count = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          inArray(
            users.referred_by,
            level1Referrals.map(r => r.referral_code)
          )
        );

      // Get level 3 referrals count
      const level2Referrals = await db
        .select({ referral_code: users.referral_code })
        .from(users)
        .where(
          inArray(
            users.referred_by,
            level1Referrals.map(r => r.referral_code)
          )
        );

      const level3Count = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          inArray(
            users.referred_by,
            level2Referrals.map(r => r.referral_code)
          )
        );

      // Get referral counts for each level 1 referral
      const referralsWithCounts = await Promise.all(
        level1Referrals.map(async (referral) => {
          const referralCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.referred_by, referral.referral_code));

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
      res.status(500).send("Failed to fetch referral stats");
    }
  });

  // Shared Routes
  app.get("/api/rewards", async (req, res) => {
    const allRewards = await db.query.rewards.findMany({
      where: eq(rewards.available, true),
    });
    res.json(allRewards);
  });

  app.post("/api/rewards", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    try {
      const [reward] = await db.insert(rewards).values({
        ...req.body,
        available: true,
      }).returning();

      // Log both the reward creation and the points cost setting
      await logAdminAction({
        adminId: req.user.id,
        actionType: "REWARD_CREATED",
        details: `Created new ${req.body.type === 'CASH' ? 'cash redemption' : ''} reward: ${reward.name} (Cost: ${reward.pointsCost} points${req.body.type === 'CASH' ? `, R${(reward.pointsCost * 0.015).toFixed(2)}` : ''})`,
      });

      res.json(reward);
    } catch (error) {
      console.error('Error creating reward:', error);
      res.status(500).send('Failed to create reward');
    }
  });

  app.put("/api/rewards/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
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
        .returning();

      if (!reward) {
        return res.status(404).send("Reward not found");
      }

      // Log the reward update
      await logAdminAction({
        adminId: req.user.id,
        actionType: "REWARD_UPDATED",
        details: `Updated reward: ${reward.name} (New Cost: ${reward.pointsCost} points)`,
      });

      res.json(reward);
    } catch (error) {
      console.error('Error updating reward:', error);
      res.status(500).send('Failed to update reward');
    }
  });

  app.delete("/api/rewards/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
    const { id } = req.params;

    try {
      const [reward] = await db
        .select()
        .from(rewards)
        .where(eq(rewards.id, parseInt(id)))
        .limit(1);

      if (!reward) {
        return res.status(404).send("Reward not found");
      }

      await db
        .update(rewards)
        .set({ available: false })
        .where(eq(rewards.id, parseInt(id)));

      // Log the reward deletion
      await logAdminAction({
        adminId: req.user.id,
        actionType: "REWARD_DELETED",
        details: `Deleted reward: ${reward.name}`,
      });

      res.json({ message: "Reward deleted successfully" });
    } catch (error) {
      console.error('Error deleting reward:', error);
      res.status(500).send('Failed to delete reward');
    }
  });

  app.post("/api/rewards/redeem", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const { rewardId } = req.body;

    const reward = await db.query.rewards.findFirst({
      where: eq(rewards.id, rewardId),
    });

    if (!reward) return res.status(404).send("Reward not found");

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id),
    });

    if (!user || user.points < reward.pointsCost) {
      return res.status(400).send("Insufficient points");
    }

    try {
      await db.transaction(async (tx) => {
        // Create the transaction record
        await tx.insert(transactions).values({
          userId: user.id,
          points: -reward.pointsCost,
          type: reward.type === "CASH" ? "CASH_REDEMPTION" : "REDEEMED",
          description: reward.type === "CASH"
            ? `Redeemed points for R${(reward.pointsCost * 0.015).toFixed(2)}`
            : `Redeemed ${reward.name}`,
          rewardId,
        });

        // Update user points
        await tx
          .update(users)
          .set({ points: user.points - reward.pointsCost })
          .where(eq(users.id, user.id));

        // Log the point adjustment
        await logAdminAction({
          adminId: user.id,
          actionType: "POINT_ADJUSTMENT",
          targetUserId: user.id,
          details: reward.type === "CASH"
            ? `Points deducted (-${reward.pointsCost}) for cash redemption of R${(reward.pointsCost * 0.015).toFixed(2)}`
            : `Points deducted (-${reward.pointsCost}) for redeeming reward: ${reward.name}`,
        });
      });

      // Return success message
      res.json({
        success: true,
        message: reward.type === "CASH"
          ? `Successfully redeemed R${(reward.pointsCost * 0.015).toFixed(2)}`
          : `Successfully redeemed ${reward.name}`
      });
    } catch (error) {
      console.error('Error processing reward redemption:', error);
      res.status(500).send('Failed to process reward redemption');
    }
  });

  // Update the cash redemption route
  app.post("/api/rewards/redeem-cash", async (req, res) => {
    if (!req.user) return res.status(401).send("Unauthorized");
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).send("Invalid points amount");
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
      });

      if (!user || user.points < points) {
        return res.status(400).send("Insufficient points");
      }

      await db.transaction(async (tx) => {
        // Create the transaction record
        const [transaction] = await tx.insert(transactions).values({
          userId: user.id,
          points: -points,
          type: "CASH_REDEMPTION",
          description: `Redeemed points for R${(points * 0.015).toFixed(2)}`,
          status: "PENDING",
          createdAt: new Date(),
        }).returning();

        // Update user points
        await tx
          .update(users)
          .set({
            points: sql`${users.points} - ${points}`
          })
          .where(eq(users.id, user.id));

        // Add notification for admins
        addNotification({
          type: "CASH_REDEMPTION",
          userId: req.user.id,
          points: points,
          description: `${user.firstName} ${user.lastName} redeemed ${points} points for R${(points * 0.015).toFixed(2)}`
        });
      });

      res.json({
        success: true,
        message: `Successfully redeemed R${(points * 0.015).toFixed(2)}`
      });
    } catch (error) {
      console.error('Error processing cash redemption:', error);
      res.status(500).send('Failed to process cash redemption');
    }
  });

  // Update the cash redemptions endpoint to properly filter and include user details
  app.get("/api/admin/cash-redemptions", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");

    try {
      const cashRedemptions = await db.query.transactions.findMany({
        where: eq(transactions.type, "CASH_REDEMPTION"),
        orderBy: [desc(transactions.createdAt)],
        with: {
          user: {
            columns: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      res.json(cashRedemptions);
    } catch (error) {
      console.error('Error fetching cash redemptions:', error);
      res.status(500).send('Failed to fetch cash redemptions');
    }
  });

  // Add endpoint to mark cash redemption as processed
  app.post("/api/admin/cash-redemptions/:id/process", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).send("Unauthorized");
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
        .returning();

      if (!transaction) {
        return res.status(404).send("Transaction not found");
      }

      // Log the cash redemption processing
      await logAdminAction({
        adminId: req.user.id,
        actionType: "POINT_ADJUSTMENT",
        targetUserId: transaction.userId,
        details: `Processed cash redemption of R${(Math.abs(transaction.points) * 0.015).toFixed(2)} (${Math.abs(transaction.points)} points)`,
      });

      res.json(transaction);
    } catch (error) {
      console.error('Error processing cash redemption:', error);
      res.status(500).send('Failed to process cash redemption');
    }
  });

  // Add after the /api/login endpoint and before /api/logout
  app.post("/api/reset-password", async (req, res) => {
    const { email } = req.body;

    try {
      // Find user with the provided email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user) {
        // Generate a reset token that expires in 1 hour
        const resetToken = randomBytes(32).toString("hex");
        const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Update user with reset token
        await db
          .update(users)
          .set({
            resetToken,
            resetTokenExpiry: tokenExpiry,
          })
          .where(eq(users.id, user.id));

        // Log reset token info with clear visibility
        console.log('\n');
        console.log('🔑 PASSWORD RESET REQUEST 🔑');
        console.log('=============================');
        console.log('Email:', email);
        console.log('Reset Token:', resetToken);
        console.log('Token Expiry:', tokenExpiry);
        console.log('=============================');

        // Create and log reset link
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

      // Always return success to prevent email enumeration
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
      // Find user with the valid reset token
      const [user] = await db
        .select()
        .from(users)
        .where(
          sql`${users.resetToken} = ${token} AND ${users.resetTokenExpiry} > NOW()`
        )
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash the new password
      const hashedPassword = await authCrypto.hashPassword(newPassword);

      // Update user's password and clear reset token
      await db
        .update(users)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error('Error in password reset:', error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  return httpServer;
}