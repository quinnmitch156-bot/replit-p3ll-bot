import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { startBot, dmOwner } from "./bot";
import { randomBytes } from "crypto";
import { getEpicAccessToken } from "./services/epicAuth";
import { generateXboxReceipt } from "./services/receiptGenerator";
import fs from "fs";
import path from "path";

const RECEIPTS_DIR = path.resolve(process.cwd(), 'public/receipts');
if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve generated receipt images
  app.use('/receipts', express.static(RECEIPTS_DIR));

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

  // Xbox/PSN IP Resolver — tries all resolver networks server-side, bypassing Cloudflare
  // BotGhost: GET /api/resolve/xbl/{gamertag}?key=YOUR_API_KEY
  // BotGhost: GET /api/resolve/psn/{username}?key=YOUR_API_KEY
  app.get('/api/resolve/:type/:username', async (req, res) => {
    if (!checkKey(req, res)) return;
    const type = req.params.type.toLowerCase(); // xbl or psn
    const name = req.params.username;

    const browsers = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
    ];
    const ua = browsers[Math.floor(Math.random() * browsers.length)];

    const resolvers: Array<() => Promise<string | null>> = [
      async () => {
        const r = await fetch(`https://api.l3p.xyz/resolver/${type}/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': ua } });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.resolved_ip || (d.data && d.data.ip) || null;
      },
      async () => {
        const r = await fetch(`https://api.psychotic.pro/resolve/${type}/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': ua } });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.Address || d.resolved_ip || null;
      },
      async () => {
        const r = await fetch(`https://psychotic.pro/api/v2/resolve/${type}/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': ua } });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.resolved_ip || null;
      },
      async () => {
        const r = await fetch(`https://lanc-remastered.net/api/v1/resolve/${type}/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': ua } });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.resolved_ip || null;
      },
      async () => {
        const r = await fetch(`https://x-resolver.com/api/v1/resolve/${type}/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': ua } });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.resolved_ip || (d.resolved && d.resolved.ip) || null;
      },
      async () => {
        const r = await fetch(`https://resolver.lol/api/v1/resolve/${type}/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': ua } });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.resolved_ip || null;
      },
      async () => {
        const r = await fetch(`https://api.octosniff.net/resolve?type=${type}&username=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': ua } });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.Address || null;
      },
      // Snusbase fallback
      async () => {
        if (!process.env.Authorization) return null;
        const r = await fetch('https://api.snusbase.com/data/search', {
          method: 'POST', signal: AbortSignal.timeout(8000),
          headers: { 'Auth': process.env.Authorization, 'Content-Type': 'application/json' },
          body: JSON.stringify({ terms: [name], types: ['username'], wildcard: false })
        });
        if (!r.ok) return null;
        const d = await r.json();
        for (const src in (d.results || {})) {
          for (const entry of d.results[src]) {
            const ip = entry.ip || entry.lastip || entry.last_ip;
            if (ip) return ip;
          }
        }
        return null;
      },
    ];

    // Helper: geo-lookup an IP and return formatted info lines
    async function geoLookup(ip: string): Promise<string> {
      try {
        const g = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org`, { signal: AbortSignal.timeout(5000) });
        const d: any = await g.json();
        if (d.status === 'success') {
          return [
            `IP: ${ip}`,
            `Country: ${d.country}`,
            `Region: ${d.regionName}`,
            `City: ${d.city}`,
            `ISP: ${d.isp}`,
            `Org: ${d.org}`,
          ].join('\n');
        }
      } catch (_) {}
      return `IP: ${ip}`;
    }

    // Check local database first
    const dbEntry = await storage.lookupResolverEntry(name);
    if (dbEntry) {
      const info = await geoLookup(dbEntry.ip);
      res.type('text/plain').send(info);
      return;
    }

    let found: string | null = null;
    const sourceNames = ['L3P','Psychotic','Psychotic V2','Lanc','X-Resolver','Resolver.lol','Octosniff','Snusbase'];
    for (let i = 0; i < resolvers.length; i++) {
      try {
        const ip = await resolvers[i]();
        if (ip && ip.match(/\d+\.\d+\.\d+\.\d+/)) { found = ip; break; }
      } catch (_) {}
    }

    if (found) {
      // Auto-save successful external lookups to DB
      await storage.submitResolverEntry(name, found, 'auto', sourceNames[0]).catch(() => {});
      const info = await geoLookup(found);
      res.type('text/plain').send(info);
    } else {
      res.type('text/plain').send(`❌ No IP found for: ${name}`);
    }
  });

  // Submit IP to local resolver DB
  // BotGhost: GET /api/submit-ip/{gamertag}/{ip}?key=YOUR_API_KEY
  app.get('/api/submit-ip/:gamertag/:ip', async (req, res) => {
    if (!checkKey(req, res)) return;
    const { gamertag, ip } = req.params;
    if (!ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return res.type('text/plain').send('Invalid IP format. Use: 1.2.3.4');
    }
    await storage.submitResolverEntry(gamertag, ip, 'discord_user', 'manual');
    res.type('text/plain').send(`✅ Saved: ${gamertag} → ${ip} added to Galaxy DB`);
  });

  // ─── BotGhost /buy endpoints ────────────────────────────────────────────────

  const BUY_PLANS: Record<string, { label: string; usd: number; btc: string; type: string }> = {
    monthly:       { label: '1 Month Access',       usd: 20, btc: '0.00020', type: 'monthly' },
    lifetime:      { label: 'Lifetime Access',       usd: 35, btc: '0.00035', type: 'lifetime' },
    lifetime_guide:{ label: 'Lifetime Access + Guide', usd: 45, btc: '0.00045', type: 'lifetime' },
  };
  const BTC_ADDRESS = 'bc1qlx7wdngc04vgdup90mh7rdd7x7u50mcj9vt5qx';

  // Step 1 — return payment details
  // BotGhost: GET /api/buy/details/{option_plan}?key=YOUR_API_KEY
  app.get('/api/buy/details/:plan', async (req, res) => {
    if (!checkKey(req, res)) return;
    const plan = (req.params.plan || '').toLowerCase().replace(/\s+/g, '_');
    const p = BUY_PLANS[plan];
    if (!p) {
      return res.type('text/plain').send(`❌ Invalid plan "${req.params.plan}". Choose: monthly, lifetime, or lifetime_guide`);
    }
    res.type('text/plain').send(
      `**Plan:** ${p.label}\n**Price:** $${p.usd}.00 USD | ${p.btc} BTC\n\n**Bitcoin Address:**\n\`${BTC_ADDRESS}\`\n\nSend EXACTLY **${p.btc} BTC** to the address above.\nOnce sent, run **/paid plan:${plan}** to notify the owner.\nAccess is granted after blockchain confirmation (5–15 min).`
    );
  });

  // Also support query string version as fallback
  app.get('/api/buy/details', async (req, res) => {
    if (!checkKey(req, res)) return;
    const plan = (req.query.plan as string || '').toLowerCase().replace(/\s+/g, '_');
    const p = BUY_PLANS[plan];
    if (!p) {
      return res.type('text/plain').send(`❌ Invalid plan "${req.query.plan}". Choose: monthly, lifetime, or lifetime_guide`);
    }
    res.type('text/plain').send(
      `**Plan:** ${p.label}\n**Price:** $${p.usd}.00 USD | ${p.btc} BTC\n\n**Bitcoin Address:**\n\`${BTC_ADDRESS}\`\n\nSend EXACTLY **${p.btc} BTC** to the address above.\nOnce sent, run **/paid plan:${plan}** to notify the owner.\nAccess is granted after blockchain confirmation (5–15 min).`
    );
  });

  // Step 2 — user claims they've paid; DMs the owner
  // BotGhost: GET /api/buy/notify?plan={option_plan}&discord_id={user_id}&tag={username}&key=YOUR_API_KEY
  app.get('/api/buy/notify', async (req, res) => {
    if (!checkKey(req, res)) return;
    const plan  = (req.query.plan as string || '').toLowerCase().replace(/\s+/g, '_');
    const discordId = req.query.discord_id as string || 'unknown';
    const tag   = req.query.tag as string || 'unknown';
    const p = BUY_PLANS[plan];
    const planLabel = p ? p.label : plan;

    await dmOwner({
      title: '💰 New Bitcoin Payment Claim',
      description: 'A user has claimed they sent a Bitcoin payment and is awaiting access.',
      fields: [
        { name: 'User', value: `${tag} (<@${discordId}>)`, inline: true },
        { name: 'User ID', value: `\`${discordId}\``, inline: true },
        { name: 'Plan', value: `**${planLabel}**`, inline: true },
        { name: 'BTC Address', value: `\`${BTC_ADDRESS}\``, inline: false },
        { name: 'Action', value: `Check the blockchain, then run \`/giveaccess\` to grant access.`, inline: false },
      ],
    });

    res.type('text/plain').send(
      `✅ Payment claim submitted for **${planLabel}**!\n\nThe owner will verify your Bitcoin transaction on the blockchain and grant your access shortly (usually 5–15 min).\n\nDo NOT send again — just wait for confirmation.`
    );
  });

  // Xbox Receipt — generates a Microsoft-style receipt image and returns a hosted URL
  // BotGhost: GET /api/xbox-receipt?date=2024-03-15&amount=39.99&email=x@x.com&item=Fortnite&key=...
  // Response: plain-text URL like https://your-replit.dev/receipts/abc123.png
  // Post that URL as a Discord message — Discord will auto-embed the image
  app.get('/api/xbox-receipt', async (req, res) => {
    if (!checkKey(req, res)) return;
    const date     = req.query.date as string || '2001-01-01';
    const amount   = req.query.amount as string || '0.00';
    const email    = req.query.email as string || 'user@email.com';
    const itemName = req.query.item as string || "Fortnite - Standard Founder's Pack";
    try {
      const img = await generateXboxReceipt({ date, amount, email, itemName });

      // Save to disk with a unique filename
      const filename = `receipt_${randomBytes(8).toString('hex')}.png`;
      const filePath = path.join(RECEIPTS_DIR, filename);
      fs.writeFileSync(filePath, img);

      // Delete after 10 minutes to avoid build-up
      setTimeout(() => { try { fs.unlinkSync(filePath); } catch {} }, 10 * 60 * 1000);

      // Build the public URL — works for both dev Replit URL and production
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const imageUrl = `${protocol}://${host}/receipts/${filename}`;

      res.type('text/plain').send(imageUrl);
    } catch (err) {
      res.status(400).type('text/plain').send('❌ Error generating receipt. Check date format (YYYY-MM-DD).');
    }
  });

  // ─── End BotGhost /buy endpoints ────────────────────────────────────────────

  // Xbox IP Resolver — JSON fields for BotGhost embed
  // BotGhost: GET /api/xbox-resolve/{gamertag}?key=YOUR_API_KEY
  app.get('/api/xbox-resolve/:gamertag', async (req, res) => {
    if (!checkKey(req, res)) return;
    const gamertag = req.params.gamertag;

    const resolverNetworks: Array<() => Promise<string | null>> = [
      // Galaxy DB first
      async () => {
        const entry = await storage.lookupResolverEntry(gamertag);
        return entry ? entry.ip : null;
      },
      async () => {
        const r = await fetch(`https://api.l3p.xyz/resolver/xbl/${encodeURIComponent(gamertag)}`, { signal: AbortSignal.timeout(6000) });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.resolved_ip || (d.data?.ip) || null;
      },
      async () => {
        const r = await fetch(`https://api.psychotic.pro/resolve/xbl/${encodeURIComponent(gamertag)}`, { signal: AbortSignal.timeout(6000) });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.Address || d.resolved_ip || null;
      },
      async () => {
        const r = await fetch(`https://psychotic.pro/api/v2/resolve/xbl/${encodeURIComponent(gamertag)}`, { signal: AbortSignal.timeout(6000) });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.resolved_ip || null;
      },
      async () => {
        const r = await fetch(`https://lanc-remastered.net/api/v1/resolve/xbl/${encodeURIComponent(gamertag)}`, { signal: AbortSignal.timeout(6000) });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.resolved_ip || null;
      },
      async () => {
        const r = await fetch(`https://x-resolver.com/api/v1/resolve/xbl/${encodeURIComponent(gamertag)}`, { signal: AbortSignal.timeout(6000) });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.resolved_ip || (d.resolved?.ip) || null;
      },
      async () => {
        const r = await fetch(`https://api.octosniff.net/resolve?type=xbl&username=${encodeURIComponent(gamertag)}`, { signal: AbortSignal.timeout(6000) });
        if (!r.ok) return null;
        const d = await r.json(); return d.ip || d.Address || null;
      },
    ];

    let ip: string | null = null;
    for (const resolver of resolverNetworks) {
      try {
        const result = await resolver();
        if (result && /\d+\.\d+\.\d+\.\d+/.test(result)) { ip = result; break; }
      } catch (_) {}
    }

    if (!ip) {
      return res.json({
        gamertag,
        found: false,
        ip: null,
        country: null,
        region: null,
        city: null,
        isp: null,
        org: null,
        message: `❌ No IP found for: ${gamertag}`,
      });
    }

    // Auto-save to Galaxy DB
    await storage.submitResolverEntry(gamertag, ip, 'auto', 'xbox-resolve').catch(() => {});

    // Geo lookup
    let country = 'N/A', region = 'N/A', city = 'N/A', isp = 'N/A', org = 'N/A';
    try {
      const g = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org`, { signal: AbortSignal.timeout(5000) });
      const geo: any = await g.json();
      if (geo.status === 'success') {
        country = geo.country || 'N/A';
        region = geo.regionName || 'N/A';
        city = geo.city || 'N/A';
        isp = geo.isp || 'N/A';
        org = geo.org || 'N/A';
      }
    } catch (_) {}

    res.json({
      gamertag,
      found: true,
      ip,
      country,
      region,
      city,
      isp,
      org,
      message: `✅ IP found for: ${gamertag}`,
    });
  });

  // AOV Script Generator — Xbox
  // BotGhost: GET /api/aov/xbox/{gamertag}/{ip}?key=YOUR_API_KEY
  app.get('/api/aov/xbox/:gamertag/:ip', async (req, res) => {
    if (!checkKey(req, res)) return;
    const { gamertag, ip } = req.params;

    let location = 'Unknown, Unknown';
    let isp = 'Unknown ISP';
    let email = 'Not Found';

    try {
      const ipRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp`);
      const ipData: any = await ipRes.json();
      if (ipData.status === 'success') {
        location = `${ipData.country}, ${ipData.regionName}, ${ipData.city}`;
        isp = ipData.isp || 'Unknown ISP';
      }
    } catch (_) {}

    if (process.env.Authorization) {
      try {
        const snusRes = await fetch('https://api.snusbase.com/data/search', {
          method: 'POST',
          headers: { 'Auth': process.env.Authorization, 'Content-Type': 'application/json' },
          body: JSON.stringify({ terms: [gamertag], types: ['username'], wildcard: false })
        });
        if (snusRes.ok) {
          const snusData: any = await snusRes.json();
          for (const src in (snusData.results || {})) {
            const entry = snusData.results[src].find((r: any) => r.email);
            if (entry) { email = entry.email; break; }
          }
        }
      } catch (_) {}
    }

    const script = [
      `✅ AOV Created for: ${gamertag}`,
      ``,
      `📡 IP & Location`,
      `IP: ${ip}`,
      `Location: ${location}`,
      `ISP: ${isp}`,
      ``,
      `🎮 Xbox Gamertag: ${gamertag}`,
      ``,
      `📩 Email: ${email}`,
      ``,
      `📄 AOV Script`,
      `Hello Epic Games, my IP is ${ip}.`,
      `My Xbox gamertag is ${gamertag}.`,
      `My purchases near ${location}.`,
      `I never used my Credit Card for any purchases on Fortnite.`,
      `I only paid my purchases using Xbox Account balance, therefore there are no invoice ids.`,
      `Below I have attached a screenshot of my oldest purchase.`,
      `Thank you for your help, I hope I will hear from you soon.`
    ].join('\n');

    res.type('text/plain').send(script);
  });

  // AOV Script Generator — PSN
  // BotGhost: GET /api/aov/psn/{psn_name}/{ip}?key=YOUR_API_KEY
  app.get('/api/aov/psn/:psn_name/:ip', async (req, res) => {
    if (!checkKey(req, res)) return;
    const { psn_name, ip } = req.params;

    let location = 'Unknown, Unknown';
    let isp = 'Unknown ISP';

    try {
      const ipRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp`);
      const ipData: any = await ipRes.json();
      if (ipData.status === 'success') {
        location = `${ipData.country}, ${ipData.regionName}, ${ipData.city}`;
        isp = ipData.isp || 'Unknown ISP';
      }
    } catch (_) {}

    const script = [
      `✅ AOV Created for: ${psn_name}`,
      ``,
      `📡 IP & Location`,
      `IP: ${ip}`,
      `Location: ${location}`,
      `ISP: ${isp}`,
      ``,
      `🎮 PSN ID: ${psn_name}`,
      ``,
      `📄 AOV Script`,
      `Hello Epic Games, my IP is ${ip}.`,
      `My first Epic Games username was ${psn_name}.`,
      `My purchases near ${location}.`,
      `I never used my Credit Card for any purchases on Fortnite.`,
      `I only paid my purchases using PlayStation Account balance, therefore there are no invoice ids.`,
      `Below I have attached a screenshot of my oldest purchase.`,
      `Thank you for your help, I hope I will hear from you soon.`
    ].join('\n');

    res.type('text/plain').send(script);
  });

  // Xbox Lookup — full OSINT card (BotGhost compatible, plain text)
  // BotGhost: GET /api/xbox-lookup/{gamertag}?key=YOUR_API_KEY
  app.get('/api/xbox-lookup/:gamertag', async (req, res) => {
    if (!checkKey(req, res)) return;
    const { gamertag } = req.params;
    const xblKey = process.env.XBL_IO_API_KEY || process.env.XBL_TOKEN || '';

    // ── 1. Xbox profile via xbl.io ───────────────────────────────────────────
    let xuid = '', bio = 'null', realName = 'null', gamerpicUrl = '';
    let presenceState = 'Offline', lastGame = 'N/A', device = 'N/A', lastSeen = 'N/A';
    let gamerscore = '0', gamertagResolved = gamertag;
    let followerCount = 'N/A';

    if (xblKey) {
      try {
        const profileRes = await fetch(
          `https://xbl.io/api/v2/friends/search?gt=${encodeURIComponent(gamertag)}`,
          { headers: { 'X-Authorization': xblKey, 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
        );
        if (profileRes.ok) {
          const pd: any = await profileRes.json();
          const user = (pd.profileUsers || pd.content?.profileUsers)?.[0];
          if (user) {
            xuid = user.id || '';
            const settings = user.settings || [];
            const getSetting = (id: string) => settings.find((s: any) => s.id === id)?.value;
            gamertagResolved = getSetting('Gamertag') || gamertag;
            gamerscore = getSetting('Gamerscore') || '0';
            bio = getSetting('Bio') || 'null';
            realName = getSetting('RealName') || 'null';
            gamerpicUrl = getSetting('GameDisplayPicRaw') || '';
            // Grab follower count if included in this response
            if (getSetting('FollowerCount') != null) followerCount = getSetting('FollowerCount')!;
          }
        }
      } catch (_) {}

      // ── 1b. Friends count via xbl.io /friends endpoint ───────────────────────
      if (xuid) {
        try {
          const frRes = await fetch(
            `https://xbl.io/api/v2/friends?xuid=${xuid}`,
            { headers: { 'X-Authorization': xblKey, 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) }
          );
          if (frRes.ok) {
            const frData: any = await frRes.json();
            const people = frData.people || frData.content?.people || frData.users || frData.friends || [];
            followerCount = Array.isArray(people) ? people.length.toString() : 'N/A';
          }
        } catch (_) {}
      }

      // ── 2. Presence / activity ───────────────────────────────────────────
      if (xuid) {
        try {
          const presRes = await fetch(
            `https://xbl.io/api/v2/presence/${xuid}`,
            { headers: { 'X-Authorization': xblKey, 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) }
          );
          if (presRes.ok) {
            const presRaw: any = await presRes.json();
            const pdata = presRaw.content || presRaw;
            presenceState = pdata.state || 'Offline';
            // Online: check active device/title
            const dev = pdata.devices?.[0];
            if (dev) {
              device = dev.type || device;
              const title = dev.titles?.[0];
              if (title) { lastGame = title.name || lastGame; lastSeen = title.lastModified || lastSeen; }
            }
            // Offline lastSeen block
            if (pdata.lastSeen) {
              if (pdata.lastSeen.deviceType) device = pdata.lastSeen.deviceType;
              if (pdata.lastSeen.titleName) lastGame = pdata.lastSeen.titleName;
              if (pdata.lastSeen.timestamp) lastSeen = pdata.lastSeen.timestamp;
              // If titleName empty but titleId present, resolve via title history
              if ((!lastGame || lastGame === 'N/A') && pdata.lastSeen.titleId) {
                try {
                  const histRes = await fetch(
                    `https://xbl.io/api/v2/player/titleHistory/${xuid}`,
                    { headers: { 'X-Authorization': xblKey, 'Accept': 'application/json', 'Accept-Language': 'en-US' }, signal: AbortSignal.timeout(6000) }
                  );
                  if (histRes.ok) {
                    const histRaw: any = await histRes.json();
                    const titles = histRaw.content?.titles || histRaw.titles || [];
                    const match = titles.find((t: any) => String(t.titleId) === String(pdata.lastSeen.titleId));
                    if (match?.name) lastGame = match.name;
                    else if (titles[0]?.name) lastGame = titles[0].name;
                  }
                } catch (_) {}
              }
            }
          }
        } catch (_) {}
      }

      // ── 2b. Title history for last game (fallback if still N/A) ────────────
      if (xuid && (lastGame === 'N/A' || !lastGame)) {
        try {
          const histRes = await fetch(
            `https://xbl.io/api/v2/player/titleHistory/${xuid}`,
            { headers: { 'X-Authorization': xblKey, 'Accept': 'application/json', 'Accept-Language': 'en-US' }, signal: AbortSignal.timeout(6000) }
          );
          if (histRes.ok) {
            const histRaw: any = await histRes.json();
            const titles = histRaw.content?.titles || histRaw.titles || [];
            if (titles[0]?.name) lastGame = titles[0].name;
          }
        } catch (_) {}
      }
    }

    // ── 3. Fortnite stats via fortnite-api.com ──────────────────────────────
    let epicDisplayName = 'Not Linked', epicAccountId = 'N/A', epicFriends = 'N/A', epicBattlePass = 'N/A';
    let fnTotalMatches = 'N/A', fnLastPlayed = 'N/A', fnMinutesPlayed = 'N/A', fnWins = 'N/A', fnKills = 'N/A';
    let linkedXbox = gamertagResolved, linkedSteam = 'N/A', linkedPsn = 'N/A';

    const fnApiKey = process.env.FORTNITE_API_KEY || '';
    if (fnApiKey) {
      try {
        // Lookup by Xbox gamertag (accountType=xbl)
        const fnRes = await fetch(
          `https://fortnite-api.com/v2/stats/br/v2?name=${encodeURIComponent(gamertag)}&accountType=xbl`,
          { headers: { 'Authorization': fnApiKey }, signal: AbortSignal.timeout(10000) }
        );
        if (fnRes.ok) {
          const fnData: any = await fnRes.json();
          const d = fnData.data;
          if (d) {
            // Account info
            epicDisplayName = d.account?.name || gamertag;
            epicAccountId = d.account?.id || 'N/A';
            epicBattlePass = d.battlePass?.level?.toString() || 'N/A';

            // Overall stats (all input types combined)
            const overall = d.stats?.all?.overall;
            if (overall) {
              fnTotalMatches = overall.matches?.toString() || 'N/A';
              fnWins = overall.wins?.toString() || 'N/A';
              fnKills = overall.kills?.toString() || 'N/A';
              fnMinutesPlayed = overall.minutesPlayed?.toString() || 'N/A';
              fnLastPlayed = overall.lastModified || 'N/A';
            }
          }
        }
      } catch (_) {}

      // Linked platforms via prod.api-fortnite.com
      const prodFnKey = process.env.PROD_FORTNITE_API_KEY || '';
      if (prodFnKey) {
        try {
          const extRes = await fetch(
            `https://prod.api-fortnite.com/api/v1/account/external/xbl/displayName/${encodeURIComponent(gamertag)}`,
            { headers: { 'x-api-key': prodFnKey }, signal: AbortSignal.timeout(8000) }
          );
          if (extRes.ok) {
            const extData: any = await extRes.json();
            // Response: array of accounts — grab first
            const account = Array.isArray(extData) ? extData[0] : extData;
            if (account) {
              // externalAuths is an object keyed by platform type e.g. { xbl: {...}, steam: {...}, psn: {...} }
              const authsObj = account.externalAuths || {};
              for (const [platform, auth] of Object.entries(authsObj) as [string, any][]) {
                const t = platform.toLowerCase();
                const name = auth.externalDisplayName || auth.displayName || auth.externalAuthId || 'Linked';
                if (t === 'steam') linkedSteam = name;
                if (t === 'psn' || t === 'playstation') linkedPsn = name;
                if (t === 'xbl' || t === 'xbox') linkedXbox = name;
              }
              // Also pick up top-level displayName as Epic display name if not already set
              if (account.displayName && epicDisplayName === 'N/A') {
                epicDisplayName = account.displayName;
              }
            }
          }
        } catch (_) {}
      }
    }

    // ── 4. Return as JSON fields for BotGhost embed mapping ──────────────────
    res.json({
      gamertag: gamertagResolved,
      // Epic Games Info
      epic_display_name: epicDisplayName,
      epic_account_id: epicAccountId,
      epic_battle_pass: epicBattlePass,
      epic_friends: epicFriends,
      // Xbox Info
      xuid: xuid || 'N/A',
      gamerscore,
      bio,
      real_name: realName,
      profile_pic: gamerpicUrl || null,
      follower_count: followerCount,
      // Presence Activity
      presence_state: presenceState,
      last_game: lastGame,
      device,
      last_seen: lastSeen,
      // Stats
      total_matches: fnTotalMatches,
      wins: fnWins,
      kills: fnKills,
      minutes_played: fnMinutesPlayed,
      last_played: fnLastPlayed,
      // Linked Platforms
      linked_xbox: linkedXbox,
      linked_steam: linkedSteam,
      linked_psn: linkedPsn,
      linked_epic: epicDisplayName !== 'Not Linked' ? epicDisplayName : 'N/A',
    });
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
