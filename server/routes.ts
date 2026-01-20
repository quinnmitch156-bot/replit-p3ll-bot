import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { startBot } from "./bot";
import { randomBytes } from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Start the Discord Bot
  startBot();

  // API Routes
  app.get(api.stats.get.path, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.post(api.keys.generate.path, async (req, res) => {
    // In a real app, check for admin session/auth here
    const input = api.keys.generate.input.parse(req.body);
    const createdKeys = [];

    for (let i = 0; i < input.amount; i++) {
      const keyStr = `SCOUT-${input.type.toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
      const newKey = await storage.createKey({
        key: keyStr,
        type: input.type,
        status: "active",
        // createdBy: req.session.userId // Assuming auth
      });
      createdKeys.push({ key: newKey.key, type: newKey.type });
    }

    res.status(201).json(createdKeys);
  });

  app.post(api.keys.redeem.path, async (req, res) => {
    try {
      const input = api.keys.redeem.input.parse(req.body);
      const key = await storage.getKey(input.key);

      if (!key || key.status !== 'active') {
        return res.status(400).json({ message: "Invalid or already redeemed key" });
      }

      let user = await storage.getUserByDiscordId(input.discordId);
      if (!user) {
         // Should normally be created by bot or login, but create if missing
         user = await storage.createUser({
           discordId: input.discordId,
           username: "Web User", // Placeholder
           role: 'user'
         });
      }

      const now = new Date();
      let expiresAt: Date | null = null;
      if (key.type === 'monthly') expiresAt = new Date(now.setMonth(now.getMonth() + 1));
      if (key.type === 'weekly') expiresAt = new Date(now.setDate(now.getDate() + 7));

      await storage.redeemKey(key.id, user.id);
      await storage.updateUserSubscription(user.id, key.type, expiresAt);

      res.json({ success: true, message: "Key redeemed successfully", expiresAt: expiresAt?.toISOString() || null });
    } catch (err) {
       res.status(400).json({ message: "Error redeeming key" });
    }
  });

  app.get(api.users.get.path, async (req, res) => {
    const discordId = req.params.discordId as string;
    let user = await storage.getUserByDiscordId(discordId);
    if (!user) {
      // Create a temporary profile if not found to prevent 404s during sync
      user = await storage.createUser({
        discordId: discordId,
        username: "New User",
        role: "user"
      });
    }
    
    // Convert dates to strings for JSON
    const response = {
      ...user,
      subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() || null,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString()
    };
    res.json(response);
  });

  return httpServer;
}
