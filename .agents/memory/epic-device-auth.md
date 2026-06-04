---
name: Epic 24/7 device auth
description: Which Epic OAuth client to use for permanent device-auth tokens, and why
---

## Goal
Make Epic APIs work permanently without manual 8-hour token rotation. Refresh tokens are single-use/rotating, so dev + prod sharing one token causes `TOKEN_NOT_FOUND`/`invalid_grant`. Device auth does NOT rotate and can be used by multiple instances at once.

## Client choice (the hard-won lesson)
Device auth must be created with — and consumed with — a client that holds the `account:public:account:deviceAuths CREATE` scope:
- **Fortnite PC** (`ec684b8c...`): can get tokens but LACKS deviceAuths CREATE → fails.
- **Fortnite iOS** (`3446cd72...`): historically had the scope but is now **disabled by Epic** (`errors.com.epicgames.account.client_disabled`, 18014) → fails.
- **Fortnite Android** (`ANDROID_ID` / `ANDROID_SECRET` constants in `server/services/epicAuth.ts`): works, has the scope. **Use this.**

**Why:** burned several one-time auth codes discovering iOS was disabled and PC lacks the scope.

## Flow
auth code (from launcher client redirect) → launcher token (consumes the code) → exchange_code → **Android** client token → POST deviceAuth. Store `EPIC_ACCOUNT_ID` / `EPIC_DEVICE_ID` / `EPIC_DEVICE_SECRET` as secrets. `getEpicAccessToken` uses the `device_auth` grant with the **Android** Basic auth (must match the client that created it).

## How to apply
Each failed attempt burns a fresh auth code (consumed at the launcher-token step), so be confident about the client before asking the user for a code. Auth code source: `https://www.epicgames.com/id/api/redirect?clientId=34a02cf8f4414e29b15921876da36f9a&responseType=code`.
