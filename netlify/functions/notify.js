exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
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

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: process.env.RESEND_TO_EMAIL,
        subject: `New order from ${customer_name}`,
        text: message,
      }),
    });
  } catch (e) {
    console.error('Resend error:', e);
    return { statusCode: 500, body: 'Notification failed' };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};