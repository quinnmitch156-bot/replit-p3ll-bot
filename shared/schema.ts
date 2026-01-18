import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").unique(),
  username: text("username"),
  role: text("role").default("user"), // "admin" | "user"
  subscriptionTier: text("subscription_tier"), // "lifetime", "monthly", "weekly", null
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const keys = pgTable("keys", {
  id: serial("id").primaryKey(),
  key: text("key").unique().notNull(),
  type: text("type").notNull(), // "lifetime", "monthly", "weekly"
  status: text("status").default("active"), // "active", "redeemed"
  createdBy: integer("created_by").references(() => users.id),
  redeemedBy: integer("redeemed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  command: text("command").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertKeySchema = createInsertSchema(keys).omit({ id: true, createdAt: true, redeemedBy: true, status: true });
export const insertLogSchema = createInsertSchema(logs).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Key = typeof keys.$inferSelect;
export type InsertKey = z.infer<typeof insertKeySchema>;
export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
