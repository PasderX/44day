// ===== 44day_ — mailer module =====
// Sends transactional emails via SMTP. If SMTP env not configured,
// logs verification codes to console (for local dev).
//
// Required env vars (any of):
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE (true/false)
// Or SMTP_URL: smtps://user:pass@host:465

let nodemailer = null;
try { nodemailer = require('nodemailer'); }
catch (_) {
  console.warn('[mailer] nodemailer not installed — run `npm install` to enable real email');
}

let _transport = null;
function transport() {
  if (_transport !== null) return _transport;
  if (!nodemailer) { _transport = false; return _transport; }

  if (process.env.SMTP_URL) {
    _transport = nodemailer.createTransport(process.env.SMTP_URL);
    return _transport;
  }
  if (!process.env.SMTP_HOST) {
    _transport = false;
    return _transport;
  }
  _transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' ||
            Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });
  return _transport;
}

function fromAddr() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@44day.local';
}

function isConfigured() {
  return !!(process.env.SMTP_URL || process.env.SMTP_HOST);
}

// ---------- email templates ----------
function verifyCodeTemplate(code, username) {
  const safeUser = String(username || 'друг').replace(/[<>]/g, '');
  const text = [
    `Привет, ${safeUser}!`,
    '',
    `Твой код для подтверждения email на 44day_:`,
    '',
    `    ${code}`,
    '',
    'Код действителен 15 минут.',
    'Если ты не регистрировался — просто проигнорируй это письмо.',
    '',
    '— 44day team',
    'https://t.me/baku_root',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>44day_ verify</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',monospace,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f0f0f;border:1px solid #1f3a2a;border-radius:12px;overflow:hidden">
        <tr><td style="padding:24px;border-bottom:1px solid #1f3a2a">
          <div style="font-family:'JetBrains Mono',monospace;font-size:18px;color:#00ff88;font-weight:700;letter-spacing:0.6px">44day_</div>
        </td></tr>
        <tr><td style="padding:32px 24px 8px;color:#d8ffe8;font-size:15px;line-height:1.55">
          <p style="margin:0 0 18px">Привет, <b style="color:#00ff88">${safeUser}</b> 👋</p>
          <p style="margin:0 0 18px">Твой код для подтверждения email:</p>
          <div style="text-align:center;margin:24px 0">
            <div style="display:inline-block;padding:18px 28px;background:#000;border:1px solid #00ff88;border-radius:10px;font-family:'JetBrains Mono',monospace;font-size:32px;letter-spacing:8px;color:#00ff88;font-weight:700">${code}</div>
          </div>
          <p style="margin:18px 0 0;color:#9ca3af;font-size:13px">Код действует 15 минут. Если ты не регистрировался — просто проигнорируй это письмо.</p>
        </td></tr>
        <tr><td style="padding:18px 24px 24px;border-top:1px solid #1f3a2a;color:#6b7280;font-size:11px">
          — 44day team · <a href="https://t.me/baku_root" style="color:#00ff88;text-decoration:none">@baku_root</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { text, html, subject: `Подтверждение регистрации на 44day` };
}

// ---------- public API ----------
async function sendVerifyCode(email, code, username) {
  const tpl = verifyCodeTemplate(code, username);
  const tx = transport();
  if (!tx) {
    console.log(`\n📧 [mailer:dev] verify code for ${email} → ${code} (SMTP not configured)\n`);
    return { sent: false, dev: true };
  }
  try {
    const info = await tx.sendMail({
      from: fromAddr(),
      to: email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      replyTo: process.env.SMTP_USER || fromAddr(),
      headers: {
        'X-Mailer': '44day-auth',
        'X-Priority': '3',
        // Helps Gmail classify as transactional, not bulk
        'List-Unsubscribe': `<mailto:${process.env.SMTP_USER || 'noreply@44day.local'}?subject=unsubscribe>`,
        'Auto-Submitted': 'auto-generated',
        'Precedence': 'transactional',
      },
    });
    console.log(`📧 [mailer] sent verify code to ${email} → messageId=${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[mailer] sendMail failed:', err.message);
    // In dev mode also log code so user can still verify
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 [mailer:fallback] verify code for ${email} → ${code}`);
    }
    return { sent: false, error: err.message };
  }
}

module.exports = { sendVerifyCode, isConfigured };
