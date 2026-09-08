import { verifyKey, InteractionType } from 'discord-interactions';
import { t } from '../../src/i18n.js';

// Discord Interactions endpoint. Set as the bot's
// "Interactions Endpoint URL" in the Developer Portal.

export async function handler(request) {
  const body = await request.text();

  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const valid =
    signature &&
    timestamp &&
    verifyKey(body, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  if (!valid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Portal URL validation ping
  if (interaction.type === InteractionType.PING) {
    return Response.json({ type: 1 });
  }

  try {
    // Dynamic import keeps PING validation fast and DB-free.
    const { handleInteraction } = await import('../../src/handlers.js');
    return Response.json(await handleInteraction(interaction));
  } catch (err) {
    console.error('[Interactions] Error:', err);
    return Response.json({
      type: 4,
      data: { content: t('error_generic'), flags: 64 },
    });
  }
}
