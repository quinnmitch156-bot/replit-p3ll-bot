# Scout Bot

A Discord bot for Fortnite and Xbox lookups, featuring subscription management and payment integration.

## Features
- **Discord Bot**:
  - `/lookup [platform] [username]`: Fetch Fortnite stats or Xbox profile.
  - `/buy`: Purchase access (Mock/Stripe integration).
  - `/redeem [key]`: Redeem access keys.
  - `/info`: Check subscription status.
- **Web Dashboard**:
  - View subscription status.
  - Redeem keys.
  - Admin tools (API access needed).

## Setup
1. **Secrets**: Ensure `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `FORTNITE_API_IO_KEY`, `XBL_TOKEN` are set.
2. **Database**: Managed via Drizzle ORM (`npm run db:push`).
3. **Bot**: Starts automatically with the server (`npm run dev`).

## Development
- **Backend**: Express + Drizzle (`server/`)
- **Frontend**: React + Vite (`client/`)
- **Shared**: Schema & API routes (`shared/`)

## Initial Keys
The database is seeded with:
- `SCOUT-LIFETIME-ADMIN`
- `SCOUT-MONTHLY-TEST`
