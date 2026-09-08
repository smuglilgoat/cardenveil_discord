import config from './config.js';

const API = 'https://discord.com/api/v10';

async function discordFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${res.status} on ${method} ${path}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const getGuildRoles = (guildId) => discordFetch(`/guilds/${guildId}/roles`);

export const postMessage = (channelId, payload) =>
  discordFetch(`/channels/${channelId}/messages`, { method: 'POST', body: payload });

export const editMessage = (channelId, messageId, payload) =>
  discordFetch(`/channels/${channelId}/messages/${messageId}`, { method: 'PATCH', body: payload });

export async function sendDm(userId, payload) {
  const dm = await discordFetch('/users/@me/channels', {
    method: 'POST',
    body: { recipient_id: userId },
  });
  return postMessage(dm.id, payload);
}

export const createScheduledEvent = (guildId, body) =>
  discordFetch(`/guilds/${guildId}/scheduled-events`, { method: 'POST', body });

export const deleteScheduledEvent = (guildId, eventId) =>
  discordFetch(`/guilds/${guildId}/scheduled-events/${eventId}`, { method: 'DELETE' });

// Create a thread (post) in a forum channel. Returns the thread channel.
export const createForumThread = (forumChannelId, body) =>
  discordFetch(`/channels/${forumChannelId}/threads`, { method: 'POST', body });
