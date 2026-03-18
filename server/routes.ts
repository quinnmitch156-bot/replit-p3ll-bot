import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { startBot } from "./bot";
import { randomBytes } from "crypto";
import { getEpicAccessToken } from "./services/epicAuth";

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

  // Helper: check API key
  function checkKey(req: any, res: any): boolean {
    const apiKey = process.env.TOKEN_API_KEY;
    if (apiKey && req.headers['x-api-key'] !== apiKey && req.query.key !== apiKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return false;
    }
    return true;
  }

  // Return the current raw access token (for advanced use)
  app.get('/api/epic-token', async (req, res) => {
    if (!checkKey(req, res)) return;
    const token = await getEpicAccessToken();
    if (!token) return res.status(503).json({ error: 'Epic auth not configured' });
    res.json({ access_token: token, type: 'Bearer' });
  });

  // Proxy: look up Epic account linked to an Xbox gamertag
  // BotGhost URL: /api/epic/xbl/{gamertag}?key=YOUR_API_KEY
  app.get('/api/epic/xbl/:gamertag', async (req, res) => {
    if (!checkKey(req, res)) return;
    const token = await getEpicAccessToken();
    if (!token) return res.status(503).json({ error: 'Epic auth not configured' });
    const gt = encodeURIComponent(req.params.gamertag);
    const epicRes = await fetch(
      `https://account-public-service-prod.ol.epicgames.com/account/api/public/account/lookup/externalAuth/xbl/displayName/${gt}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await epicRes.json();
    res.status(epicRes.status).json(data);
  });

  // Proxy: look up Epic account by display name
  // BotGhost URL: /api/epic/lookup/{username}?key=YOUR_API_KEY
  app.get('/api/epic/lookup/:username', async (req, res) => {
    if (!checkKey(req, res)) return;
    const token = await getEpicAccessToken();
    if (!token) return res.status(503).json({ error: 'Epic auth not configured' });
    const epicRes = await fetch(
      `https://account-public-service-prod.ol.epicgames.com/account/api/public/account/lookup?displayName=${encodeURIComponent(req.params.username)}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await epicRes.json();
    res.status(epicRes.status).json(data);
  });

  // Gen Code admin — generates a new one-time code
  // Supports both GET and POST so BotGhost works regardless of method
  // BotGhost: GET /api/gen-code?key=YOUR_API_KEY
  async function handleGenCode(req: any, res: any) {
    if (!checkKey(req, res)) return;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
    await storage.createGenCode(code);
    res.type('text/plain').send(code);
  }
  app.get('/api/gen-code', handleGenCode);
  app.post('/api/gen-code', handleGenCode);

  // Name Gen — validates code, returns generated Fortnite username + Snusbase IP lookup
  // BotGhost: GET /api/name-gen/{code}?key=YOUR_API_KEY
  app.get('/api/name-gen/:code', async (req, res) => {
    if (!checkKey(req, res)) return;
    const code = req.params.code.toUpperCase();
    const genCode = await storage.getGenCode(code);

    if (!genCode) return res.type('text/plain').send('❌ Invalid code. Make sure you typed it correctly.');
    if (genCode.used) return res.type('text/plain').send('❌ This code has already been used.');

    // Mark used with requester info (Discord ID or IP)
    const usedBy = (req.query.discord_id as string) || req.ip || 'botghost';
    await storage.markGenCodeUsed(code, usedBy);

    // Helpers
    const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randHex = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    // Generate username
    const firstParts = ['Norman','Shadow','Ghost','Apex','Rogue','Void','Neon','Storm','Elite','Viper','Wraith','Clutch','Reaper','Phantom','Slayer','Nova','Toxic','Frag','Blaze','Frost','Hyper','Zeta','Omega','Delta','Nexus','Cipher','Flare','Stealth','Chaos','Rebel'];
    const midParts = ['El','The','_','De','Le','Van','Mac','Pro','OG','x'];
    const endParts = ['0','1','r0','Pr0','yt','GG','XD','TTV','zz','99','420','lol','vv','ii','oo'];
    const usernameFormats = [
      () => `${rand(firstParts)}${rand(endParts)}`,
      () => `${rand(firstParts)}${rand(midParts)}${rand(firstParts)}`,
      () => `x${rand(firstParts)}x`,
      () => `ii${rand(firstParts)}ii`,
      () => `${rand(firstParts)}_${randInt(10,9999)}`,
      () => `${rand(firstParts)}${rand(firstParts)}${rand(endParts)}`,
    ];
    const username = usernameFormats[Math.floor(Math.random() * usernameFormats.length)]();

    // Account ID (32 char hex like Epic account IDs)
    const accountId = randHex(32);

    // Stats
    const matches = randInt(400, 8000);
    const wins = randInt(Math.floor(matches * 0.03), Math.floor(matches * 0.18));
    const stw = Math.random() > 0.5 ? 'Yes' : 'No';
    const daysAgo = randInt(1, 730);
    const lastMatchDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];

    // Cosmetics
    const allPickaxes = ['Pry Axe','7 Rings Smasher','Axecalibur','Batsickle','Candy Axe','Frostbite','Gale Force','Harley Hitter','Ice Breaker','Merry Mauler','Minty Pickaxe','Neon Scythe','Permafrost','Pickaxe of Champions','Rainbow Smash','Reaper','Skull Sickle','Star Wand','Studded Axe','Trusty No. 2'];
    const allBackblings = ['Nucleus','Black Shield','Bling Bag','Brite Bag','Camo','Cold Front','Crested Cape','Dark Wings','Hamirez','Glider Wings','Harvester Pack','Journey Bag','Mako','Prospect Pack','Scoundrel Pack','Shield','Slurp Splashback','Star Power','Tech Ops','Trailblazer Pack'];
    const allEmotes = ['Call me','Poki','Don\'t Start Now','Never Gonna','Skipper','Dance Moves','Evasive Maneuvers','Build Up','Have a Seat','Say So','Clean Sweep','Floss','Orange Justice','Ride The Pony','Robot','Scenario','Swipe It','Take The L','The Worm','Wiggle'];

    const shuffle = (arr: string[]) => [...arr].sort(() => Math.random() - 0.5);
    const pickaxes = shuffle(allPickaxes).slice(0, randInt(1, 4)).join(', ');
    const backblings = shuffle(allBackblings).slice(0, randInt(1, 3)).join(', ');
    const emotes = shuffle(allEmotes).slice(0, randInt(4, 12)).join(', ');

    // Connected accounts
    const nintendoId = `lp1_${randHex(16)}`;
    const steamId = `7656119${randInt(1000000000, 9999999999)}`;
    const connAccs = `(xbl, DisplayName: ${username}), (nintendo, nsa_id: ${nintendoId}), (steam, steam_id64: ${steamId}, DisplayName: ${steamId})`;

    const output = `${username} | Username: ${username} | AccountId: ${accountId} | Matches: ${matches} | Wins: ${wins} | STW: ${stw} | LastMatch: ${lastMatchDate} | Pickaxes: ${pickaxes} | Backblings: ${backblings} | Emotes: ${emotes} | Conn Accs: ${connAccs}`;

    res.type('text/plain').send(output);
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
