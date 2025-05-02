import { mysqlTable, varchar, int, boolean, timestamp } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './schema';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// Define the leads table schema
export const leads = mysqlTable("leads", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  mobileNumber: varchar("mobile_number", { length: 20 }).notNull(),
  selectedPackage: varchar("selected_package", { length: 20 }),
  referralCode: varchar("referral_code", { length: 100 }),
  contacted: boolean("contacted").default(false),
  converted: boolean("converted").default(false),
  convertedUserId: int("converted_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Define the relationship between leads and users (when a lead is converted to a customer)
export const leadsRelations = relations(leads, ({ one }) => ({
  convertedUser: one(users, {
    fields: [leads.convertedUserId],
    references: [users.id],
  }),
}));

// Define types for TypeScript
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// Create Zod schemas for validation
export const insertLeadSchema = createInsertSchema(leads);
export const selectLeadSchema = createSelectSchema(leads);

// Extended schema with proper validation for the frontend
export const leadFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  selectedPackage: z.enum(["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"]).optional(),
  referralCode: z.string().optional(),
});