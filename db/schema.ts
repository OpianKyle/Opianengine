import { mysqlTable, text, int, boolean, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Define enum values as arrays first
const ACTIVITY_TYPES = [
  "SYSTEM_ACTIVATION",
  "PRODUCT_ACTIVATION",
  "PREMIUM_PAYMENT",
  "CARD_BALANCE",
  "UPGRADE",
  "RENEWAL"
] as const;

const PACKAGE_TYPES = [
  "BEGINNER",
  "NOVICE",
  "ACTIVE",
  "PROFESSIONAL",
  "EXPERT"
] as const;

const ACCOUNT_TYPES = [
  "CHEQUE",
  "SAVINGS",
  "CURRENT"
] as const;

const TRANSACTION_TYPES = [
  "EARNED",
  "REDEEMED",
  "ADMIN_ADJUSTMENT",
  "CASH_REDEMPTION",
  "WELCOME_BONUS",
  "REFERRAL_BONUS",
  "QUOTE_REQUEST"
] as const;

const TRANSACTION_STATUS = ["PENDING", "PROCESSED"] as const;

const ADMIN_ACTION_TYPES = [
  "POINT_ADJUSTMENT",
  "ADMIN_CREATED",
  "ADMIN_REMOVED",
  "ADMIN_ENABLED",
  "ADMIN_DISABLED",
  "USER_ENABLED",
  "USER_DISABLED",
  "USER_UPDATED",
  "REWARD_CREATED",
  "REWARD_UPDATED",
  "REWARD_DELETED",
  "PRODUCT_CREATED",
  "PRODUCT_UPDATED",
  "PRODUCT_DELETED",
  "PRODUCT_ASSIGNED",
  "PRODUCT_UNASSIGNED",
  "QUOTE_REQUEST_UPDATED",
  "QUOTE_REQUEST_COMPLETED",
  "QUOTE_REQUEST_REJECTED"
] as const;

const QUOTE_REQUEST_STATUS = ["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"] as const;

const NOTIFICATION_TYPES = [
  "QUOTE_STATUS_CHANGE",
  "POINTS_AWARDED",
  "ADMIN_MESSAGE",
  "SYSTEM_UPDATE"
] as const;

const PACKAGE_PREMIUMS = [
  "BEGINNER_PREMIUM",
  "NOVICE_PREMIUM", 
  "ACTIVE_PREMIUM",
  "PROFESSIONAL_PREMIUM",
  "EXPERT_PREMIUM"
] as const;

// Table Definitions - ordered to avoid forward references
export const products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  isSouthAfrican: boolean("is_south_african").default(false),
  idNumber: text("id_number"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  occupation: text("occupation"),
  industry: text("industry"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  selectedPackage: text("selected_package", { enum: PACKAGE_TYPES }),
  bankName: text("bank_name"),
  accountType: text("account_type", { enum: ACCOUNT_TYPES }),
  accountNumber: text("account_number"),
  accountHolderName: text("account_holder_name"),
  branchCode: text("branch_code"),
  hasCreditCard: boolean("has_credit_card").default(false),
  signature: text("signature"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isAgent: boolean("is_agent").default(false).notNull(), // Add agent flag
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  points: int("points").default(0).notNull(),
  referralCode: text("referral_code"),
  referredBy: text("referred_by"),
  agentId: int("agent_id"), // Add reference to agent who created the user
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productAssignments = mysqlTable("product_assignments", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const product_activities = mysqlTable("product_activities", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  type: text("type", { enum: ACTIVITY_TYPES }).notNull(),
  pointsValue: int("points_value").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rewards = mysqlTable("rewards", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pointsCost: int("points_cost").notNull(),
  imageUrl: text("image_url").notNull(),
  available: boolean("available").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = mysqlTable("transactions", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id).notNull(),
  points: int("points").notNull(),
  type: text("type", { enum: TRANSACTION_TYPES }).notNull(),
  description: text("description").notNull(),
  rewardId: int("reward_id").references(() => rewards.id),
  status: text("status", { enum: TRANSACTION_STATUS }).default("PENDING"),
  processedAt: timestamp("processed_at"),
  processedBy: int("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminLogs = mysqlTable("admin_logs", {
  id: int("id").primaryKey().autoincrement(),
  adminId: int("admin_id").references(() => users.id).notNull(),
  targetUserId: int("target_user_id").references(() => users.id),
  actionType: text("action_type", { enum: ADMIN_ACTION_TYPES }).notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quoteRequests = mysqlTable("quote_requests", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  status: text("status", { enum: QUOTE_REQUEST_STATUS }).default("PENDING").notNull(),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  completedBy: int("completed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  relatedId: int("related_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const packagePremiumAmounts = mysqlTable("package_premium_amounts", {
  id: int("id").primaryKey().autoincrement(),
  packageType: text("package_type", { enum: PACKAGE_TYPES }).notNull(),
  premiumAmount: int("premium_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const productRelations = relations(products, ({ many }) => ({
  activities: many(product_activities),
  assignments: many(productAssignments),
}));

export const userRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  adminLogsCreated: many(adminLogs),
  adminLogsTarget: many(adminLogs),
  productAssignments: many(productAssignments),
  quoteRequests: many(quoteRequests),
  notifications: many(notifications),
  agentCustomers: many(users, { relationName: "agent_customers" })
}));

export const transactionRelations = relations(transactions, ({ one }) => ({
  user: one(users),
  reward: one(rewards)
}));

export const adminLogRelations = relations(adminLogs, ({ one }) => ({
  admin: one(users),
  targetUser: one(users)
}));

export const quoteRequestRelations = relations(quoteRequests, ({ one }) => ({
  user: one(users),
  product: one(products),
  completedByUser: one(users)
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users)
}));

// Type exports
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type ProductActivity = typeof product_activities.$inferSelect;
export type InsertProductActivity = typeof product_activities.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Reward = typeof rewards.$inferSelect;
export type InsertReward = typeof rewards.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;
export type ProductAssignment = typeof productAssignments.$inferSelect;
export type InsertProductAssignment = typeof productAssignments.$inferInsert;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type InsertQuoteRequest = typeof quoteRequests.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type PackagePremiumAmount = typeof packagePremiumAmounts.$inferSelect;
export type InsertPackagePremiumAmount = typeof packagePremiumAmounts.$inferInsert;

// Schema exports
export const insertProductSchema = createInsertSchema(products);
export const selectProductSchema = createSelectSchema(products);
export const insertProductActivitySchema = createInsertSchema(product_activities);
export const selectProductActivitySchema = createSelectSchema(product_activities);
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertRewardSchema = createInsertSchema(rewards);
export const selectRewardSchema = createSelectSchema(rewards);
export const insertTransactionSchema = createInsertSchema(transactions);
export const selectTransactionSchema = createSelectSchema(transactions);
export const insertAdminLogSchema = createInsertSchema(adminLogs);
export const selectAdminLogSchema = createSelectSchema(adminLogs);
export const insertProductAssignmentSchema = createInsertSchema(productAssignments);
export const selectProductAssignmentSchema = createSelectSchema(productAssignments);
export const insertQuoteRequestSchema = createInsertSchema(quoteRequests);
export const selectQuoteRequestSchema = createSelectSchema(quoteRequests);
export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);
export const insertPackagePremiumAmountSchema = createInsertSchema(packagePremiumAmounts);
export const selectPackagePremiumAmountSchema = createSelectSchema(packagePremiumAmounts);