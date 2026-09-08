# Quick Start — Netlify + Supabase

The bot runs as **Discord HTTP interactions** on Netlify Functions, with data in
Supabase Postgres. No server to keep alive; reminders run on a Netlify cron
(every 5 min).

## 1. Supabase

1. Create a project at https://supabase.com
2. Open **SQL Editor** → paste `supabase/schema.sql` → **Run**
3. **Project Settings → Database → Connection string → URI**, pick the
   **Transaction pooler** (port 6543) version and copy it → this is `DATABASE_URL`

## 2. Discord Developer Portal

1. https://discord.com/developers/applications → your application
2. **Bot** tab → **Reset Token** → copy → `DISCORD_TOKEN` (secret — keep it out of chat)
3. **General Information** → copy **Application ID** and **Public Key**
4. **OAuth2 → URL Generator** → scopes: `bot` + `applications.commands` →
   permissions: Send Messages, Embed Links, Read Message History, **Manage Events**
   → open the URL to invite the bot to your server
5. In your Discord app: enable **Developer Mode**, then right-click your server →
   Copy Server ID (`DISCORD_GUILD_ID`) and your announcement channel →
   Copy Channel ID (`ANNOUNCEMENT_CHANNEL_ID`)
6. Create a role named exactly like `MJ_ROLE_NAME` (default `MJ`) and give it to MJs

## 3. Netlify

1. Push this repo to GitHub, then "Add new site → Import an existing project" on
   https://app.netlify.com (config comes from `netlify.toml`)
2. **Site configuration → Environment variables** — add all vars from
   `.env.example` (same names)
3. Deploy, then copy your site URL
4. Back in the Developer Portal → your app → **Interactions Endpoint URL**:
   `https://YOUR-SITE.netlify.app/.netlify/functions/interactions`
   (saving triggers a PING that must succeed, so deploy before this step)

## 4. Register slash commands (local machine)

```bash
cp .env.example .env      # fill DISCORD_TOKEN, IDs and DATABASE_URL
npm install
npm run deploy-commands   # instant because DISCORD_GUILD_ID is set
```

## 5. Test

- `/session list` → "Aucune session planifiée" ✅
- `/session create` (as MJ) → 5-field form → announcement + Discord event appear
- 📝 / ❌ buttons on the announcement, `/register my-sessions`
- `/mj remind <id> <hours>`, `/session edit <id>`

Netlify's scheduled function `reminders` sends 24h/1h reminders automatically.

## Commandes

- `/session create|edit|list|info|status|cancel` — gestion des sessions (MJ pour create/edit/status/cancel)
- `/register join|leave|my-sessions` — inscriptions joueurs
- `/mj promote|kick|remind` — outils MJ
