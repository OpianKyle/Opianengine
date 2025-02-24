import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./websocket";
import { db } from "@db";
import { rewards, transactions, users, products, productAssignments, product_activities, adminLogs, quoteRequests, notifications } from "@db/schema";
import { eq, desc, sql, inArray, and } from "drizzle-orm";
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

      // Get the user's referral data
      const [referralInfo] = await db
        .select({
          referralCode: users.referralCode,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!referralInfo) {
        console.error('User not found:', req.user.id);
        return res.status(404).json({ error: "User not found" });
      }

      if (!referralInfo.referralCode) {
        // Generate a new referral code if one doesn't exist
        const newReferralCode = `REF${req.user.id}${Date.now().toString(36)}`;
        await db
          .update(users)
          .set({ referralCode: newReferralCode })
          .where(eq(users.id, req.user.id));

        referralInfo.referralCode = newReferralCode;
      }

      console.log('Found referral code:', referralInfo.referralCode);

      // Get users who were referred by this user
      const referrals = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.referredBy, referralInfo.referralCode))
        .orderBy(desc(users.createdAt));

      console.log('Found referrals count:', referrals.length);

      res.json({
        referralCode: referralInfo.referralCode,
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
          .limit(1);

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

        const tierPoints = updatedUser.points;
        let currentTier = "Bronze";
        if (tierPoints >= 150000) currentTier = "Platinum";
        else if (tierPoints >= 100000) currentTier = "Gold";
        else if (tierPoints >= 50000) currentTier = "Purple";
        else if (tierPoints >= 10000) currentTier = "Silver";

        wsServer.broadcastToUser(userId, {
          type: "POINTS_ALLOCATION",
          points,
          description,
          timestamp: new Date().toISOString()
        });

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
    if (!req.user?.isSuperAdmin) return res.status(403).json({error: "Only super admins can create new admins"});
    const { email, password, firstName, lastName, phoneNumber } = req.body;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
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

      await logAdminAction({
        adminId: req.user.id,
        actionType: "ADMIN_CREATED",
        targetUserId: newUser.id,
        details: `Created new admin user: ${email}`,
      });

      res.json(newUser);
    } catch (error) {
      console.error('Error creating admin user:', error);
      res.status(500).json({ error: 'Failed to create admin user' });
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
        .returning();

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
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;

    try {
      // Convert selectedPackage to uppercase before update
      const updateData = {
        ...req.body,
        selectedPackage: req.body.selectedPackage ? String(req.body.selectedPackage).toUpperCase() : null
      };

      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, parseInt(id)))
        .returning();

      if (!result || result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      await logAdminAction({
        adminId: req.user.id,
        actionType: "ADMIN_CREATED", // Changed to match enum
        targetUserId: parseInt(id),
        details: `Updated user details for ID ${id}`,
      });

      res.json(result[0]);
    } catch (error) {
      console.error('Error updating user details:', error);

      // Better error handling with specific messages
      let errorMessage = 'Failed to update user details';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      res.status(500).json({ 
        error: 'Failed to update user details',
        message: errorMessage
      });
    }
  });

  app.post("/api/admin/users/:id/toggle-status", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;
    const { enabled } = req.body;

    try {
      const [user] = await db
        .update(users)
        .set({ isEnabled: enabled })
        .where(eq(users.id, parseInt(id)))
        .returning();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await logAdminAction({
        adminId: req.user.id,
        actionType: "ADMIN_REMOVED", 
        targetUserId: user.id,
        details: `${enabled ? 'Enabled' : 'Disabled'} admin user: ${user.email}`,
      });

      res.json(user);
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({ error: 'Failed to toggle user status' });
    }
  });

  app.post("/api/admin/users/toggle-admin", async (req, res) => {
    if (!req.user?.isSuperAdmin) return res.status(403).json({error: "Unauthorized"});
    const { userId, isAdmin } = req.body;

    if (userId === req.user.id) {
      return res.status(400).json({ error: "Cannot change your own admin status" });
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (targetUser?.isSuperAdmin) {
      return res.status(400).json({ error: "Cannot modify super admin status" });
    }

    try {
      if (!isAdmin) {
        const [updatedUser] = await db
          .update(users)
          .set({
            isAdmin: false,
            isEnabled: false
          })
          .where(eq(users.id, userId))
          .returning();

        await logAdminAction({
          adminId: req.user.id,
          actionType: "ADMIN_REMOVED",
          targetUserId: userId,
          details: `Removed admin user: ${targetUser.email}`,
        });

        res.json({ message: "Admin user removed successfully" });
      } else {
        const [updatedUser] = await db
          .update(users)
          .set({ isAdmin })
          .where(eq(users.id, userId))
          .returning();

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
      res.status(500).json({ error: 'Failed to modify admin status' });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const allUsers = await db.query.users.findMany({
      where: eq(users.isAdmin, true),
      orderBy: desc(users.createdAt),
    });
    res.json(allUsers);
  });

  app.get("/api/admin/customers", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    try {
      console.log('Fetching customers with all fields...');
      const customers = await db.query.users.findMany({
        where: eq(users.isAdmin, false),
        orderBy: desc(users.createdAt),
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          isEnabled: true,
          points: true,
          createdAt: true,
          selectedPackage: true,  // Ensure this field is included
          industry: true,
          occupation: true,
          bankName: true,
          accountType: true,
          accountNumber: true,
          accountHolderName: true,
          branchCode: true,
          address: true,
          city: true,
          postalCode: true,
          idNumber: true,
          dateOfBirth: true,
        },
        with: {
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
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  app.delete("/api/admin/customers/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;
    const userId = parseInt(id);

    try {
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
        return res.status(404).json({ error: "Customer not found" });
      }

      if (customer.isAdmin) {
        return res.status(403).json({ error: "Cannot delete admin users through this endpoint" });
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(adminLogs)
          .where(eq(adminLogs.targetUserId, userId));

        await tx
          .delete(productAssignments)
          .where(eq(productAssignments.userId, userId));

        await tx
          .delete(transactions)
          .where(eq(transactions.userId, userId));

        await tx
          .update(users)
          .set({ referred_by: null })
          .where(eq(users.referred_by, customer.referral_code));

        await tx
          .delete(users)
          .where(eq(users.id, userId));

        await logAdminAction({
          adminId: req.user.id, 
          actionType: "ADMIN_REMOVED", 
          targetUserId: userId,
          details: `Deleted customer: ${customer.email} (${customer.firstName} ${customer.lastName})`,
        });
      });

      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  });


  app.get("/api/admin/customers/export", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});

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
      res.status(500).json({ error: 'Failed to export customers' });
    }
  });

  app.post("/api/admin/customers/import", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});

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
          const hashedPassword = await authCrypto.hashPassword('ChangeMe123!'); 

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
      res.status(500).json({ error: 'Failed to fetch products' });
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

  app.post("/api/products", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});

    try {
      const { name, description, activities } = req.body;

      const result = await db.transaction(async (tx) => {
        const [product] = await tx
          .insert(products)
          .values({
            name,
            description,
            isEnabled: true,
          })
          .returning();

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

      await logAdminAction({
        adminId: req.user.id,
        actionType: "PRODUCT_CREATED",
        details: `Created new product: ${result.name}`,
      });

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
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;
    const { name, description, activities } = req.body;

    try {
      const result = await db.transaction(async (tx) => {
        const [product] = await tx
          .update(products)
          .set({
            name,
            description,
          })
          .where(eq(products.id, parseInt(id)))
          .returning();

        await tx
          .delete(product_activities)
          .where(eq(product_activities.productId, parseInt(id)));

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

      await logAdminAction({
        adminId: req.user.id,
        actionType: "PRODUCT_UPDATED",
        details: `Updated product: ${result.name}`,
      });

      const completeProduct = await db.query.products.findFirst({
        where: eq(products.id, parseInt(id)),
        with: {
          activities: true,
        },
      });

      res.json(completeProduct);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  app.post("/api/products/:id/toggle-status", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;
    const { enabled } = req.body;

    try {
      const [product] = await db
        .update(products)
        .set({ isEnabled: enabled })
        .where(eq(products.id, parseInt(id)))
        .returning();

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      await logAdminAction({
        adminId: req.user.id,
        actionType: enabled ? "PRODUCT_CREATED" : "PRODUCT_DELETED",
        details: `${enabled ? 'Enabled' : 'Disabled'} product: ${product.name}`,
      });

      res.json(product);
    } catch (error) {
      console.error('Error toggling product status:', error);
      res.status(500).json({ error: 'Failed to toggle product status' });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;

    try {
      const [product] = await db
        .delete(products)
        .where(eq(products.id, parseInt(id)))
        .returning();

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      await logAdminAction({
        adminId: req.user.id,
        actionType: "PRODUCT_DELETED",
        details: `Deleted product: ${product.name}`,
      });

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  app.post("/api/products/:id/assign", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;
    const { userId } = req.body;

    try {
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

      await logAdminAction({
        adminId: req.user.id,
        actionType: "PRODUCT_ASSIGNED",
        targetUserId: userId,
        details: `Assigned product ID ${id} to user ID ${userId}`,
      });

      res.json(assignment);
    } catch (error) {
      console.error('Error assigning product:', error);
      res.status(500).json({ error: 'Failed to assign product' });
    }
  });

  app.post("/api/products/:id/unassign", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
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

      await logAdminAction({
        adminId: req.user.id,
        actionType: "PRODUCT_UNASSIGNED",
        targetUserId: userId,
        details: `Unassigned product ID ${id} from user ID ${userId}`,
      });

      res.json({ message: "Product unassigned successfully" });
    } catch (error) {
      console.error('Error unassigning product:', error);
      res.status(500).json({ error: 'Failed to unassign product' });
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
        .limit(1);

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
        .returning();

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
        .where(eq(users.isAdmin, true));

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
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const allQuoteRequests = await db.query.quoteRequests.findMany({
        orderBy: desc(quoteRequests.createdAt),
        with: {
          user: {
            columns: {
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          product: {
            columns: {
              name: true,
              description: true,
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

      res.json(allQuoteRequests);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      res.status(500).json({ error: 'Failed to fetch quote requests' });
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
        .limit(1);

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
        .returning();

      await db.insert(notifications).values({
        userId: quoteRequest.userId,
        type: "QUOTE_STATUS_CHANGE",
        title: "Quote Request Update",
        message: `Your quote request has been ${status.toLowerCase()}${notes ? `: ${notes}` : ''}`,
        relatedId: quoteRequest.id
      });

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

  app.get("/api/customer/transactions", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});
    const userTransactions = await db.query.transactions.findMany({
      where: eq(transactions.userId, req.user.id),
      orderBy: desc(transactions.createdAt),
      with: {
        reward: true,
      },
    });
    res.json(userTransactions);
  });

  app.get("/api/customer/referral", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let currentReferralCode = user.referral_code;
      if (!currentReferralCode) {
        currentReferralCode = randomBytes(8).toString("hex");
        await db
          .update(users)
          .set({ referral_code: currentReferralCode })
          .where(eq(users.id, req.user.id));
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
        .orderBy(desc(users.createdAt));

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
        .limit(1);

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
        .where(eq(users.referred_by, currentUser.referral_code));

      const level2Count = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          inArray(
            users.referred_by,
            level1Referrals.map(r => r.referral_code)
          )
        );

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
      }).returning();

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
        .returning();

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
        .limit(1);

      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }

      await db
        .update(rewards)
        .set({ available: false })
        .where(eq(rewards.id, parseInt(id)));

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
        });

        await tx
          .update(users)
          .set({ points: user.points - reward.pointsCost })
          .where(eq(users.id, user.id));

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
        }).returning();

        await tx
          .update(users)
          .set({
            points: sql`${users.points} - ${points}`
          })
          .where(eq(users.id, user.id));


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
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});

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
      res.status(500).json({ error: 'Failed to fetch cash redemptions' });
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
        .returning();

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
          .returning();

        if (!deletedNotification) {
          return res.status(404).json({ error: "Notification not found" });
        }
      } else {
        await db
          .delete(notifications)
          .where(eq(notifications.userId, req.user.id));
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
        .limit(1);

      if (user) {
        const resetToken = randomBytes(32).toString("hex");
        const tokenExpiry = new Date(Date.now() + 3600000); 

        await db
          .update(users)
          .set({
            resetToken,
            resetTokenExpiry: tokenExpiry,
          })
          .where(eq(users.id, user.id));

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
        .limit(1);

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
        .where(eq(users.id, user.id));

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

    try {
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
        .returning();

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

  return httpServer;
}