// ===== 44day_ — captcha module =====
// HMAC-signed math captcha. No external deps, no third-party services.
// Server: GET /api/captcha → { question, token }
// Client submits { captchaToken, captchaAnswer } with form.
// Server verifies HMAC + expiry + answer match.

const crypto = require('crypto');

const TTL_SECONDS = 5 * 60; // captcha valid for 5 minutes

function getSecret() {
  return process.env.AUTH_SECRET || '44day-default-secret-CHANGE-ME-please';
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function rng(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const OPS = ['+', '-', '*'];
function pickOp() { return OPS[Math.floor(Math.random() * OPS.length)]; }

function compute(a, b, op) {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  return NaN;
}

function generate() {
  const op = pickOp();
  let a, b;
  if (op === '*') { a = rng(2, 9); b = rng(2, 9); }
  else if (op === '-') { a = rng(10, 30); b = rng(1, a); }
  else { a = rng(2, 20); b = rng(2, 20); }
  const answer = compute(a, b, op);
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${answer}.${exp}`;
  const token = `${exp}.${sign(payload)}`;
  // Display: pretty multiplication sign
  const opChar = op === '*' ? '×' : op;
  return {
    question: `${a} ${opChar} ${b} = ?`,
    token,
  };
}

function verify(token, answerInput) {
  if (!token || typeof token !== 'string') return false;
  if (answerInput == null) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [exp, sig] = parts;
  const expN = parseInt(exp, 10);
  if (!Number.isFinite(expN)) return false;
  if (expN < Math.floor(Date.now() / 1000)) return false;
  // Try to parse answer
  const answer = String(answerInput).trim();
  const ansN = parseInt(answer, 10);
  if (!Number.isFinite(ansN)) return false;
  // Recompute expected signature with this candidate answer
  const expected = sign(`${ansN}.${expN}`);
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch (_) { return false; }
}

module.exports = { generate, verify, TTL_SECONDS };
