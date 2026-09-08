// Runs every 5 minutes (Netlify scheduled function). Sends due reminders.

export async function handler() {
  const { processReminders } = await import('../../src/reminders.js');
  await processReminders();
  return new Response('ok');
}

export const config = {
  schedule: '*/5 * * * *',
};
