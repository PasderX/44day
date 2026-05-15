// ===== 44day_ — auth module =====
// Native crypto, no external deps. Stores users in data/users.json.
// Sessions: signed httpOnly cookies (HMAC-SHA256), 30 days.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SECRET = process.env.AUTH_SECRET || '44day-default-secret-CHANGE-ME-please';
const COOKIE_NAME = 's44';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (seconds)

// ---------- storage ----------
function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}
function loadUsers() {
  ensureFile();
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch { return { users: [] }; }
}
function saveUsers(data) {
  ensureFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ---------- password hashing (scrypt) ----------
function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(plain, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, salt, expected] = stored.split('$');
  if (!salt || !expected) return false;
  const got = crypto.scryptSync(plain, salt, 64).toString('hex');
  // constant-time compare
  const a = Buffer.from(got, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------- session tokens (HMAC-signed: userId.expiry.signature) ----------
function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}
function makeToken(userId) {
  const exp = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expect = sign(`${userId}.${exp}`);
  // constant-time compare
  if (sig.length !== expect.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  if (parseInt(exp, 10) < Math.floor(Date.now() / 1000)) return null;
  return { userId, exp: parseInt(exp, 10) };
}

// ---------- cookie helpers ----------
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  raw.split(';').forEach((p) => {
    const idx = p.indexOf('=');
    if (idx < 0) return;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}
function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);
}

// ---------- public API ----------
function currentUser(req) {
  const cookies = parseCookies(req);
  const tok = cookies[COOKIE_NAME];
  const v = verifyToken(tok);
  if (!v) return null;
  const { users } = loadUsers();
  const u = users.find((x) => x.id === v.userId);
  if (!u || u.banned) return null;
  return u;
}
function requireUser(req, res, next) {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'unauthorized' });
  req.user = u;
  next();
}

// validators
const RE_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const RE_USERNAME = /^[a-zA-Z0-9_]{3,20}$/;

function publicUser(u) {
  if (!u) return null;
  const {
    id, username, email, createdAt, lastSeen, streak,
    achievements, unlocked, role, avatar
  } = u;
  return {
    id, username, email, createdAt, lastSeen, streak,
    achievements: achievements || [],
    unlocked: unlocked || [],
    role: role || 'user',
    avatar: avatar || null,
  };
}

function newUserId() {
  return 'u_' + crypto.randomBytes(8).toString('hex');
}

// ---------- streak / lastSeen ----------
function touchUser(userId) {
  const db = loadUsers();
  const u = db.users.find((x) => x.id === userId);
  if (!u) return;
  const today = new Date().toISOString().slice(0, 10);
  const last = u.lastSeen ? u.lastSeen.slice(0, 10) : null;
  if (last === today) return; // already counted today
  if (last) {
    // is yesterday?
    const y = new Date(); y.setUTCDate(y.getUTCDate() - 1);
    const yStr = y.toISOString().slice(0, 10);
    u.streak = (last === yStr) ? ((u.streak || 0) + 1) : 1;
  } else {
    u.streak = 1;
  }
  u.lastSeen = new Date().toISOString();
  // achievements: streak milestones
  u.achievements = u.achievements || [];
  const milestones = [
    { id: 'streak_3',  min: 3,  icon: '🔥', name: 'Серия 3 дня' },
    { id: 'streak_7',  min: 7,  icon: '⚡', name: 'Неделя подряд' },
    { id: 'streak_30', min: 30, icon: '💎', name: 'Месяц без пропуска' },
  ];
  milestones.forEach((m) => {
    if (u.streak >= m.min && !u.achievements.find((a) => a.id === m.id)) {
      u.achievements.push({ ...m, at: new Date().toISOString() });
    }
  });
  saveUsers(db);
}

module.exports = {
  loadUsers,
  saveUsers,
  hashPassword,
  verifyPassword,
  makeToken,
  verifyToken,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  currentUser,
  requireUser,
  publicUser,
  newUserId,
  touchUser,
  RE_EMAIL,
  RE_USERNAME,
  COOKIE_NAME,
};
