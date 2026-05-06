const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const crypto = require('crypto');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── FETCH LOCKOUT ROW ──
    const { data: attempt, error: fetchErr } = await supabase
      .from('login_attempts')
      .select('*')
      .limit(1)
      .single();

    if (fetchErr || !attempt) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'State error' }) };
    }

    const now = new Date();

    // ── ACTIVE LOCKOUT CHECK ──
    if (attempt.locked_until && new Date(attempt.locked_until) > now) {
      return {
        statusCode: 423,
        headers,
        body: JSON.stringify({ locked: true, until: attempt.locked_until })
      };
    }

    // ── LOCKOUT EXPIRED: RESET ──
    if (attempt.locked_until && new Date(attempt.locked_until) <= now) {
      const lastLockoutDay = new Date(attempt.locked_until).toDateString();
      const todayDay = now.toDateString();
      const isDifferentDay = lastLockoutDay !== todayDay;
      await supabase
        .from('login_attempts')
        .update({
          fail_count: 0,
          locked_until: null,
          lockout_count: isDifferentDay ? 0 : attempt.lockout_count,
          updated_at: now.toISOString()
        })
        .eq('id', attempt.id);
      attempt.fail_count = 0;
      attempt.locked_until = null;
      if (isDifferentDay) attempt.lockout_count = 0;
    }

    // ── PARSE BODY ──
    let password;
    try {
      ({ password } = JSON.parse(event.body));
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    // ── LOCKCHECK PROBE ──
    if (password === '__lockcheck__') {
      if (attempt.locked_until && new Date(attempt.locked_until) > now) {
        return { statusCode: 423, headers, body: JSON.stringify({ locked: true, until: attempt.locked_until }) };
      }
      return { statusCode: 401, headers, body: JSON.stringify({ success: false }) };
    }

    // ── CORRECT PASSWORD ──
    if (password === process.env.ADMIN_PASSWORD) {
      await supabase
        .from('login_attempts')
        .update({ fail_count: 0, locked_until: null, updated_at: now.toISOString() })
        .eq('id', attempt.id);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ── WRONG PASSWORD ──
    const newFailCount = (attempt.fail_count || 0) + 1;

    if (newFailCount < 3) {
      await supabase
        .from('login_attempts')
        .update({ fail_count: newFailCount, updated_at: now.toISOString() })
        .eq('id', attempt.id);
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, remaining: 3 - newFailCount }) };
    }

    // ── TRIGGER LOCKOUT ──
    const newLockoutCount = (attempt.lockout_count || 0) + 1;
    const lockedUntil = new Date('2099-12-31T23:59:59Z').toISOString();

    await supabase
      .from('login_attempts')
      .update({
        fail_count: newFailCount,
        lockout_count: newLockoutCount,
        locked_until: lockedUntil,
        updated_at: now.toISOString()
      })
      .eq('id', attempt.id);

    // ── GENERATE UNLOCK TOKEN ──
    const token = crypto.randomUUID();
    const siteUrl = process.env.SITE_URL;
    const unlockUrl = `${siteUrl}/unlock?token=${token}`;

    const emailExpiresAt = null;

    await supabase.from('unlock_tokens').insert({
      token,
      notification_mode: notifMode,
      email_expires_at: emailExpiresAt
    });

    // ── GET IP / LOCATION ──
    const ip = event.headers['x-nf-client-connection-ip']
      || event.headers['x-forwarded-for']?.split(',')[0].trim()
      || 'Unknown';
    const country = event.headers['x-country'] || event.headers['cf-ipcountry'] || 'Unknown';
    const timestamp = now.toUTCString();

    // ── SEND EMAIL ──
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailExpireNote = emailExpiresAt
        ? `<p style="color:#888;font-size:12px;">This link expires in 1 hour.</p>`
        : `<p style="color:#888;font-size:12px;">This link expires when clicked.</p>`;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: process.env.RESEND_TO_EMAIL,
        subject: 'Petal Console Locked',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;">
            <h2 style="color:#993556;">Petal Console Locked</h2>
            <p>3 failed login attempts were detected.</p>
            <table style="font-size:13px;border-collapse:collapse;width:100%;">
              <tr><td style="padding:4px 8px;color:#888;">Time</td><td>${timestamp}</td></tr>
              <tr><td style="padding:4px 8px;color:#888;">IP</td><td>${ip}</td></tr>
              <tr><td style="padding:4px 8px;color:#888;">Country</td><td>${country}</td></tr>
              <tr><td style="padding:4px 8px;color:#888;">Lockout #</td><td>${newLockoutCount}</td></tr>
            </table>
            <br>
            <a href="${unlockUrl}" style="background:#f4c0d1;color:#993556;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
              Unlock Console
            </a>
            ${emailExpireNote}
          </div>
        `
      });
    } catch (e) {
      console.error('Resend error:', e);
    }

    return {
      statusCode: 423,
      headers,
      body: JSON.stringify({ locked: true, until: lockedUntil })
    };

  } catch (err) {
    console.error('AUTH CRASH:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};