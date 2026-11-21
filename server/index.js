/**
 * Rizz Cocktail Bar — backend.
 *
 * - REST API: orders, bookings, social posts, ads/offers, promo & reward vouchers, customer insights
 * - Server-Sent Events (/api/events): every change is pushed live, filtered per viewer
 *   (staff see everything; guests see their own orders/bookings, public posts, ads and their rewards)
 * - Staff actions protected by a PIN → bearer token
 * - JSON file persistence + uploaded photos on disk; also serves the built web app
 *
 * Env: PORT (3001), STAFF_PIN (1234), DATA_FILE (server/data/db.json) — photos go in <data dir>/uploads
 */
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const STAFF_PIN = process.env.STAFF_PIN || '1234';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');
const UPLOAD_DIR = path.join(path.dirname(DATA_FILE), 'uploads');
const SERVICE_FEE_RATE = 0.05;
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- persistence ----------
const DEFAULT_SETTINGS = { rewardThreshold: 100, rewardValue: 15, pointsPerUnit: 1 };
const now0 = Date.now();
const DEFAULT_ADS = [
  { id: 'ad-happy', title: 'Happy Hour 2-for-1', subtitle: 'All classic cocktails, 4–7 PM daily', emoji: '🍸', theme: 'purple',
    cta: { label: 'Order now', type: 'menu', target: 'cocktails' }, placements: ['home', 'menu', 'tv'], active: true, createdAt: now0 },
  { id: 'ad-app', title: '10% off your first app order', subtitle: 'Use code WELCOME10 at checkout', emoji: '📱', theme: 'lime',
    cta: { label: 'Get code', type: 'code', target: 'WELCOME10' }, placements: ['home', 'menu', 'social', 'tv'], active: true, createdAt: now0 },
  { id: 'ad-rooftop', title: 'Rooftop DJ Weekends', subtitle: 'Fri & Sat from 9 PM — book your table', emoji: '🎧', theme: 'blue',
    cta: { label: 'Book', type: 'book', target: 'rooftop' }, placements: ['home', 'book', 'tv'], active: true, createdAt: now0 },
  { id: 'ad-shots', title: 'Shot Roulette Thursdays', subtitle: '5 shots for the price of 4', emoji: '🥃', theme: 'orange',
    cta: { label: 'See shots', type: 'menu', target: 'shots' }, placements: ['menu', 'social', 'tv'], active: true, createdAt: now0 },
  { id: 'ad-moments', title: 'Share your Rizz moment', subtitle: 'Post a photo — best of the week wins a bottle', emoji: '📸', theme: 'pink',
    cta: { label: 'Post', type: 'social', target: '' }, placements: ['home', 'social', 'tv'], active: true, createdAt: now0 },
];
const DEFAULT_VOUCHERS = [
  { id: 'v-welcome', code: 'WELCOME10', description: '10% off your first app order', kind: 'percent', value: 10, minSpend: 0,
    perCustomer: 1, firstOrderOnly: true, active: true, source: 'promo', redemptions: [], createdAt: now0 },
];

let db = { orders: [], bookings: [], posts: [], ads: DEFAULT_ADS, vouchers: DEFAULT_VOUCHERS, customers: {}, settings: DEFAULT_SETTINGS };
try {
  db = { ...db, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
  db.settings = { ...DEFAULT_SETTINGS, ...db.settings };
} catch { /* first run */ }

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DATA_FILE);
  }, 50);
}

// ---------- helpers ----------
const uid = () => crypto.randomUUID();
const code = (p) => `${p}-${Math.floor(1000 + Math.random() * 9000)}`;
const round = (n) => Math.round(n * 100) / 100;
const tokens = new Set();
const tokenOf = (req) => (req.headers.authorization || '').replace(/^Bearer /, '') || String(req.query.token || '');
const isStaff = (req) => tokens.has(tokenOf(req));
const requireStaff = (req, res, next) => (isStaff(req) ? next() : res.status(401).json({ error: 'Staff login required' }));
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const num = (v, min, max, dflt) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt; };

