import { mysqlTable, text, int, boolean, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Define enums first
export const activityTypes = mysqlEnum('activity_type', ['SYSTEM_ACTIVATION', 'PRODUCT_ACTIVATION', 'PREMIUM_PAYMENT', 'CARD_BALANCE', 'UPGRADE', 'RENEWAL']);

export const packageTypes = mysqlEnum('package_type', ['BEGINNER', 'NOVICE', 'ACTIVE', 'PROFESSIONAL', 'EXPERT']);

export const accountTypes = mysqlEnum('account_type', ['CHEQUE', 'SAVINGS', 'CURRENT']);

export const products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const product_activities = mysqlTable("product_activities", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  type: text("type").notNull(),
  pointsValue: int("points_value").default(0).notNull(),
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
  selectedPackage: text("selected_package"),
  bankName: text("bank_name"),
  accountType: text("account_type"),
  accountNumber: text("account_number"),
  accountHolderName: text("account_holder_name"),
  branchCode: text("branch_code"),
  hasCreditCard: boolean("has_credit_card").default(false),
  signature: text("signature"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  points: int("points").default(0).notNull(),
  referralCode: text("referral_code"),
  referredBy: text("referred_by"),
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

export const rewards = mysqlTable("rewards", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pointsCost: int("points_cost").notNull(),
  imageUrl: text("image_url").notNull(),
  available: boolean("available").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactionTypes = mysqlEnum('transaction_type', [
  'EARNED',
  'REDEEMED',
  'ADMIN_ADJUSTMENT',
  'CASH_REDEMPTION',
  'WELCOME_BONUS',
  'REFERRAL_BONUS',
  'QUOTE_REQUEST'
]);

export const transactionStatus = mysqlEnum('transaction_status', ['PENDING', 'PROCESSED']);

export const transactions = mysqlTable("transactions", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id).notNull(),
  points: int("points").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  rewardId: int("reward_id").references(() => rewards.id),
  status: text("status").default("PENDING"),
  processedAt: timestamp("processed_at"),
  processedBy: int("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminActionTypes = mysqlEnum('admin_action_type', [
  'POINT_ADJUSTMENT',
  'ADMIN_CREATED',
  'ADMIN_REMOVED',
  'ADMIN_ENABLED',
  'ADMIN_DISABLED',
  'USER_ENABLED',
  'USER_DISABLED',
  'USER_UPDATED',
  'REWARD_CREATED',
  'REWARD_UPDATED',
  'REWARD_DELETED',
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
  'PRODUCT_DELETED',
  'PRODUCT_ASSIGNED',
  'PRODUCT_UNASSIGNED',
  'QUOTE_REQUEST_UPDATED',
  'QUOTE_REQUEST_COMPLETED',
  'QUOTE_REQUEST_REJECTED'
]);

export const adminLogs = mysqlTable("admin_logs", {
  id: int("id").primaryKey().autoincrement(),
  adminId: int("admin_id").references(() => users.id).notNull(),
  targetUserId: int("target_user_id").references(() => users.id),
  actionType: text("action_type").notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quoteRequestStatus = mysqlEnum('quote_request_status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']);

export const quoteRequests = mysqlTable("quote_requests", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  status: text("status").default("PENDING").notNull(),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  completedBy: int("completed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationTypes = mysqlEnum('notification_type', [
  'QUOTE_STATUS_CHANGE',
  'POINTS_AWARDED',
  'ADMIN_MESSAGE',
  'SYSTEM_UPDATE'
]);

export const notifications = mysqlTable("notifications", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  relatedId: int("related_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const packagePremiums = mysqlEnum('package_premium', [
  'BEGINNER_PREMIUM',
  'NOVICE_PREMIUM',
  'ACTIVE_PREMIUM',
  'PROFESSIONAL_PREMIUM',
  'EXPERT_PREMIUM'
]);

export const packagePremiumAmounts = mysqlTable("package_premium_amounts", {
  id: int("id").primaryKey().autoincrement(),
  packageType: text("package_type").notNull(),
  premiumAmount: int("premium_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const productRelations = relations(products, ({ many }) => ({
  activities: many(product_activities),
  assignments: many(productAssignments),
}));

export const productActivityRelations = relations(product_activities, ({ one }) => ({
  product: one(products, {
    fields: [product_activities.productId],
    references: [products.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  adminLogsCreated: many(adminLogs, { relationName: "adminLogsCreated" }),
  adminLogsTarget: many(adminLogs, { relationName: "adminLogsTarget" }),
  productAssignments: many(productAssignments),
  quoteRequests: many(quoteRequests, { relationName: "userQuoteRequests" }),
  completedQuoteRequests: many(quoteRequests, { relationName: "adminCompletedQuotes" }),
  notifications: many(notifications),
}));

export const productAssignmentRelations = relations(productAssignments, ({ one }) => ({
  user: one(users, {
    fields: [productAssignments.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [productAssignments.productId],
    references: [products.id],
  }),
}));

export const transactionRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  reward: one(rewards, {
    fields: [transactions.rewardId],
    references: [rewards.id],
  }),
}));

export const adminLogRelations = relations(adminLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminLogs.adminId],
    references: [users.id],
  }),
  targetUser: one(users, {
    fields: [adminLogs.targetUserId],
    references: [users.id],
  }),
}));

export const quoteRequestRelations = relations(quoteRequests, ({ one }) => ({
  user: one(users, {
    fields: [quoteRequests.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [quoteRequests.productId],
    references: [products.id],
  }),
  completedByUser: one(users, {
    fields: [quoteRequests.completedBy],
    references: [users.id],
  }),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Schema validations
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

// Types
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