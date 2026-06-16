---
name: Fortnite auth-code BotGhost endpoints
description: Per-request Epic authorization_code endpoints (account-info, ban-date, support-us) vs the bot's own persistent auth
---

# Fortnite auth-code endpoints (BotGhost)

`server/services/fortniteAuthCode.ts` + `POST /api/fortnite/{account-info,ban-date,support-us}` in routes.ts.

- These take a **user-supplied Epic authorization code per request** and exchange it on the fly
  (transient). This is DISTINCT from `epicAuth.ts`, which holds the *bot's own* persistent
  device/refresh auth. Do not conflate the two.
- account-info uses the launcher token (account public service). ban-date + support-us need the
  **Fortnite PC JWT** (launcher -> exchange -> exchange_code with FN client) — use `getFortniteToken`.
- ban-date reads `ban_end_date`/`ban_reason` from the `common_core` profile QueryProfile stats.
- support-us sets Support-A-Creator via `SetAffiliateName` (creator code from `CREATOR_CODE` env, default "xstarsx").
- Responses are `{ message: "..." }` text (BotGhost-friendly), HTTP 200 even on Epic failure.
- All are `?key=TOKEN_API_KEY` protected (they expose email/2FA and can mutate the account).
- **Why ported here:** the originals lived in a separate repl behind a temporary `*.replit.dev`
  dev URL (dies when that repl sleeps); consolidating onto the published app makes them 24/7.
