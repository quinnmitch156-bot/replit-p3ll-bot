import { db } from "./db";
import { users, keys, logs, genCodes, resolverDb, type User, type InsertUser, type Key, type InsertKey, type Log, type InsertLog, type GenCode, type ResolverEntry } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

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
  
  // Gen code operations
  createGenCode(code: string): Promise<GenCode>;
  getGenCode(code: string): Promise<GenCode | undefined>;
  markGenCodeUsed(code: string, usedBy: string): Promise<GenCode>;

  // Resolver DB operations
  submitResolverEntry(gamertag: string, ip: string, submittedBy: string, source?: string): Promise<ResolverEntry>;
  lookupResolverEntry(gamertag: string): Promise<ResolverEntry | undefined>;
  getResolverDb(limit?: number): Promise<ResolverEntry[]>;

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

  async createGenCode(code: string): Promise<GenCode> {
    const [newCode] = await db.insert(genCodes).values({ code }).returning();
    return newCode;
  }

  async getGenCode(code: string): Promise<GenCode | undefined> {
    const [found] = await db.select().from(genCodes).where(eq(genCodes.code, code));
    return found;
  }

  async markGenCodeUsed(code: string, usedBy: string): Promise<GenCode> {
    const [updated] = await db.update(genCodes).set({ used: true, usedBy }).where(eq(genCodes.code, code)).returning();
    return updated;
  }

  async submitResolverEntry(gamertag: string, ip: string, submittedBy: string, source = 'manual'): Promise<ResolverEntry> {
    const lower = gamertag.toLowerCase();
    // Upsert: update IP if gamertag already exists, otherwise insert
    const existing = await this.lookupResolverEntry(gamertag);
    if (existing) {
      const [updated] = await db.update(resolverDb)
        .set({ ip, submittedBy, source, createdAt: new Date() })
        .where(eq(resolverDb.gamertagLower, lower))
        .returning();
      return updated;
    }
    const [entry] = await db.insert(resolverDb).values({ gamertag, gamertagLower: lower, ip, submittedBy, source }).returning();
    return entry;
  }

  async lookupResolverEntry(gamertag: string): Promise<ResolverEntry | undefined> {
    const [entry] = await db.select().from(resolverDb)
      .where(eq(resolverDb.gamertagLower, gamertag.toLowerCase()))
      .orderBy(desc(resolverDb.createdAt))
      .limit(1);
    return entry;
  }

  async getResolverDb(limit = 50): Promise<ResolverEntry[]> {
    return db.select().from(resolverDb).orderBy(desc(resolverDb.createdAt)).limit(limit);
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
