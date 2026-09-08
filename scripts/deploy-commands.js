import 'dotenv/config';
import { commands } from '../src/commands.js';

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID; // optional: instant per-guild registration

if (!token || !applicationId) {
  console.error('❌ DISCORD_TOKEN and DISCORD_APPLICATION_ID are required in .env');
  process.exit(1);
}

const route = guildId
  ? `/applications/${applicationId}/guilds/${guildId}/commands`
  : `/applications/${applicationId}/commands`;

const res = await fetch(`https://discord.com/api/v10${route}`, {
  method: 'PUT',
  headers: {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(commands),
});

if (!res.ok) {
  console.error(`❌ ${res.status}:`, await res.text());
  process.exit(1);
}

const data = await res.json();
console.log(`✅ Registered ${data.length} command(s) ${guildId ? '(guild — instant)' : '(global — up to 1h to propagate)'}`);
