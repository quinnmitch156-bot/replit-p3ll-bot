---
name: Epic original-platform check
description: How the "original name / originally made on" check works and why it can no longer use link dates
---

## What it does
`fetchOriginalPlatform(name)` in `server/services/epicAccount.ts` resolves a name to an Epic account, then reports which console platform it's tied to and whether the Epic display name still matches that platform's name.

## Key constraint — dateAdded is self-only now
Epic's dedicated `GET /account/api/public/account/{id}/externalAuths` is the ONLY endpoint that returns `dateAdded` per external link, but it is **self-only**: querying any account other than the token's own account returns `403 token_account_id_does_not_match_url_accountId` (numericErrorCode 18055). This holds for both the Fortnite PC and Android clients — it's an account-match rule, not a client-scope rule.

**Why:** This breaks the original design of "original platform = earliest external-auth by dateAdded" for arbitrary accounts. That approach is impossible now.

## What works for arbitrary accounts
`GET /account/api/public/account?accountId={id}` (bulk form) returns an inline `externalAuths` map (keyed by type: xbl/psn/steam/nintendo/...) with `externalDisplayName` per platform, but **no `dateAdded`**.

## Current heuristic (how to apply)
Since creation order can't be derived, "original platform" = the console platform the search resolved through (prod.api-fortnite xbl/psn lookup sets `resolvedPlatform`), else a single unambiguous console link (xbl/psn/nintendo). If neither, originalName is left `null` (Unknown). `originalName` boolean compares the Epic display name against that reference platform's `externalDisplayName`.
