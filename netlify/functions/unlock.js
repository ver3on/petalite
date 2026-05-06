const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const token = event.queryStringParameters?.token;
  const siteUrl = process.env.SITE_URL;

  if (!token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: `<html><body style="font-family:sans-serif;text-align:center;padding:4rem;background:#fdf8f5;color:#2d2d2d;">
        <h2>Invalid link</h2><p>No token provided.</p>
      </body></html>`
    };
  }

  const { data: row, error } = await supabase
    .from('unlock_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !row) {
    return {
      statusCode: 410,
      headers: { 'Content-Type': 'text/html' },
      body: `<html><body style="font-family:sans-serif;text-align:center;padding:4rem;background:#fdf8f5;color:#2d2d2d;">
        <h2 style="color:#993556;">Link expired</h2>
        <p>This unlock link has already been used or has expired.</p>
      </body></html>`
    };
  }

  if (row.email_expires_at && new Date(row.email_expires_at) < new Date()) {
    await supabase.from('unlock_tokens').delete().eq('id', row.id);
    return {
      statusCode: 410,
      headers: { 'Content-Type': 'text/html' },
      body: `<html><body style="font-family:sans-serif;text-align:center;padding:4rem;background:#fdf8f5;color:#2d2d2d;">
        <h2 style="color:#993556;">Link expired</h2>
        <p>This unlock link expired after 1 hour. Trigger a new lockout to get a fresh link.</p>
      </body></html>`
    };
  }

  await supabase.from('unlock_tokens').delete().eq('id', row.id);

  await supabase
    .from('login_attempts')
    .update({ fail_count: 0, locked_until: null, updated_at: new Date().toISOString() })
    .not('id', 'is', null);

  return {
    statusCode: 302,
    headers: { Location: `${siteUrl}/huzzah.html?unlocked=1` },
    body: ''
  };
};