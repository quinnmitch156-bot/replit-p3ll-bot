---
name: Xbox Game DVR clips via xbl.io
description: What xbl.io can/can't return for another account's game clips, and why
---

# Xbox Game DVR clips (xbl.io)

Fetching another Xbox account's published game clips IS possible via xbl.io:
`GET /api/v2/dvr/gameclips/{xuid}` (resolve gamertag→xuid via `/search/{gamertag}` first).
Verified working: returns real clips for accounts with current published clips
(e.g. "Major Nelson" returned 4). Each clip has `gameClipUris[0].uri` (playable
video), `thumbnails[].uri`, `titleName`, `datePublished`, `durationInSeconds`, `views`.

**Why most lookups return 0 clips (NOT a bug):**
- Microsoft deletes clips older than ~90 days unless the user saved them → old
  (2017/2018 "OG") clips are essentially always gone from Microsoft's side. This
  is why gamerdvr.com / xboxclips appear "patched."
- Only clips the user *published* and that are still *public* are returned.
- Post-March-2021 screenshots are marked "unpublished" and are not retrievable for
  other users at all.

**Dead ends (don't retry these):**
- `dvr/gameclips/xuid/{xuid}`, `player/clips/{xuid}`, `activity/{xuid}`,
  `player/activity/{xuid}`, `activity/history/{xuid}` → all return `NOT_FOUND`.
- `api.xboxreplay.net` public API → dead (Vercel DEPLOYMENT_NOT_FOUND).
- The `@xboxreplay/xboxlive-api` npm activity-history path needs a real XSTS token
  (own MS account auth), not an xbl.io key.

Implementation: `fetchGameClips()` in `server/services/xbox.ts`, `/xbox_clips`
command in `server/bot.ts`.