function saveImage(dataUrl) {
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 3 * 1024 * 1024) return null;
  const name = `${uid()}.${m[1] === 'jpg' ? 'jpeg' : m[1]}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}
function removeImage(url) {
  if (url?.startsWith('/uploads/')) fs.rm(path.join(UPLOAD_DIR, path.basename(url)), () => {});
}

const ORDER_STATUSES = ['new', 'preparing', 'ready', 'served', 'cancelled'];
const BOOKING_STATUSES = ['pending', 'confirmed', 'declined', 'checked-in', 'cancelled'];
const ACTIVE_BOOKING = ['pending', 'confirmed', 'checked-in'];
const MULTI_PARTY_SPACES = ['bar-counter', 'rooftop'];

// ---------- customers, points & rewards ----------
function customerStats(customerId) {
  const mine = db.orders.filter((o) => o.customerId === customerId);
  const served = mine.filter((o) => o.status === 'served');
  const spent = round(served.reduce((s, o) => s + o.total, 0));
  const points = Math.floor(spent * db.settings.pointsPerUnit);
  const last = mine.reduce((m, o) => Math.max(m, o.createdAt), 0);
  const profile = db.customers[customerId] || {};
  return { customerId, name: profile.name || mine[0]?.customer || 'Guest', phone: profile.phone || mine[0]?.phone,
    orders: served.length, totalOrders: mine.filter((o) => o.status !== 'cancelled').length, spent, points,
    lastVisit: last || null, posts: db.posts.filter((p) => p.customerId === customerId && !p.hidden).length,
    redeemed: db.vouchers.reduce((n, v) => n + v.redemptions.filter((r) => r.customerId === customerId).length, 0) };
}

/** Issue reward vouchers for every threshold the customer has crossed. Returns true if any were issued. */
function issueRewards(customerId) {
  if (!customerId) return false;
  const { points } = customerStats(customerId);
  const { rewardThreshold, rewardValue } = db.settings;
  if (!rewardThreshold || !rewardValue) return false;
  const c = (db.customers[customerId] ||= {});
  const due = Math.floor(points / rewardThreshold);
  let issued = false;
  while ((c.rewardsIssued || 0) < due) {
    c.rewardsIssued = (c.rewardsIssued || 0) + 1;
    db.vouchers.unshift({ id: uid(), code: `RIZZ-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      description: `Loyalty reward for reaching ${c.rewardsIssued * rewardThreshold} pts — thank you!`,
      kind: 'fixed', value: rewardValue, minSpend: 0, perCustomer: 1, customerId, active: true, source: 'reward',
      redemptions: [], createdAt: Date.now() });
    issued = true;
  }
  return issued;
}

function voucherUsable(v, customerId) {
  if (!v || !v.active) return 'This code is not active.';
  if (v.expiresAt && Date.now() > v.expiresAt) return 'This code has expired.';
  if (v.customerId && v.customerId !== customerId) return 'This code belongs to another account.';
  if (v.maxUses && v.redemptions.length >= v.maxUses) return 'This code has been fully redeemed.';
  if (v.perCustomer && customerId && v.redemptions.filter((r) => r.customerId === customerId).length >= v.perCustomer)
    return "You've already used this code.";
  if (v.firstOrderOnly && db.orders.some((o) => o.customerId === customerId && o.status !== 'cancelled'))
    return 'This code is for your first app order only.';
  return null;
}
function discountFor(v, subtotal) {
  if (subtotal < (v.minSpend || 0)) return { error: `Minimum spend of ${v.minSpend} required.` };
  const d = v.kind === 'percent' ? subtotal * (v.value / 100) : v.value;
  return { discount: round(Math.min(subtotal, d)) };
}
const findVoucher = (c) => db.vouchers.find((v) => v.code.toUpperCase() === String(c || '').trim().toUpperCase());

// ---------- realtime (per-viewer views) ----------
/** clients: Set<{ res, staff: boolean, customerId?: string }> */
const clients = new Set();
const anonBooking = (b) => ({ id: b.id, spaceId: b.spaceId, date: b.date, time: b.time, status: b.status, anon: true });
const publicPost = (p) => p;
const visibleVouchers = (c) => c.staff ? db.vouchers : db.vouchers.filter((v) => v.customerId === c.customerId);

