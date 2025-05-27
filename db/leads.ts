import { mysqlTable, timestamp, varchar, int, text } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import * as z from "zod";

export const leads = mysqlTable("leads", {
  id: int("id").primaryKey().autoincrement(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  mobileNumber: varchar("mobile_number", { length: 20 }).notNull(),
  selectedPackage: varchar("selected_package", { length: 50 }).$type<"OPPORTUNITY" | "MOMENTUM" | "PROSPER" | "PRESTIGE" | "PINNACLE">(),
  referralCode: varchar("referral_code", { length: 50 }),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).default("new").$type<"new" | "contacted" | "converted" | "not_interested">(),
  assignedAgentId: int("assigned_agent_id"),
  referredByName: varchar("referred_by_name", { length: 255 }),
  referredByEmail: varchar("referred_by_email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Relations for the leads table
export const leadsRelations = relations(leads, ({ one }) => ({
  assignedAgent: one("users", {
    fields: [leads.assignedAgentId],
    references: [int("id")], // This should be users.id in your schema
  }),
}));

// Drizzle ORM types
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// Validation schemas using Zod with Drizzle
export const insertLeadSchema = createInsertSchema(leads);

export const selectLeadSchema = createSelectSchema(leads);

// Combined form schema for the frontend
export const leadFormSchema = z.object({
  fullName: z.string().min(3, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 characters"),
  selectedPackage: z.enum(["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"]).optional(),
  referralCode: z.string().optional(),
  notes: z.string().optional(),
});