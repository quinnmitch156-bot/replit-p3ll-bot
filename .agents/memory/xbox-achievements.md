---
name: Xbox / Fortnite Gunsmith achievement via xbl.io
description: Real Gunsmith lookup uses the Fortnite Save-the-World Xbox title id
---

# Fortnite Gunsmith achievement IS real on Xbox (via Save the World)

**Correcting an earlier wrong assumption:** Fortnite *Battle Royale* has no Xbox achievements, but Fortnite *Save the World* (the original 2017 paid PvE title) DOES — and "Gunsmith" is one of its achievements. OG accounts unlocked it in late 2017, which is why it's used as an account-age signal.

**The Fortnite Xbox title id with achievements is `267695549`.** A player can have TWO Fortnite entries in xbl.io titles: `267695549` (Save the World, has achievements) and `1820250788` (0 achievements — ignore it). Hardcode `267695549`.

**Real Gunsmith lookup flow** (`fetchGunsmith()` in `server/routes.ts`, behind `/api/achievements` and `/api/achievements/date`):
1. gamertag → XUID via `https://xbl.io/api/v2/search/{gamertag}` → `content.people[].xuid`. Use `/search`, NOT `/friends/search` (the latter is much more aggressively rate-limited).
2. `https://xbl.io/api/v2/achievements/player/{xuid}/267695549` → find achievement where name == "gunsmith"; unlock date is `progression.timeUnlocked` (ISO like `2017-12-01T21:26:23.6940000Z`), unlocked when `progressState === 'Achieved'`.

**xbl.io shared-key limit:** 60 req / 5 min (`{code:429, content:{currentRequests,maxRequests}}`). Don't hammer it while testing; a real 429 looks like "gamertag not found" if you don't surface it. Status-aware error messages live in `fetchGunsmith`.

**Dev gotcha:** after editing these routes, the running tsx/Vite server may keep serving the OLD handler — if a "real" endpoint returns values that change every call (random 2017 dates), the new code didn't load. Explicitly `restart_workflow` and wait ~4s before curling.
