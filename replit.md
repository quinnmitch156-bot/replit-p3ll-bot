# Galaxy Bot

A Discord bot for Epic Games / Xbox / PSN account OSINT, Fortnite stats, receipts, and subscription management.

## Commands

### Xbox
- `/check_xbox [gamertag]` — Full Xbox profile + linked platforms (Epic/PSN/Nintendo/Steam) + xbl.io lookup count
- `/xbox_clips [gamertag]` — Account's published Game DVR clips (latest 10, with watch links) via xbl.io. Only returns clips the user published that are still public; Xbox deletes clips older than ~90 days, so old (2017/2018) clips are typically gone
- `/xbox_ip [gamertag]` — Resolve Xbox gamertag to IP via multi-resolver network
- `/xbox_friends [gamertag]` — Xbox friends list sorted by online status
- `/xbox_aov [gamertag] [ip]` — Generate Xbox AOV script
- `/xbox_vbucks_receipt` — Generate Xbox V-Bucks receipt
- `/xbox_stw_receipt` — Generate Xbox STW receipt

### Epic / Fortnite
- `/epic_lookup [username]` — Full Epic Games account info + all linked platforms
- `/epic_friends [username]` — Epic Games friends list with display names
- `/fortnite_stats [username]` — Fortnite BR stats (solo/duo/squad wins, matches, kills)

### PSN
- `/psn_lookup [gamertag]` — Full PSN profile: avatar, account ID, about me, online status/now playing, region, trophies, friends, linked devices, recent games (trophies/presence/friends only visible if the target is a friend of the bot's PSN account or has privacy set to "Anyone" — a Sony restriction)
- `/psn_ip [psn_id]` — Resolve PSN ID to IP
- `/psn_aov [psn_name] [ip]` — Generate PSN AOV script
- `/psn_vbucks_receipt` — Generate PSN V-Bucks receipt
- `/psn_stw_receipt` — Generate PSN STW receipt

### OSINT
- `/osint_email [email]` — Snusbase lookup by email
- `/osint_username [username]` — Snusbase lookup by username
- `/osint_ip [ip]` — Snusbase lookup by IP
- `/iplookup [ip]` — IP geolocation & ISP info
- `/locate [gamertag]` — Geo-locate an Xbox account

### Misc
- `/bomb [email] [amount]` — Marketing email bomb
- `/buy` — Purchase bot access (PayPal: federalisgone@gmail.com / Stripe)
- `/redeem [key]` — Activate subscription key
- `/check-access [user]` — Check if a member has access
- `/giveaccess [user] [tier]` — Give a member access (Owner only)
- `/revoke [user]` — Revoke a member's access (Owner only)
- `/setup_epic` — Generate permanent Epic Device Auth credentials (Owner only)

## Required Secrets
| Secret | Purpose |
|---|---|
| `DISCORD_TOKEN` | Discord bot token |
| `DISCORD_CLIENT_ID` | Discord application ID |
| `EPIC_AUTH` | Epic Games Bearer token (rotates every 8h; use /setup_epic for permanent auth) |
| `EPIC_ACCOUNT_ID` | Device Auth — Epic account ID (permanent) |
| `EPIC_DEVICE_ID` | Device Auth — device ID (permanent) |
| `EPIC_DEVICE_SECRET` | Device Auth — device secret (permanent) |
| `NPSSO` | PlayStation NPSSO token for `/psn_lookup` (auto-refreshes; refresh token persisted to `.psn_refresh_token`) |
| `XBL_IO_API_KEY` | xbl.io API key for Xbox lookup counts |
| `Authorization` | Snusbase API key for OSINT commands |
| `BOT_ACCESS_ROLE_ID` | Discord role ID that bypasses subscription check |
| `OWNER_ID` | Discord user ID of the bot owner |
| `STRIPE_SECRET_KEY` | Stripe key for card payment verification |
| `XBL_TOKEN` | Xbox Live token for Xbox service |
| `PROD_FORTNITE_API_KEY` | prod.api-fortnite.com API key for linked platforms (Steam/PSN/Xbox) |

## Epic Auth — 24/7 Setup
Epic Bearer tokens expire every 8 hours. To make Epic APIs work permanently:
1. Put a fresh Bearer token in `EPIC_AUTH`
2. Run `/setup_epic` in Discord (owner only)
3. Copy the 3 values it gives you into secrets: `EPIC_ACCOUNT_ID`, `EPIC_DEVICE_ID`, `EPIC_DEVICE_SECRET`
4. The bot will auto-refresh its token forever — no manual updates needed

## Vanguard News Website (frontend)
The web frontend is a standalone professional gaming news site ("Vanguard") with 4 sections: Gaming News, Esports, Technology, Community Updates. It is separate from the Discord bot (which runs in the background).
- **Pages** (`client/src/pages/`): `Home` (featured hero + latest + per-section rows), `Section` (`/section/:slug`), `Article` (`/article/:slug`), `SearchResults` (`/search?q=`)
- **Components** (`client/src/components/`): `Navbar` (nav + search), `Footer`, `ArticleCard`, `Layout`
- **Sections config**: `client/src/lib/sections.ts` (slugs: `gaming-news`, `esports`, `technology`, `community-updates`)
- **Public API** (no key required, in `server/routes.ts`): `GET /api/articles?section=&q=&limit=`, `GET /api/articles/featured`, `GET /api/articles/:slug`
- **Data**: `articles` table in `shared/schema.ts`; CRUD in `server/storage.ts`; sample content seeded on startup via `server/seedArticles.ts` (seeds only when table is empty)

## Architecture
- **Backend**: Express + Drizzle ORM (`server/`)
- **Frontend**: React + Vite (`client/`)
- **Shared**: Schema & API routes (`shared/`)
- **Epic Auth Service**: `server/services/epicAuth.ts` — handles Device Auth token refresh
- **Xbox Service**: `server/services/xbox.ts`
- **Fortnite Service**: `server/services/fortnite.ts`
