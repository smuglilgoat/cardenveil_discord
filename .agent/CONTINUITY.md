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

## [DISCOVERIES] — deploy round 2
- 2026-09-08 [TOOL] Second secrets-scan failure at d9eedc5 flagged DISCORD_PUBLIC_KEY, APPLICATION_ID, GUILD_ID, CHANNEL_ID, DATABASE_URL — all traced to one file: `session-ses_f7ed.md` (session export committed in d9eedc5, contains pasted credentials incl. old token ×6 and bracketed placeholder DB password; 0 real DB creds). TIMEZONE absent from list → user removed it from Netlify UI as instructed.
- 2026-09-08 [CODE] Fix commit ded9839: `git rm --cached session-ses_f7ed.md`, `session-*.md` added to .gitignore, ff-merged to main, pushed. Verified 0 flagged-value matches in HEAD. NOTE: local session file no longer on disk (regenerable via `opencode export`).
- 2026-09-08 [USER] .env now fully filled (token + DB password non-empty) → user completed token reset + DB password steps.
- 2026-09-08 [ASSUMPTION] Git history still contains the old token/Client Secret (dead after reset) and session file in d9eedc5 — harmless; history purge optional.

## [DISCOVERIES] — endpoint validation round
- 2026-09-08 [TOOL] Portal URL validation failed. Probe of live endpoint: HTTP 502 "request.text is not a function" — named `handler` export made Netlify run functions in legacy (Lambda event) mode; v2 format requires DEFAULT export. Fixed both functions in 6db78dd (also makes `config.schedule` for reminders actually register). Verified locally (401 on fake signature) and live (endpoint now returns 401 Invalid signature instead of 502).
- 2026-09-08 [USER] .env fully filled; client secret reset status UNCONFIRMED.
