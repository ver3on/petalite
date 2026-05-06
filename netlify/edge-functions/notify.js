export default async (request, context) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const {
    customer_name,
    contact,
    arrangement_name,
    fulfillment,
    date_needed,
    note,
    order_id,
  } = body;

  const message = `
🌸 New Petal Order

Order ID: ${order_id}
Customer: ${customer_name}
Contact: ${contact}
Arrangement: ${arrangement_name}
Fulfillment: ${fulfillment}
Date needed: ${date_needed}
${note ? `Note: ${note}` : ''}
  `.trim();

  const results = await Promise.allSettled([
    // Telegram
    fetch(`https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: Deno.env.get('TELEGRAM_CHAT_ID'),
        text: message,
      }),
    }),

    // Resend
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM_EMAIL'),
        to: Deno.env.get('RESEND_TO_EMAIL'),
        subject: `New order from ${customer_name}`,
        text: message,
      }),
    }),
  ]);

  const errors = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason);

  if (errors.length === 2) {
    return new Response(JSON.stringify({ error: 'All notifications failed' }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

export const config = { path: '/api/notify' };