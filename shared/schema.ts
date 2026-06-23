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

export const genCodes = pgTable("gen_codes", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  used: boolean("used").default(false),
  usedBy: text("used_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGenCodeSchema = createInsertSchema(genCodes).omit({ id: true, createdAt: true, used: true, usedBy: true });
export type GenCode = typeof genCodes.$inferSelect;
export type InsertGenCode = z.infer<typeof insertGenCodeSchema>;

export const resolverDb = pgTable("resolver_db", {
  id: serial("id").primaryKey(),
  gamertag: text("gamertag").notNull(),
  gamertagLower: text("gamertag_lower").notNull(),
  ip: text("ip").notNull(),
  submittedBy: text("submitted_by"),
  source: text("source").default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResolverDbSchema = createInsertSchema(resolverDb).omit({ id: true, createdAt: true, gamertagLower: true });
export type ResolverEntry = typeof resolverDb.$inferSelect;
export type InsertResolverEntry = z.infer<typeof insertResolverDbSchema>;

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  command: text("command").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  section: text("section").notNull(), // gaming-news | esports | technology | community-updates
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull().default("Staff Writer"),
  imageUrl: text("image_url").notNull(),
  featured: boolean("featured").default(false),
  publishedAt: timestamp("published_at").defaultNow(),
});

export const insertArticleSchema = createInsertSchema(articles).omit({ id: true, publishedAt: true });
export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertKeySchema = createInsertSchema(keys).omit({ id: true, createdAt: true, redeemedBy: true });
export const insertLogSchema = createInsertSchema(logs).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Key = typeof keys.$inferSelect;
export type InsertKey = z.infer<typeof insertKeySchema>;
export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
