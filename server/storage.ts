import { db } from "./db";
import { users, keys, logs, type User, type InsertUser, type Key, type InsertKey, type Log, type InsertLog } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSubscription(userId: number, tier: string, expiresAt: Date | null): Promise<User>;
  
  // Key operations
  createKey(key: InsertKey): Promise<Key>;
  getKey(keyStr: string): Promise<Key | undefined>;
  redeemKey(keyId: number, userId: number): Promise<Key>;
  
  // Log operations
  createLog(log: InsertLog): Promise<Log>;
  
  // Stats
  getStats(): Promise<{ totalUsers: number; activeSubs: number; totalLookups: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserSubscription(userId: number, tier: string, expiresAt: Date | null): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ subscriptionTier: tier, subscriptionExpiresAt: expiresAt })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async createKey(key: InsertKey): Promise<Key> {
    const [newKey] = await db.insert(keys).values(key).returning();
    return newKey;
  }

  async getKey(keyStr: string): Promise<Key | undefined> {
    const [key] = await db.select().from(keys).where(eq(keys.key, keyStr));
    return key;
  }

  async redeemKey(keyId: number, userId: number): Promise<Key> {
    const [updatedKey] = await db
      .update(keys)
      .set({ status: "redeemed", redeemedBy: userId })
      .where(eq(keys.id, keyId))
      .returning();
    return updatedKey;
  }

  async createLog(log: InsertLog): Promise<Log> {
    const [newLog] = await db.insert(logs).values(log).returning();
    return newLog;
  }

  async getStats(): Promise<{ totalUsers: number; activeSubs: number; totalLookups: number }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [subCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`subscription_expires_at > NOW() OR subscription_expires_at IS NULL AND subscription_tier = 'lifetime'`);
    const [logCount] = await db.select({ count: sql<number>`count(*)` }).from(logs);
    
    return {
      totalUsers: Number(userCount.count),
      activeSubs: Number(subCount.count),
      totalLookups: Number(logCount.count),
    };
  }
}

export const storage = new DatabaseStorage();
