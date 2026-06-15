---
name: PSN api (psn-api package) gotchas
description: PlayStation Network lookup constraints, auth, and privacy model for /psn_lookup
---

# PSN lookup via `psn-api`

## Privacy model (the big one)
For **other** accounts, `getUserTrophyProfileSummary`, `getUserTitles`, `getBasicPresence`,
and `getUserFriendsAccountIds` return error code 2240526 **"Not permitted by access control"**
UNLESS the target is a **friend of the NPSSO account** OR has set that data's privacy to "Anyone".
- **Why:** Sony gates trophies/presence/friends/titles behind friendship or public privacy. This is NOT a bug.
- **How to apply:** Always wrap enrichment in `Promise.allSettled` and degrade to N/A. Always-public
  fields (work for anyone): onlineId, accountId, avatar, aboutMe, PS Plus, verified, country —
  available via `makeUniversalSearch` socialMetadata + `getProfileFromAccountId`.
- To prove the rich path works, look up a **friend** of the NPSSO account (friendship grants access).

## Auth
- All functions take `(authorization, accountId, options?)`. `authorization = { accessToken }`.
- Flow: NPSSO secret → `exchangeNpssoForAccessCode` → `exchangeAccessCodeForAuthTokens`.
  Persist the refresh token to disk and prefer `exchangeRefreshTokenForAuthTokens` on subsequent
  calls (access token ~1h, refresh token ~2 months). Refresh-token files MUST be in `.gitignore`.
- `getProfileFromAccountId(auth, 'me')` → "Bad Request" (needs a real accountId), but trophy/title/
  presence/friends endpoints DO accept `'me'` for the authenticated account.
- `getAccountDevices` only works for the authenticated user — do not use it for lookups. Infer
  devices from presence platform + trophy-title platforms instead.

## Testing in this Replit env
- tsx test scripts must live INSIDE the workspace (not /tmp) so they resolve node_modules.
- Run with `timeout 50 npx tsx ./file.ts > /tmp/out.txt 2>&1` then cat the file (direct stdout buffers/empties).
- PSN hosts (m.np.playstation.com) are reachable; occasional transient UND_ERR_CONNECT_TIMEOUT — add retries.
