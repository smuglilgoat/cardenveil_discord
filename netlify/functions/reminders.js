// Runs every 5 minutes (Netlify scheduled function). Sends due reminders.

// v2 format: default export + config.schedule (Netlify scheduled function).

export default async function scheduled() {
  const { processReminders } = await import('../../src/reminders.js');
  await processReminders();
  return new Response('ok');
}

export const config = {
  schedule: '*/5 * * * *',
};
