# CONTINUITY

## [MILESTONE]
- 2026-09-08 [USER] Project pivoted: bot runs on Netlify Functions + Supabase (was Node gateway + SQLite).

## [PLANS]
- 2026-09-08 [ASSUMPTION] Create modal trimmed to 5 fields: System, Format, Date, Max players, Game type; MJ = command invoker; description/comments settable via /session edit. AWAITING USER CONFIRMATION.
- 2026-09-08 [ASSUMPTION] TIMEZONE default Europe/Paris for parsing MJ-typed dates. AWAITING USER CONFIRMATION.

## [DECISIONS]
- 2026-09-08 [CODE] HTTP interactions, respond-once model (await work, single type-4/8/9 response; no deferred/followup machinery).
- 2026-09-08 [CODE] discord.js dropped entirely — raw fetch REST helpers (src/discord.js); discord-interactions only for signature verify.
- 2026-09-08 [CODE] postgres package + DATABASE_URL (Supabase transaction pooler, prepare:false, max:1).
- 2026-09-08 [CODE] updateDiscordEvent dropped: event deleted on close, recreated on date change.

## [PROGRESS]
- 2026-09-08 [CODE] Branch `agent/netlify-supabase`, commit f682054. All gateway-era files deleted; new: src/{config,db,discord,commands,validators,i18n,embeds,reminders,handlers}.js, netlify/functions/{interactions,reminders}.js, scripts/deploy-commands.js, supabase/schema.sql, netlify.toml, public/, test/date.test.mjs, QUICKSTART.md rewritten.

## [DISCOVERIES]
- 2026-09-08 [CODE] Pre-existing bugs fixed in migration: modal >5 inputs; /mj remind used nonexistent column + ISO string in integer column; my-sessions queried nonexistent s.date; reminder join id collision; no status filter on reminders.
- 2026-09-08 [TOOL] User's install link has no permissions param → bot joins with zero permissions; must re-invite with permissions=4295051264 (Send Messages, Embed Links, Read Message History, Manage Events).
- 2026-09-08 [USER] Client Secret was pasted in chat → compromised, should be reset (not needed by this architecture anyway).

## [OUTCOMES]
- 2026-09-08 [CODE] Tests: 6/6 pass (date parser incl. DST). All modules import cleanly.
- 2026-09-08 [ASSUMPTION] UNCONFIRMED: live end-to-end (Netlify deploy, Supabase schema, endpoint URL, token registration) — blocked on user providing DISCORD_TOKEN and DATABASE_URL.

## [DISCOVERIES] — deploy round 1
- 2026-09-08 [USER] User merged agent/netlify-supabase into main and pushed; Netlify git deploy attempted.
- 2026-09-08 [TOOL] Netlify secrets-scan failed, flagging only TIMEZONE: scanner matches configured env var VALUES against deploy files; "Europe/Paris" (default in src/config.js) collides. Real secrets appear in no repo file (verified origin/main: 0 matches) → false positive. Fix: remove TIMEZONE from Netlify UI env vars (code defaults to Europe/Paris) or set SECRETS_SCAN_OMIT_KEYS=TIMEZONE.
- 2026-09-08 [USER] DISCORD_TOKEN and Client Secret pasted in chat → burned; must be reset in portal. Local .env created (gitignored, verified) with non-secret values; token + real DB password left blank for user. DATABASE_URL should use pooler port 6543 (user's paste had 5432 direct).
