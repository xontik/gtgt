const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

export function isDiscordConfigured() {
  return Boolean(webhookUrl);
}

export async function sendDiscordMessage(content: string) {
  if (!webhookUrl) return;

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    throw new Error(`Discord webhook failed: ${res.status} ${await res.text()}`);
  }
}
