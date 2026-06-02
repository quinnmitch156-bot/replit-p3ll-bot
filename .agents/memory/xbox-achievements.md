---
name: Xbox achievements via xbl.io
description: How the real achievements lookup works and why Fortnite returns empty
---

# Real Xbox achievements use xbl.io, but Fortnite has none

`/api/achievements` and `/api/achievements/date` pull REAL achievements via `fetchXboxAchievements()`: resolve gamertag→XUID through `xbl.io /friends/search`, then `xbl.io /achievements/player/{xuid}`.

**Why Fortnite lookups come back empty:** Fortnite Battle Royale registers NO Xbox achievements / gamerscore. A Fortnite-only account legitimately returns "No unlocked achievements found." This is correct behavior, not a bug. Use the optional `&game=fortnite` filter only if you accept it will almost always be empty; general (all-title) lookups work for accounts that play other games.

**xbl.io shared-key rate limit:** 60 requests / 5 min (`code: 429` with `currentRequests/maxRequests`). Each achievements lookup costs 2 calls (search + achievements). A 2-min in-memory cache keyed by `xuid|gameFilter` plus status-aware error messages (429→rate-limited, 401/403→bad key, 5xx→upstream) live in `fetchXboxAchievements`. When debugging "gamertag not found", check for a real 429 first — don't hammer the key while testing.
