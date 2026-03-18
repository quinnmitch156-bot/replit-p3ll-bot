# Galaxy Bot

A Discord bot for Epic Games / Xbox / PSN account OSINT, Fortnite stats, receipts, and subscription management.

## Commands

### Xbox
- `/check_xbox [gamertag]` — Full Xbox profile + linked platforms (Epic/PSN/Nintendo/Steam) + xbl.io lookup count
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
| `XBL_IO_API_KEY` | xbl.io API key for Xbox lookup counts |
| `Authorization` | Snusbase API key for OSINT commands |
| `BOT_ACCESS_ROLE_ID` | Discord role ID that bypasses subscription check |
| `OWNER_ID` | Discord user ID of the bot owner |
| `STRIPE_SECRET_KEY` | Stripe key for card payment verification |
| `XBL_TOKEN` | Xbox Live token for Xbox service |

## Epic Auth — 24/7 Setup
Epic Bearer tokens expire every 8 hours. To make Epic APIs work permanently:
1. Put a fresh Bearer token in `EPIC_AUTH`
2. Run `/setup_epic` in Discord (owner only)
3. Copy the 3 values it gives you into secrets: `EPIC_ACCOUNT_ID`, `EPIC_DEVICE_ID`, `EPIC_DEVICE_SECRET`
4. The bot will auto-refresh its token forever — no manual updates needed

## Architecture
- **Backend**: Express + Drizzle ORM (`server/`)
- **Frontend**: React + Vite (`client/`)
- **Shared**: Schema & API routes (`shared/`)
- **Epic Auth Service**: `server/services/epicAuth.ts` — handles Device Auth token refresh
- **Xbox Service**: `server/services/xbox.ts`
- **Fortnite Service**: `server/services/fortnite.ts`
