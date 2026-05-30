---
name: check-access role lookup architecture
description: Why /check-access (and any Discord role/member lookup via API) can return false negatives
---

# Role-check lookups run on the Replit-hosted bot, not BotGhost

`/api/check-access*` endpoints call `hasBotAccessRole()` which does `client.guilds.fetch(guildId)` + `guild.members.fetch(userId)` using the **Replit bot's `DISCORD_TOKEN`**. BotGhost is a separate bot that only calls the HTTP API.

**Why:** users build commands in BotGhost and assume BotGhost performs the lookup. It does not — the Replit bot does. If the Replit bot is not a member of the target guild, `guilds.fetch` throws `Unknown Guild` and every check silently returns ❌ (false negative).

**How to apply:** when a Discord member/role lookup via API always returns negative, first check the `error` field:
- `Unknown Guild` → Replit bot isn't in that server. Invite it via the built-in `/invite` route.
- `Unknown Member` → user not in the server.
- no error + false → genuinely missing the role.

Single-member `guild.members.fetch(id)` uses REST and does NOT need the privileged GuildMembers intent, so adding that intent is not the fix (and would crash startup if not enabled in the Discord dev portal). Always sanitize IDs from BotGhost with `.replace(/\D/g,'')` — they can arrive as mentions like `<@123>`.