function viewFor(c) {
  return {
    orders: c.staff ? db.orders : db.orders.filter((o) => o.customerId && o.customerId === c.customerId),
    bookings: c.staff ? db.bookings : db.bookings.map((b) => (b.customerId && b.customerId === c.customerId ? b : anonBooking(b))),
    posts: c.staff ? db.posts : db.posts.filter((p) => !p.hidden).map(publicPost),
    ads: c.staff ? db.ads : db.ads.filter((a) => a.active),
    vouchers: visibleVouchers(c),
    me: c.customerId ? customerStats(c.customerId) : null,
    settings: db.settings,
  };
}
function send(c, type, payload) { c.res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`); }

function pushOrder(o) {
  for (const c of clients) {
    if (c.staff || (o.customerId && c.customerId === o.customerId)) send(c, 'order', o);
    if (o.customerId && c.customerId === o.customerId) send(c, 'me', customerStats(o.customerId));
  }
}
function pushBooking(b) {
  for (const c of clients) send(c, 'booking', c.staff || (b.customerId && c.customerId === b.customerId) ? b : anonBooking(b));
}
function pushPost(p) {
  for (const c of clients) send(c, 'post', c.staff || !p.hidden ? p : { id: p.id, removed: true });
}
function pushAds() { for (const c of clients) send(c, 'ads', c.staff ? db.ads : db.ads.filter((a) => a.active)); }
function pushVouchers(customerId) {
  for (const c of clients) if (c.staff || (customerId && c.customerId === customerId)) send(c, 'vouchers', visibleVouchers(c));
}
function pushSnapshotAll() { for (const c of clients) send(c, 'snapshot', viewFor(c)); }

// ---------- app ----------
const app = express();
app.use(express.json({ limit: '6mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/state', (req, res) => res.json(viewFor({ staff: isStaff(req), customerId: str(req.query.customerId, 64) })));

app.get('/api/events', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const c = { res, staff: isStaff(req), customerId: str(req.query.customerId, 64) };
  send(c, 'snapshot', viewFor(c));
  clients.add(c);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); clients.delete(c); });
});

app.post('/api/staff/login', (req, res) => {
  if (str(req.body?.pin, 20) !== STAFF_PIN) return res.status(401).json({ error: 'Wrong PIN' });
  const token = crypto.randomBytes(24).toString('hex');
  tokens.add(token);
  res.json({ token });
});

// Remember a guest's display name/phone for staff insights
app.post('/api/customers/me', (req, res) => {
  const id = str(req.body?.customerId, 64);
  if (!id) return res.status(400).json({ error: 'customerId required' });
  db.customers[id] = { ...db.customers[id], name: str(req.body.name, 60), phone: str(req.body.phone, 30), joinedAt: db.customers[id]?.joinedAt || Date.now() };
  save();
  res.json(customerStats(id));
});

// ---------- vouchers ----------
app.post('/api/vouchers/validate', (req, res) => {
  const { code: c, customerId, subtotal } = req.body || {};
  const v = findVoucher(c);
  if (!v) return res.status(404).json({ error: "We don't recognise that code." });
  const err = voucherUsable(v, str(customerId, 64));
  if (err) return res.status(400).json({ error: err });
  const d = discountFor(v, num(subtotal, 0, 1e6, 0));
  if (d.error) return res.status(400).json({ error: d.error });
  res.json({ code: v.code, description: v.description, discount: d.discount });
});

app.post('/api/vouchers', requireStaff, (req, res) => {
  const b = req.body || {};
  const c = str(b.code, 24)?.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!c) return res.status(400).json({ error: 'Code required' });
  if (findVoucher(c)) return res.status(409).json({ error: 'That code already exists' });
  const v = { id: uid(), code: c, description: str(b.description, 120) || '', kind: b.kind === 'fixed' ? 'fixed' : 'percent',
    value: num(b.value, 0, b.kind === 'fixed' ? 100000 : 100, 10), minSpend: num(b.minSpend, 0, 1e6, 0),
    perCustomer: num(b.perCustomer, 0, 100, 1), maxUses: b.maxUses ? num(b.maxUses, 1, 1e6, undefined) : undefined,
    firstOrderOnly: !!b.firstOrderOnly, expiresAt: b.expiresAt ? Number(new Date(b.expiresAt)) || undefined : undefined,
    active: true, source: 'promo', redemptions: [], createdAt: Date.now() };
  db.vouchers.unshift(v);
  save(); pushVouchers();
  res.status(201).json(v);
});

app.patch('/api/vouchers/:id', requireStaff, (req, res) => {
  const v = db.vouchers.find((x) => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  if (typeof req.body?.active === 'boolean') v.active = req.body.active;
  save(); pushVouchers(v.customerId);
  res.json(v);
});

app.patch('/api/settings', requireStaff, (req, res) => {
  const b = req.body || {};
  db.settings = { ...db.settings,
    rewardThreshold: num(b.rewardThreshold, 0, 1e6, db.settings.rewardThreshold),
    rewardValue: num(b.rewardValue, 0, 1e6, db.settings.rewardValue) };
  save(); pushSnapshotAll();
  res.json(db.settings);
});

app.get('/api/customers', requireStaff, (_req, res) => {
  const ids = new Set([...Object.keys(db.customers), ...db.orders.map((o) => o.customerId).filter(Boolean)]);
  res.json([...ids].map(customerStats).sort((a, b) => b.spent - a.spent));
});

// ---------- orders ----------
app.post('/api/orders', (req, res) => {
  const b = req.body || {};
  const lines = Array.isArray(b.lines) ? b.lines.slice(0, 50) : [];
  const clean = lines
    .map((l) => ({ key: str(l.key, 300), itemId: str(l.itemId, 60), name: str(l.name, 80),
      unitPrice: Math.max(0, Number(l.unitPrice) || 0), qty: Math.min(50, Math.max(1, Math.floor(Number(l.qty) || 0))),
      choices: Array.isArray(l.choices) ? l.choices.slice(0, 10).map((c) => str(c, 60)).filter(Boolean) : [], note: str(l.note) }))
    .filter((l) => l.itemId && l.name);
  if (!clean.length) return res.status(400).json({ error: 'Order has no items' });
  const fulfilment = b.fulfilment === 'pickup' ? 'pickup' : 'table';
  const table = fulfilment === 'table' ? str(b.table, 20) : undefined;
  if (fulfilment === 'table' && !table) return res.status(400).json({ error: 'Table number required' });
  const customerId = str(b.customerId, 64);

  const subtotal = round(clean.reduce((s, l) => s + l.unitPrice * l.qty, 0));
  let discount = 0, voucher = null;
  if (b.voucherCode) {
    voucher = findVoucher(b.voucherCode);
    const err = voucher ? voucherUsable(voucher, customerId) : "We don't recognise that code.";
    if (err) return res.status(400).json({ error: err });
    const d = discountFor(voucher, subtotal);
    if (d.error) return res.status(400).json({ error: d.error });
    discount = d.discount;
  }
  const net = round(subtotal - discount);
  const serviceFee = round(net * SERVICE_FEE_RATE);
  const tip = round(Math.min(subtotal, Math.max(0, Number(b.tip) || 0)));
  const now = Date.now();
  const order = { id: uid(), code: code('RZ'), createdAt: now, updatedAt: now, source: 'app',
    customerId, customer: str(b.customer, 60) || 'Guest', phone: str(b.phone, 30),
    lines: clean, subtotal, discount, voucherCode: voucher?.code, serviceFee, tip, total: round(net + serviceFee + tip),
    fulfilment, table, notes: str(b.notes, 300), status: 'new' };
  if (voucher) voucher.redemptions.push({ customerId, orderId: order.id, at: now });
  db.orders.unshift(order);
  save();
  pushOrder(order);
  if (voucher) pushVouchers(voucher.customerId || customerId);
  res.status(201).json(order);
});

app.patch('/api/orders/:id', (req, res) => {
  const o = db.orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  const { status, rating, customerId } = req.body || {};
  const staff = isStaff(req);
  const owner = customerId && customerId === o.customerId;
  if (status !== undefined) {
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Bad status' });
    if (!staff && !(owner && status === 'cancelled' && o.status === 'new')) return res.status(403).json({ error: 'Not allowed' });
    // A cancelled order gives its voucher back
    if (status === 'cancelled' && o.voucherCode) {
      const v = findVoucher(o.voucherCode);
      if (v) { v.redemptions = v.redemptions.filter((r) => r.orderId !== o.id); pushVouchers(v.customerId || o.customerId); }
    }
    o.status = status;
  }
  if (rating !== undefined) {
    if (!owner && !staff) return res.status(403).json({ error: 'Not allowed' });
    o.rating = Math.min(5, Math.max(0, Math.floor(Number(rating))));
  }
  o.updatedAt = Date.now();
  const rewarded = o.status === 'served' && issueRewards(o.customerId);
  save();
  pushOrder(o);
  if (rewarded) pushVouchers(o.customerId);
  res.json(o);
});

// ---------- bookings ----------
app.post('/api/bookings', (req, res) => {
  const b = req.body || {};
  const booking = { id: uid(), code: code('BK'), createdAt: Date.now(), status: 'pending',
    customerId: str(b.customerId, 64), spaceId: str(b.spaceId, 40), spaceName: str(b.spaceName, 80),
    date: str(b.date, 10), time: str(b.time, 5), durationHrs: Math.min(8, Math.max(1, Math.floor(Number(b.durationHrs) || 2))),
    guests: Math.min(200, Math.max(1, Math.floor(Number(b.guests) || 1))), customer: str(b.customer, 60), phone: str(b.phone, 30),
    occasion: str(b.occasion, 40), notes: str(b.notes, 300) };
  if (!booking.spaceId || !/^\d{4}-\d{2}-\d{2}$/.test(booking.date || '') || !/^\d{2}:\d{2}$/.test(booking.time || ''))
    return res.status(400).json({ error: 'Invalid booking details' });
  if (!booking.customer || !booking.phone) return res.status(400).json({ error: 'Name and phone required' });
  const clash = !MULTI_PARTY_SPACES.includes(booking.spaceId) && db.bookings.some((x) =>
    x.spaceId === booking.spaceId && x.date === booking.date && x.time === booking.time && ACTIVE_BOOKING.includes(x.status));
  if (clash) return res.status(409).json({ error: 'That slot was just booked — please pick another time.' });
  db.bookings.unshift(booking);
  save();
  pushBooking(booking);
  res.status(201).json(booking);
});

app.patch('/api/bookings/:id', (req, res) => {
  const bk = db.bookings.find((x) => x.id === req.params.id);
  if (!bk) return res.status(404).json({ error: 'Not found' });
  const { status, customerId } = req.body || {};
  if (!BOOKING_STATUSES.includes(status)) return res.status(400).json({ error: 'Bad status' });
  const owner = customerId && customerId === bk.customerId;
  if (!isStaff(req) && !(owner && status === 'cancelled')) return res.status(403).json({ error: 'Not allowed' });
  bk.status = status;
  save();
  pushBooking(bk);
  res.json(bk);
});

// ---------- social ----------
app.post('/api/posts', (req, res) => {
  const b = req.body || {};
  const customerId = str(b.customerId, 64);
  if (!customerId) return res.status(400).json({ error: 'Sign in to post' });
  const recent = db.posts.filter((p) => p.customerId === customerId && Date.now() - p.createdAt < 60_000).length;
  if (recent >= 3) return res.status(429).json({ error: "You're posting fast — try again in a minute." });
  const image = saveImage(b.image);
  if (!image) return res.status(400).json({ error: 'Please attach a photo (JPEG/PNG under 3 MB).' });
  const post = { id: uid(), createdAt: Date.now(), customerId, author: str(b.author, 60) || 'Guest',
    caption: str(b.caption, 280) || '', image, likes: [], hidden: false };
  db.posts.unshift(post);
  save();
  pushPost(post);
  res.status(201).json(post);
});

app.post('/api/posts/:id/like', (req, res) => {
  const p = db.posts.find((x) => x.id === req.params.id && !x.hidden);
  const customerId = str(req.body?.customerId, 64);
  if (!p || !customerId) return res.status(404).json({ error: 'Not found' });
  p.likes = p.likes.includes(customerId) ? p.likes.filter((x) => x !== customerId) : [...p.likes, customerId];
  save();
  pushPost(p);
  res.json(p);
});

app.patch('/api/posts/:id', (req, res) => {
  const p = db.posts.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const owner = req.body?.customerId && req.body.customerId === p.customerId;
  if (!isStaff(req) && !owner) return res.status(403).json({ error: 'Not allowed' });
  if (typeof req.body.hidden === 'boolean') p.hidden = req.body.hidden;
  if (typeof req.body.featured === 'boolean' && isStaff(req)) p.featured = req.body.featured;
  save();
  pushPost(p);
  res.json(p);
});

app.delete('/api/posts/:id', (req, res) => {
  const p = db.posts.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const owner = req.query.customerId && req.query.customerId === p.customerId;
  if (!isStaff(req) && !owner) return res.status(403).json({ error: 'Not allowed' });
  db.posts = db.posts.filter((x) => x.id !== p.id);
  removeImage(p.image);
  save();
  for (const c of clients) send(c, 'post', { id: p.id, removed: true });
  res.json({ ok: true });
});

// ---------- ads / offers ----------
const PLACEMENTS = ['home', 'menu', 'book', 'social', 'tv'];
const CTA_TYPES = ['none', 'menu', 'item', 'book', 'code', 'social'];
function cleanAd(b, prev = {}) {
  const cta = b.cta || prev.cta || {};
  return {
    title: str(b.title, 60) ?? prev.title, subtitle: str(b.subtitle, 120) ?? prev.subtitle ?? '',
    emoji: str(b.emoji, 8) ?? prev.emoji ?? '✨', theme: str(b.theme, 20) ?? prev.theme ?? 'purple',
    cta: { label: str(cta.label, 24) || '', type: CTA_TYPES.includes(cta.type) ? cta.type : 'none', target: str(cta.target, 60) || '' },
    placements: Array.isArray(b.placements) ? b.placements.filter((p) => PLACEMENTS.includes(p)) : prev.placements ?? ['home'],
    active: typeof b.active === 'boolean' ? b.active : prev.active ?? true,
  };
}
app.post('/api/ads', requireStaff, (req, res) => {
  const ad = { id: uid(), createdAt: Date.now(), ...cleanAd(req.body || {}) };
  if (!ad.title) return res.status(400).json({ error: 'Title required' });
  if (req.body.image) ad.image = saveImage(req.body.image) || undefined;
  db.ads.unshift(ad);
  save(); pushAds();
  res.status(201).json(ad);
});
app.patch('/api/ads/:id', requireStaff, (req, res) => {
  const i = db.ads.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  const prev = db.ads[i];
  const next = { ...prev, ...cleanAd(req.body || {}, prev) };
  if (req.body.image) { removeImage(prev.image); next.image = saveImage(req.body.image) || undefined; }
  if (req.body.removeImage) { removeImage(prev.image); delete next.image; }
  db.ads[i] = next;
  save(); pushAds();
  res.json(next);
});
app.delete('/api/ads/:id', requireStaff, (req, res) => {
  const ad = db.ads.find((x) => x.id === req.params.id);
  if (!ad) return res.status(404).json({ error: 'Not found' });
  removeImage(ad.image);
  db.ads = db.ads.filter((x) => x.id !== ad.id);
  save(); pushAds();
  res.json({ ok: true });
});

// ---------- demo data ----------
app.post('/api/demo', requireStaff, (_req, res) => {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const mk = (customer, mins, status, table, items) => {
    const lines = items.map(([itemId, name, unitPrice, qty]) => ({ key: itemId, itemId, name, unitPrice, qty, choices: [] }));
    const subtotal = round(lines.reduce((s, l) => s + l.unitPrice * l.qty, 0));
    const serviceFee = round(subtotal * SERVICE_FEE_RATE);
    return { id: uid(), code: code('RZ'), createdAt: now - mins * 60000, updatedAt: now, customer, customerId: `demo-${customer}`,
      lines, subtotal, discount: 0, serviceFee, tip: 3, total: round(subtotal + serviceFee + 3), fulfilment: 'table', table, status };
  };
  db.orders.unshift(
    mk('Amara', 2, 'new', '7', [['rizz-royale', 'Rizz Royale', 16, 2], ['truffle-fries', 'Truffle Parm Fries', 9, 1]]),
    mk('Leo', 6, 'preparing', '3', [['espresso-martini', 'Espresso Martini', 15, 3]]),
    mk('Zuri', 11, 'ready', 'Bar 2', [['burger', 'The Rizz Burger', 19, 1], ['grey-goose', 'Grey Goose', 12, 2]]),
    mk('Amara', 60 * 24 * 3, 'served', '4', [['moet', 'Moët & Chandon Brut', 95, 1], ['tequila-shot', 'Tequila Shot', 6, 4]]),
  );
  db.bookings.unshift(
    { id: uid(), code: code('BK'), createdAt: now, spaceId: 'rooftop', spaceName: 'Rooftop Terrace', date: today, time: '21:00',
      durationHrs: 3, guests: 6, customer: 'Kai', phone: '+1 555 0199', occasion: 'Birthday', status: 'pending', customerId: 'demo-Kai' },
  );
  save();
  pushSnapshotAll();
  res.json({ ok: true });
});

// ---------- web app ----------
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Rizz backend listening on http://0.0.0.0:${PORT}`);
  if (STAFF_PIN === '1234') console.log('⚠  Using default staff PIN 1234 — set STAFF_PIN in production.');
});
