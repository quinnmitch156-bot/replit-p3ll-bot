---
name: Epic "original platform / original name" check
description: How to determine the platform an Epic account was originally made on
---

# Epic account "originally made on" = earliest external-auth dateAdded

The "Original Name Check" feature (BotGhost `/api/original-name?name=`, native `/original_name`) answers two things for an Epic account: what platform it was **originally made on**, and whether the current Epic display name is still the **original** name.

**The only source of the `dateAdded` signal is Epic's token-gated endpoint** `GET https://account-public-service-prod.ol.epicgames.com/account/api/public/account/{accountId}/externalAuths` (Bearer token from `getEpicAccessToken`). Each linked platform entry has `type` (xbl/psn/steam/…), `externalDisplayName`, and `dateAdded`. The entry with the **earliest dateAdded** = the platform the account was originally created on. If there are no dated external auths, the account was made directly on Epic/PC.

**IMPORTANT — prod.api-fortnite.com does NOT return dateAdded.** Its `/api/v1/account/external/{plat}/displayName/{name}` (key `x-api-key: PROD_FORTNITE_API_KEY`, token-free) only returns `id`, `displayName`, and `externalAuths` with `type`/`externalDisplayName`/`externalAuthId` — no dates. Use it only to resolve a console gamertag → Epic account id without a token; you still need the Epic OAuth endpoint above for the date.

**"Original Name: Yes/No" heuristic:** current Epic `displayName` (case-insensitive) equals the earliest external auth's `externalDisplayName` → the user never renamed away from their original console name. This is an inferred heuristic, not an Epic-provided flag.

**Hard dependency / recurring pain:** this needs a valid Epic Bearer (`EPIC_AUTH`), which rotates every ~8h. When it's expired the endpoint returns HTTP 401/403 and the feature (and every other Epic command) is down. Permanent fix is device auth via `/setup_epic` (sets EPIC_ACCOUNT_ID/EPIC_DEVICE_ID/EPIC_DEVICE_SECRET) — but those secrets were NOT configured as of this work, so the bot was relying on the manual expiring token.
