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
import { CALLBACK_SECRET, PUBLIC_URL, friendlyResult, mpesaInfo, normalizePhone, parseCallback, stkPush, stkQuery } from './mpesa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const STAFF_PIN = process.env.STAFF_PIN || '1234';
// Owner / manager PIN: full control (prices, images, menu, settings). Staff PIN: day-to-day operations only.
const ADMIN_PIN = process.env.ADMIN_PIN || (process.env.STAFF_PIN ? process.env.STAFF_PIN : '0000');
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');
const UPLOAD_DIR = path.join(path.dirname(DATA_FILE), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- persistence ----------
// Prices are in Kenyan shillings (M-Pesa). 1 point per KSh 100 spent; 100 points → KSh 1,000 reward code.
const DEFAULT_SETTINGS = { rewardThreshold: 100, rewardValue: 1000, pointsPerUnit: 0.01,
  // Rizz Wallet: bonus % credited on top-ups of at least walletBonusMin (0 = no bonus)
  walletBonusPercent: 0, walletBonusMin: 2000 };
const now0 = Date.now();
const DEFAULT_ADS = [
  { id: 'ad-happy', title: 'Happy Hour 2-for-1', subtitle: 'All classic cocktails, 4–7 PM daily', emoji: '🍸', theme: 'purple',
    cta: { label: 'Order now', type: 'menu', target: 'cocktails' }, placements: ['home', 'menu', 'events', 'tv'], active: true, createdAt: now0 },
  { id: 'ad-app', title: '10% off your first app order', subtitle: 'Use code WELCOME10 at checkout', emoji: '📱', theme: 'lime',
    cta: { label: 'Get code', type: 'code', target: 'WELCOME10' }, placements: ['home', 'menu', 'social', 'events', 'tv'], active: true, createdAt: now0 },
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

// Demo events, dated relative to first run
const dayAt = (days, hh) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hh, 0, 0, 0); return d.getTime(); };
const nextDow = (dow) => { const d = new Date(); return (dow - d.getDay() + 7) % 7 || 7; };
const DEFAULT_EVENTS = [
  { id: 'ev-rooftop', title: 'Rooftop Sessions: Afro House', subtitle: 'Resident DJs till late', emoji: '🎧', theme: 'blue',
    startsAt: dayAt(nextDow(5), 21), endsAt: dayAt(nextDow(5) + 1, 3), location: 'Rooftop Terrace',
    description: 'Afro house & amapiano on the rooftop with city views, heaters and a fully stocked bar. Early-bird tickets include a welcome cocktail.',
    ticketTypes: [{ id: 'tt-early', name: 'Early bird + welcome cocktail', price: 1500, capacity: 60 }, { id: 'tt-reg', name: 'Regular', price: 2000, capacity: 150 }, { id: 'tt-vip', name: 'VIP table (6 guests)', price: 25000, capacity: 6 }],
    featured: true, published: true, createdAt: now0 },
  { id: 'ev-whisky', title: 'Whisky Tasting Masterclass', subtitle: '6 drams · guided by our head bartender', emoji: '🥃', theme: 'orange',
    startsAt: dayAt(nextDow(3), 19), endsAt: dayAt(nextDow(3), 21), location: 'VIP Room',
    description: 'Taste six whiskies from Scotland, Ireland, the US and Japan, paired with small bites. Limited seats.',
    ticketTypes: [{ id: 'tt-seat', name: 'Seat', price: 4500, capacity: 20 }], featured: true, published: true, createdAt: now0 },
  { id: 'ev-ladies', title: 'Ladies Night', subtitle: 'Free welcome shot for the ladies', emoji: '💃', theme: 'pink',
    startsAt: dayAt(nextDow(3), 20), endsAt: dayAt(nextDow(4), 1), location: 'Main Bar',
    description: 'Every Wednesday — free welcome shot, cocktail specials and the best R&B all night. Free entry, RSVP to skip the queue.',
    ticketTypes: [{ id: 'tt-free', name: 'Free RSVP', price: 0, capacity: 200 }], featured: false, published: true, createdAt: now0 },
  { id: 'ev-football', title: 'Big Match Screening', subtitle: 'Giant screen · bucket deals', emoji: '⚽', theme: 'lime',
    startsAt: dayAt(nextDow(6), 18), endsAt: dayAt(nextDow(6), 21), location: 'Main Bar',
    description: 'Watch the big game on our giant screen. Reserve a table ticket and get a beer bucket at a special price.',
    ticketTypes: [{ id: 'tt-entry', name: 'Entry', price: 0, capacity: 120 }, { id: 'tt-table', name: 'Table for 4 + bucket of 5', price: 4000, capacity: 15 }],
    featured: false, published: true, createdAt: now0 },
];

const SEED_SPACES = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-spaces.json'), 'utf8'));
const DEFAULT_CONTENT = {
  bar: { name: 'Rizz', tagline: 'Cocktail Bar & Lounge', address: '12 Velvet Lane, Westlands, Nairobi', hours: '4:00 PM – 2:00 AM',
    phone: '+254 700 000 000', serviceFeeRate: 0.05 },
  welcome: { title: 'Sip, Snack & Book Your Spot.', subtitle: 'Order cocktails and bites straight to your table, or reserve the best seats in the house.', images: [] },
  home: { headline: "What's your vibe tonight?", orderImage: null, bookImage: null },
};

const SEED_MENU = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-menu.json'), 'utf8'));

let db = { happyHours: [{ id: 'hh-cocktails', name: 'Happy Hour', category: 'cocktails', percent: 20, days: [1, 2, 3, 4, 5], start: '16:00', end: '19:00', active: false }], wallets: {}, walletTx: [], topups: [], content: DEFAULT_CONTENT, spaces: SEED_SPACES, payments: [], events: DEFAULT_EVENTS, tickets: [], menu: SEED_MENU, orders: [], bookings: [], posts: [], ads: DEFAULT_ADS, vouchers: DEFAULT_VOUCHERS, customers: {}, settings: DEFAULT_SETTINGS };
try {
  db = { ...db, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
  db.settings = { ...DEFAULT_SETTINGS, ...db.settings };
  db.content = { bar: { ...DEFAULT_CONTENT.bar, ...db.content?.bar }, welcome: { ...DEFAULT_CONTENT.welcome, ...db.content?.welcome }, home: { ...DEFAULT_CONTENT.home, ...db.content?.home } };
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
/** token → 'admin' | 'staff' */
const tokens = new Map();
const tokenOf = (req) => (req.headers.authorization || '').replace(/^Bearer /, '') || String(req.query.token || '');
const isStaff = (req) => tokens.has(tokenOf(req));
const isAdmin = (req) => tokens.get(tokenOf(req)) === 'admin';
const requireStaff = (req, res, next) => (isStaff(req) ? next() : res.status(401).json({ error: 'Staff login required' }));
const requireAdmin = (req, res, next) => (isAdmin(req) ? next() : res.status(isStaff(req) ? 403 : 401).json({ error: isStaff(req) ? 'Only an admin (manager PIN) can change this.' : 'Staff login required' }));
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

// ---------- happy hours (scheduled automatic offers, Nairobi time) ----------
function nairobiNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
  return { day, minutes: Number(g('hour')) * 60 + Number(g('minute')) };
}
const toMin = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
/** Happy hours running right now. Windows may cross midnight (e.g. 22:00–02:00 counts for the start day). */
function activeHappyHours() {
  const { day, minutes } = nairobiNow();
  return (db.happyHours || []).filter((h) => {
    if (!h.active) return false;
    const a = toMin(h.start), b = toMin(h.end);
    if (a <= b) return h.days.includes(day) && minutes >= a && minutes < b;
    const prevDay = (day + 6) % 7;
    return (h.days.includes(day) && minutes >= a) || (h.days.includes(prevDay) && minutes < b);
  });
}
/** Item with the best current price applied (offer price or running happy hour). */
function effectiveItem(item, hhs = activeHappyHours()) {
  const hh = hhs.filter((h) => h.category === 'all' || h.category === item.category).sort((x, y) => y.percent - x.percent)[0];
  if (!hh) return item;
  const hhPrice = Math.round(item.price * (1 - hh.percent / 100));
  if (item.offerPrice != null && item.offerPrice <= hhPrice) return item;
  return { ...item, offerPrice: hhPrice, happyHour: `${hh.name} −${hh.percent}%` };
}

// ---------- menu pricing (mirrors src/data/menu.ts unitPrice) ----------
/** Unit price for an item given the chosen option names, in option order. Returns null if a choice is invalid. */
function priceFor(rawItem, choiceNames = []) {
  const item = effectiveItem(rawItem);
  const basePrice = item.offerPrice ?? item.price;
  let base = basePrice, extra = 0;
  const groups = item.options || [];
  for (let i = 0; i < groups.length; i++) {
    const c = groups[i].choices.find((x) => x.name === choiceNames[i]) ?? groups[i].choices[0];
    if (!c) continue;
    if (c.name.startsWith('Double')) base = basePrice * 2;
    else if (c.name.startsWith('Bottle (')) base = 0;
    extra += c.price;
  }
  return round(base + extra);
}
const CATEGORY_IDS = ['cocktails', 'vodka', 'gin', 'whiskey', 'rum', 'tequila', 'wine', 'beer', 'champagne', 'liqueurs', 'shots',
  'soft', 'mocktails', 'small-plates', 'mains', 'desserts'];

const ORDER_STATUSES = ['new', 'preparing', 'ready', 'served', 'cancelled'];
const BOOKING_STATUSES = ['pending', 'confirmed', 'declined', 'checked-in', 'cancelled'];
const ACTIVE_BOOKING = ['pending', 'confirmed', 'checked-in'];

// ---------- Rizz Wallet ----------
const walletOf = (customerId) => (db.wallets[customerId] ||= { balance: 0, updatedAt: Date.now() });
function walletView(customerId) {
  const w = db.wallets[customerId] || { balance: 0 };
  return { balance: w.balance, tx: db.walletTx.filter((t) => t.customerId === customerId).slice(0, 40),
    topups: db.topups.filter((t) => t.customerId === customerId).slice(0, 5) };
}
/** Move money in/out of a wallet and record it. amount > 0 credits, < 0 debits. Returns the tx or null if insufficient. */
function walletTx(customerId, amount, type, { ref, note, by } = {}) {
  const w = walletOf(customerId);
  amount = Math.round(amount);
  if (amount < 0 && w.balance + amount < 0) return null;
  w.balance += amount; w.updatedAt = Date.now();
  const tx = { id: uid(), customerId, type, amount, ref, note, by, at: Date.now(), balanceAfter: w.balance };
  db.walletTx.unshift(tx);
  return tx;
}
function pushWallet(customerId) {
  for (const c of clients) if (c.customerId === customerId) send(c, 'wallet', walletView(customerId));
  for (const c of clients) if (c.staff) send(c, 'walletChanged', { customerId });
}
/** Refund a wallet-paid order/ticket back to the wallet (on cancel). */
function refundToWallet(r, label) {
  if (r.payment?.method !== 'wallet' || r.payment.status !== 'paid' || !r.customerId) return false;
  walletTx(r.customerId, r.payment.amount, 'refund', { ref: r.code, note: `Refund — ${label} cancelled` });
  r.payment = { ...r.payment, status: 'refunded' };
  pushWallet(r.customerId);
  return true;
}
/** Pay an order/ticket from the wallet. Returns an error string or null. */
function payFromWallet(r, label) {
  if (!r.customerId) return 'Sign in to use your wallet.';
  const amount = Math.ceil(r.total);
  if (amount <= 0) return 'Nothing to pay.';
  const tx = walletTx(r.customerId, -amount, 'payment', { ref: r.code, note: label });
  if (!tx) return `Not enough in your Rizz Wallet (balance KSh ${walletOf(r.customerId).balance.toLocaleString('en-KE')}, need KSh ${amount.toLocaleString('en-KE')}). Top up or choose another payment method.`;
  r.payment = { method: 'wallet', status: 'paid', amount, paidAt: Date.now(), txId: tx.id };
  pushWallet(r.customerId);
  return null;
}

// ---------- customers, points & rewards ----------
function customerStats(customerId) {
  const mine = db.orders.filter((o) => o.customerId === customerId);
  const served = mine.filter((o) => o.status === 'served');
  const paidTickets = db.tickets.filter((t) => t.customerId === customerId && (t.status === 'paid' || t.status === 'checked-in'));
  const spent = round(served.reduce((s, o) => s + o.total, 0) + paidTickets.reduce((s, t) => s + t.total, 0));
  const points = Math.floor(spent * db.settings.pointsPerUnit);
  const last = mine.reduce((m, o) => Math.max(m, o.createdAt), 0);
  const profile = db.customers[customerId] || {};
  return { customerId, name: profile.name || mine[0]?.customer || 'Guest', phone: profile.phone || mine[0]?.phone,
    tickets: db.tickets.filter((t) => t.customerId === customerId && t.status !== 'cancelled').reduce((n, t) => n + t.units.length, 0),
    wallet: db.wallets[customerId]?.balance ?? 0,
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
    role: c.role || null,
    wallet: c.customerId ? walletView(c.customerId) : null,
    content: db.content,
    spaces: c.staff ? db.spaces : db.spaces.filter((x) => x.active !== false),
    mpesa: mpesaInfo(),
    menu: menuView(c),
    happyHours: c.staff ? db.happyHours : activeHappyHours().map(({ name, category, percent, end }) => ({ name, category, percent, end })),
    events: (c.staff ? db.events : db.events.filter((e) => e.published)).map(withSales),
    tickets: c.staff ? db.tickets : db.tickets.filter((t) => t.customerId && t.customerId === c.customerId),
  };
}
/** Event + tickets sold per type (public — counts only). */
function withSales(e) {
  const sold = {};
  for (const t of db.tickets) if (t.eventId === e.id && t.status !== 'cancelled') for (const l of t.lines) sold[l.typeId] = (sold[l.typeId] || 0) + l.qty;
  return { ...e, sold };
}
function pushEvents() { for (const c of clients) send(c, 'events', (c.staff ? db.events : db.events.filter((e) => e.published)).map(withSales)); }
function pushTicket(t) {
  for (const c of clients) {
    if (c.staff || (t.customerId && c.customerId === t.customerId)) send(c, 'ticket', t);
    if (t.customerId && c.customerId === t.customerId) send(c, 'me', customerStats(t.customerId));
  }
  pushEvents();
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
  const c = { res, staff: isStaff(req), role: tokens.get(tokenOf(req)) || null, customerId: str(req.query.customerId, 64) };
  send(c, 'snapshot', viewFor(c));
  clients.add(c);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); clients.delete(c); });
});

app.post('/api/staff/login', (req, res) => {
  const pin = str(req.body?.pin, 20);
  const role = pin === ADMIN_PIN ? 'admin' : pin === STAFF_PIN ? 'staff' : null;
  if (!role) return res.status(401).json({ error: 'Wrong PIN' });
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, role);
  res.json({ token, role });
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
  res.json({ code: v.code, description: v.description, discount: Math.round(d.discount) });
});

app.post('/api/vouchers', requireAdmin, (req, res) => {
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

app.patch('/api/vouchers/:id', requireAdmin, (req, res) => {
  const v = db.vouchers.find((x) => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  if (typeof req.body?.active === 'boolean') v.active = req.body.active;
  save(); pushVouchers(v.customerId);
  res.json(v);
});

app.patch('/api/settings', requireAdmin, (req, res) => {
  const b = req.body || {};
  db.settings = { ...db.settings,
    rewardThreshold: num(b.rewardThreshold, 0, 1e6, db.settings.rewardThreshold),
    rewardValue: num(b.rewardValue, 0, 1e6, db.settings.rewardValue),
    walletBonusPercent: b.walletBonusPercent !== undefined ? num(b.walletBonusPercent, 0, 50, 0) : db.settings.walletBonusPercent,
    walletBonusMin: b.walletBonusMin !== undefined ? num(b.walletBonusMin, 0, 1e6, 0) : db.settings.walletBonusMin };
  save(); pushSnapshotAll();
  res.json(db.settings);
});

app.get('/api/customers', requireAdmin, (_req, res) => {
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
  // Prices come from the bar's menu, never from the phone.
  for (const l of clean) {
    const item = db.menu.find((m) => m.id === l.itemId);
    if (!item) return res.status(400).json({ error: `${l.name} is no longer on the menu — please remove it from your order.` });
    if (item.available === false) return res.status(400).json({ error: `Sorry, ${item.name} is sold out right now.` });
    l.name = item.name;
    l.unitPrice = priceFor(item, l.choices);
  }
  // table = bring to my seat (seat required) · pickup = collect at the bar · find = no seat, staff find the guest by name
  const fulfilment = ['pickup', 'find'].includes(b.fulfilment) ? b.fulfilment : 'table';
  const table = fulfilment === 'table' ? str(b.table, 20) : undefined;
  if (fulfilment === 'table' && !table) return res.status(400).json({ error: 'Table number required' });
  const locationHint = fulfilment === 'find' ? str(b.locationHint, 80) : undefined;
  const customerId = str(b.customerId, 64);

  const subtotal = round(clean.reduce((s, l) => s + l.unitPrice * l.qty, 0));
  let discount = 0, voucher = null;
  if (b.voucherCode) {
    voucher = findVoucher(b.voucherCode);
    const err = voucher ? voucherUsable(voucher, customerId) : "We don't recognise that code.";
    if (err) return res.status(400).json({ error: err });
    const d = discountFor(voucher, subtotal);
    if (d.error) return res.status(400).json({ error: d.error });
    discount = Math.round(d.discount);
  }
  const net = round(subtotal - discount);
  const serviceFee = Math.round(net * db.content.bar.serviceFeeRate);
  const tip = Math.round(Math.min(subtotal, Math.max(0, Number(b.tip) || 0)));
  const now = Date.now();
  const order = { id: uid(), code: code('RZ'), createdAt: now, updatedAt: now, source: 'app',
    customerId, customer: str(b.customer, 60) || 'Guest', phone: str(b.phone, 30),
    lines: clean, subtotal, discount, voucherCode: voucher?.code, serviceFee, tip, total: round(net + serviceFee + tip),
    fulfilment, table, locationHint, notes: str(b.notes, 300), status: 'new',
    payment: { method: b.paymentMethod === 'mpesa' ? 'mpesa' : 'cash', status: 'unpaid' } };
  if (b.paymentMethod === 'wallet') {
    const err = payFromWallet(order, 'Bar order');
    if (err) return res.status(402).json({ error: err });
  }
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
    if (!staff && ['paid', 'pending'].includes(o.payment?.status)) return res.status(400).json({ error: 'This order is paid (or payment is in progress) — please ask a member of staff to cancel it.' });
    // A cancelled order gives its voucher back
    if (status === 'cancelled' && o.status !== 'cancelled') refundToWallet(o, `order ${o.code}`);
    if (status === 'cancelled' && o.voucherCode) {
      const v = findVoucher(o.voucherCode);
      if (v) { v.redemptions = v.redemptions.filter((r) => r.orderId !== o.id); pushVouchers(v.customerId || o.customerId); }
    }
    o.status = status;
  }
  if (req.body?.markPaid !== undefined) {
    if (!staff) return res.status(403).json({ error: 'Not allowed' });
    o.payment = req.body.markPaid
      ? { ...o.payment, method: o.payment?.status === 'paid' ? o.payment.method : 'cash', status: 'paid', amount: o.payment?.amount ?? Math.ceil(o.total), paidAt: Date.now() }
      : { method: 'cash', status: 'unpaid' };
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
  const space = db.spaces.find((x) => x.id === booking.spaceId && x.active !== false);
  if (!space) return res.status(400).json({ error: 'That space is not available for booking.' });
  booking.spaceName = space.name;
  if (booking.guests < space.capacity[0] || booking.guests > space.capacity[1])
    return res.status(400).json({ error: `${space.name} fits ${space.capacity[0]}–${space.capacity[1]} guests.` });
  const clash = !space.multiParty && db.bookings.some((x) =>
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

// ---------- events & tickets ----------
function cleanEvent(b, prev = {}) {
  const types = Array.isArray(b.ticketTypes) ? b.ticketTypes.slice(0, 8).map((t) => ({
    id: str(t.id, 40) || `tt-${crypto.randomBytes(3).toString('hex')}`, name: str(t.name, 50) || 'Ticket',
    price: num(t.price, 0, 1e6, 0), capacity: num(t.capacity, 1, 100000, 100) })) : prev.ticketTypes ?? [];
  const ts = (v, d) => (v === undefined ? d : Number(new Date(v)) || d);
  return {
    title: str(b.title, 80) ?? prev.title, subtitle: str(b.subtitle, 120) ?? prev.subtitle ?? '',
    description: str(b.description, 1500) ?? prev.description ?? '', location: str(b.location, 60) ?? prev.location ?? '',
    emoji: str(b.emoji, 8) ?? prev.emoji ?? '🎉', theme: str(b.theme, 20) ?? prev.theme ?? 'purple',
    startsAt: ts(b.startsAt, prev.startsAt), endsAt: ts(b.endsAt, prev.endsAt),
    ticketTypes: types.length ? types : [{ id: 'tt-free', name: 'Free RSVP', price: 0, capacity: 100 }],
    featured: typeof b.featured === 'boolean' ? b.featured : prev.featured ?? false,
    published: typeof b.published === 'boolean' ? b.published : prev.published ?? true,
  };
}
app.post('/api/events', requireAdmin, (req, res) => {
  const ev = { id: uid(), createdAt: Date.now(), ...cleanEvent(req.body || {}) };
  if (!ev.title || !ev.startsAt) return res.status(400).json({ error: 'Title and start time required' });
  if (req.body.image) ev.image = saveImage(req.body.image) || undefined;
  db.events.unshift(ev);
  save(); pushEvents();
  res.status(201).json(ev);
});
app.patch('/api/events/:id', requireAdmin, (req, res) => {
  const i = db.events.findIndex((e) => e.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  const prev = db.events[i];
  const next = { ...prev, ...cleanEvent(req.body || {}, prev) };
  if (req.body.image) { removeImage(prev.image); next.image = saveImage(req.body.image) || undefined; }
  if (req.body.removeImage) { removeImage(prev.image); delete next.image; }
  db.events[i] = next;
  save(); pushEvents();
  res.json(next);
});
app.delete('/api/events/:id', requireAdmin, (req, res) => {
  const ev = db.events.find((e) => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'Not found' });
  if (db.tickets.some((t) => t.eventId === ev.id && t.status !== 'cancelled'))
    return res.status(409).json({ error: 'Tickets have been sold — unpublish the event instead, or cancel its tickets first.' });
  removeImage(ev.image);
  db.events = db.events.filter((e) => e.id !== ev.id);
  save(); pushEvents();
  res.json({ ok: true });
});

app.post('/api/events/:id/tickets', (req, res) => {
  const ev = db.events.find((e) => e.id === req.params.id && e.published);
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  if ((ev.endsAt || ev.startsAt) < Date.now()) return res.status(400).json({ error: 'This event has already happened.' });
  const b = req.body || {};
  const customerId = str(b.customerId, 64);
  const customer = str(b.customer, 60), phone = str(b.phone, 30);
  if (!customerId || !customer) return res.status(400).json({ error: 'Please sign in first' });
  const sold = withSales(ev).sold;
  const lines = [];
  for (const it of Array.isArray(b.items) ? b.items : []) {
    const tt = ev.ticketTypes.find((t) => t.id === it.typeId);
    const qty = Math.floor(num(it.qty, 0, 20, 0));
    if (!tt || !qty) continue;
    const left = tt.capacity - (sold[tt.id] || 0);
    if (qty > left) return res.status(409).json({ error: left > 0 ? `Only ${left} "${tt.name}" ticket(s) left.` : `"${tt.name}" is sold out.` });
    lines.push({ typeId: tt.id, name: tt.name, price: tt.price, qty });
  }
  if (!lines.length) return res.status(400).json({ error: 'Choose at least one ticket' });
  const total = round(lines.reduce((s, l) => s + l.price * l.qty, 0));
  const units = lines.flatMap((l) => Array.from({ length: l.qty }, () => ({
    code: `TK-${crypto.randomBytes(3).toString('hex').toUpperCase()}`, typeId: l.typeId, typeName: l.name, checkedInAt: null })));
  const t = { id: uid(), code: code('TO'), createdAt: Date.now(), eventId: ev.id, eventTitle: ev.title, startsAt: ev.startsAt,
    location: ev.location, customerId, customer, phone, lines, total, units,
    status: total === 0 ? 'paid' : 'reserved', // free RSVPs need no payment
    payment: { method: total === 0 ? 'free' : 'unpaid', status: total === 0 ? 'paid' : 'unpaid' } };
  if (total > 0 && b.payWith === 'wallet') {
    const err = payFromWallet(t, `Tickets — ${ev.title}`);
    if (err) return res.status(402).json({ error: err });
    t.status = 'paid';
  }
  db.tickets.unshift(t);
  if (t.payment.method === 'wallet' && issueRewards(customerId)) pushVouchers(customerId);
  save(); pushTicket(t);
  res.status(201).json(t);
});

app.patch('/api/tickets/:id', (req, res) => {
  const t = db.tickets.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const { status, customerId } = req.body || {};
  if (!['reserved', 'paid', 'checked-in', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Bad status' });
  const owner = customerId && customerId === t.customerId;
  if (!isStaff(req) && !(owner && status === 'cancelled' && t.status === 'reserved')) return res.status(403).json({ error: 'Not allowed' });
  if (!isStaff(req) && t.payment?.status === 'pending') return res.status(400).json({ error: 'Payment is in progress — wait for it to finish.' });
  if (status === 'cancelled' && t.status !== 'cancelled') refundToWallet(t, `tickets ${t.code}`);
  if ((status === 'paid' || status === 'checked-in') && t.payment?.status !== 'paid' && t.total > 0)
    t.payment = { method: 'cash', status: 'paid', amount: Math.ceil(t.total), paidAt: Date.now() };
  t.status = status;
  if (status === 'checked-in') t.units.forEach((u) => (u.checkedInAt ||= Date.now()));
  const rewarded = (status === 'paid' || status === 'checked-in') && issueRewards(t.customerId);
  save(); pushTicket(t);
  if (rewarded) pushVouchers(t.customerId);
  res.json(t);
});

// Door check-in: scan/type a single ticket code
app.post('/api/tickets/checkin', requireStaff, (req, res) => {
  const c = String(req.body?.code || '').trim().toUpperCase();
  const t = db.tickets.find((x) => x.units.some((u) => u.code === c));
  if (!t) return res.status(404).json({ error: `No ticket ${c}` });
  if (t.status === 'cancelled') return res.status(400).json({ error: `${c} was cancelled` });
  const u = t.units.find((x) => x.code === c);
  if (u.checkedInAt) return res.status(409).json({ error: `${c} already checked in at ${new Date(u.checkedInAt).toLocaleTimeString()}` });
  u.checkedInAt = Date.now();
  const wasUnpaid = t.status === 'reserved';
  if (t.units.every((x) => x.checkedInAt)) t.status = 'checked-in';
  save(); pushTicket(t);
  res.json({ ticket: t, unit: u, unpaid: wasUnpaid });
});

// ---------- M-Pesa payments ----------
function payableRef(kind, refId) {
  if (kind === 'order') {
    const o = db.orders.find((x) => x.id === refId);
    return o && { ref: o, amount: Math.ceil(o.total), reference: o.code, description: 'Rizz order', customerId: o.customerId,
      blocked: o.status === 'cancelled' ? 'This order was cancelled.' : o.payment?.status === 'paid' ? 'Already paid.' : null };
  }
  if (kind === 'ticket') {
    const t = db.tickets.find((x) => x.id === refId);
    return t && { ref: t, amount: Math.ceil(t.total), reference: t.code, description: 'Rizz tickets', customerId: t.customerId,
      blocked: t.status === 'cancelled' ? 'These tickets were cancelled.' : t.payment?.status === 'paid' ? 'Already paid.' : t.total <= 0 ? 'Nothing to pay.' : null };
  }
  if (kind === 'topup') {
    const t = db.topups.find((x) => x.id === refId);
    return t && { ref: t, amount: t.amount, reference: 'WALLET', description: 'Rizz Wallet', customerId: t.customerId,
      blocked: t.payment?.status === 'paid' ? 'Already credited.' : null };
  }
  return null;
}

function applyPaymentResult(result) {
  if (!result?.checkoutRequestId) return;
  const p = db.payments.find((x) => x.checkoutRequestId === result.checkoutRequestId);
  if (!p || p.status !== 'pending') return; // unknown or already settled (callbacks can repeat)
  const target = payableRef(p.kind, p.refId);
  const ok = result.success && (result.amount === undefined || Number(result.amount) >= p.amount);
  p.status = ok ? 'success' : 'failed';
  p.receipt = result.receipt; p.resultCode = result.resultCode; p.resultDesc = result.resultDesc; p.settledAt = Date.now();
  if (target) {
    const r = target.ref;
    r.payment = ok
      ? { method: 'mpesa', status: 'paid', receipt: result.receipt, phone: p.phone, amount: p.amount, paidAt: Date.now(), paymentId: p.id }
      : { method: 'mpesa', status: 'failed', phone: p.phone, amount: p.amount, message: friendlyResult(result.resultCode, result.resultDesc), paymentId: p.id };
    if (p.kind === 'topup') {
      if (ok) {
        walletTx(r.customerId, r.amount, 'topup', { ref: result.receipt, note: 'M-Pesa top-up' });
        const { walletBonusPercent: pct, walletBonusMin: min } = db.settings;
        if (pct > 0 && r.amount >= min) {
          r.bonus = Math.round(r.amount * pct / 100);
          walletTx(r.customerId, r.bonus, 'bonus', { ref: result.receipt, note: `${pct}% top-up bonus` });
        }
      }
      pushWallet(r.customerId);
    } else if (p.kind === 'ticket') {
      if (ok && r.status === 'reserved') r.status = 'paid';
      const rewarded = ok && issueRewards(r.customerId);
      pushTicket(r);
      if (rewarded) pushVouchers(r.customerId);
    } else {
      pushOrder(r);
    }
  }
  save();
}

app.post('/api/payments/mpesa', async (req, res) => {
  const { kind, refId, customerId } = req.body || {};
  const target = payableRef(kind, refId);
  if (!target) return res.status(404).json({ error: 'Nothing to pay for.' });
  if (!isStaff(req) && (!customerId || customerId !== target.customerId)) return res.status(403).json({ error: 'Not allowed' });
  if (target.blocked) return res.status(400).json({ error: target.blocked });
  const phone = normalizePhone(req.body.phone);
  if (!phone) return res.status(400).json({ error: 'Enter a valid Safaricom number, e.g. 0712 345 678.' });
  const recent = db.payments.find((x) => x.refId === refId && x.status === 'pending' && Date.now() - x.createdAt < 60_000);
  if (recent) return res.status(429).json({ error: 'A prompt was just sent — check your phone, or wait a minute to resend.' });
  try {
    const p = { id: uid(), kind, refId, phone, amount: target.amount, status: 'pending', createdAt: Date.now() };
    const r = await stkPush({ phone, amount: target.amount, reference: target.reference, description: target.description,
      onMockResult: (result) => applyPaymentResult(result) });
    p.checkoutRequestId = r.checkoutRequestId; p.merchantRequestId = r.merchantRequestId;
    db.payments.unshift(p);
    target.ref.payment = { method: 'mpesa', status: 'pending', phone, amount: target.amount, paymentId: p.id };
    save();
    kind === 'ticket' ? pushTicket(target.ref) : kind === 'topup' ? pushWallet(target.customerId) : pushOrder(target.ref);
    res.json({ paymentId: p.id, amount: p.amount, message: r.message, mode: mpesaInfo().mode });
  } catch (e) {
    res.status(502).json({ error: e.message || 'M-Pesa is unavailable right now. Try again or pay at the bar.' });
  }
});

// Daraja calls this with the result of the PIN prompt
app.post(`/api/mpesa/callback/:secret`, (req, res) => {
  if (req.params.secret !== CALLBACK_SECRET) return res.status(404).end();
  applyPaymentResult(parseCallback(req.body));
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// Client polls this while waiting; falls back to Daraja's status query if no callback arrived
app.post('/api/payments/:id/status', async (req, res) => {
  const p = db.payments.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (p.status === 'pending' && Date.now() - p.createdAt > 12_000) {
    try {
      const q = await stkQuery(p.checkoutRequestId);
      if (q) applyPaymentResult(q);
    } catch { /* keep waiting */ }
    // Give up after 3 minutes with no answer
    if (p.status === 'pending' && Date.now() - p.createdAt > 180_000) applyPaymentResult({ checkoutRequestId: p.checkoutRequestId, success: false, resultCode: 1019, resultDesc: 'Timed out' });
  }
  res.json({ status: p.status, receipt: p.receipt, message: p.status === 'failed' ? friendlyResult(p.resultCode, p.resultDesc) : undefined });
});

app.get('/api/payments', requireStaff, (_req, res) => res.json(db.payments.slice(0, 200)));

// ---------- wallet endpoints ----------
app.get('/api/wallet', (req, res) => {
  const id = str(req.query.customerId, 64);
  if (!id) return res.status(400).json({ error: 'customerId required' });
  res.json(walletView(id));
});

// Start a top-up: creates the request; the client then calls /api/payments/mpesa with kind "topup"
app.post('/api/wallet/topups', (req, res) => {
  const customerId = str(req.body?.customerId, 64);
  const amount = Math.round(num(req.body?.amount, 0, 1e7, 0));
  if (!customerId) return res.status(400).json({ error: 'Sign in first' });
  if (amount < 50) return res.status(400).json({ error: 'Minimum top-up is 50.' });
  if (amount > 150000) return res.status(400).json({ error: 'Maximum top-up is 150,000 per transaction.' });
  const t = { id: uid(), customerId, amount, createdAt: Date.now(), payment: { method: 'mpesa', status: 'unpaid' } };
  db.topups.unshift(t);
  save();
  res.status(201).json(t);
});

// Pay an existing (unpaid) order or ticket purchase from the wallet
app.post('/api/wallet/pay', (req, res) => {
  const { kind, refId, customerId } = req.body || {};
  const target = kind === 'order' || kind === 'ticket' ? payableRef(kind, refId) : null;
  if (!target) return res.status(404).json({ error: 'Nothing to pay for.' });
  if (!customerId || customerId !== target.customerId) return res.status(403).json({ error: 'Not allowed' });
  if (target.blocked) return res.status(400).json({ error: target.blocked });
  if (target.ref.payment?.status === 'pending') return res.status(400).json({ error: 'An M-Pesa payment is in progress for this.' });
  const err = payFromWallet(target.ref, kind === 'ticket' ? `Tickets — ${target.ref.eventTitle}` : 'Bar order');
  if (err) return res.status(402).json({ error: err });
  if (kind === 'ticket') {
    if (target.ref.status === 'reserved') target.ref.status = 'paid';
    if (issueRewards(target.ref.customerId)) pushVouchers(target.ref.customerId);
    pushTicket(target.ref);
  } else pushOrder(target.ref);
  save();
  res.json(target.ref);
});

// Staff: wallets overview; cash top-ups (staff) and adjustments (admin)
app.get('/api/wallets', requireStaff, (_req, res) => {
  // every known guest (so staff can find someone for a first cash top-up), richest wallets first
  const ids = new Set([...Object.keys(db.wallets), ...Object.keys(db.customers)]);
  const rows = [...ids].map((customerId) => {
    const st = customerStats(customerId);
    const w = db.wallets[customerId];
    return { customerId, name: st.name, phone: st.phone, balance: w?.balance ?? 0, updatedAt: w?.updatedAt ?? null };
  }).sort((a, b) => b.balance - a.balance || String(a.name).localeCompare(b.name));
  const sum = (type) => db.walletTx.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
  res.json({ rows, totals: { balance: rows.reduce((s, r) => s + r.balance, 0), topups: sum('topup') + sum('cash'), spent: -sum('payment') - sum('refund'), bonus: sum('bonus'), refunds: sum('refund') },
    recent: db.walletTx.slice(0, 50).map((t) => ({ ...t, name: customerStats(t.customerId).name })) });
});
app.post('/api/wallets/:customerId/adjust', requireStaff, (req, res) => {
  const customerId = req.params.customerId;
  const amount = Math.round(num(req.body?.amount, -1e7, 1e7, 0));
  const note = str(req.body?.note, 120);
  const cash = req.body?.type === 'cash';
  if (!amount) return res.status(400).json({ error: 'Enter an amount' });
  if (!cash && !isAdmin(req)) return res.status(403).json({ error: 'Only an admin can make adjustments. Staff can record cash top-ups.' });
  if (cash && amount < 0) return res.status(400).json({ error: 'Cash top-ups must be positive.' });
  if (!db.customers[customerId] && !db.orders.some((o) => o.customerId === customerId) && !db.wallets[customerId])
    return res.status(404).json({ error: 'Unknown guest' });
  const tx = walletTx(customerId, amount, cash ? 'cash' : 'adjust', { note: note || (cash ? 'Cash top-up at the bar' : 'Adjustment'), by: tokens.get(tokenOf(req)) });
  if (!tx) return res.status(400).json({ error: 'That would make the balance negative.' });
  if (cash) {
    const { walletBonusPercent: pct, walletBonusMin: min } = db.settings;
    if (pct > 0 && amount >= min) walletTx(customerId, Math.round(amount * pct / 100), 'bonus', { note: `${pct}% top-up bonus` });
  }
  save(); pushWallet(customerId);
  res.json(walletView(customerId));
});

// ---------- app content & spaces (admin) ----------
function pushContent() { for (const c of clients) send(c, 'content', db.content); }
function pushSpaces() { for (const c of clients) send(c, 'spaces', c.staff ? db.spaces : db.spaces.filter((x) => x.active !== false)); }
/** value: data URL → save new image; null → remove; undefined → keep */
function updateImage(prev, value) {
  if (value === undefined) return prev;
  if (value === null || value === '') { removeImage(prev); return null; }
  if (typeof value === 'string' && value.startsWith('data:')) { const url = saveImage(value); if (url) { removeImage(prev); return url; } }
  return prev;
}

app.patch('/api/content', requireAdmin, (req, res) => {
  const b = req.body || {};
  const c = db.content;
  if (b.bar) c.bar = { ...c.bar,
    name: str(b.bar.name, 40) ?? c.bar.name, tagline: str(b.bar.tagline, 60) ?? c.bar.tagline,
    address: str(b.bar.address, 120) ?? c.bar.address, hours: str(b.bar.hours, 60) ?? c.bar.hours,
    phone: str(b.bar.phone, 30) ?? c.bar.phone, serviceFeeRate: b.bar.serviceFeeRate !== undefined ? num(b.bar.serviceFeeRate, 0, 0.3, c.bar.serviceFeeRate) : c.bar.serviceFeeRate };
  if (b.welcome) {
    c.welcome = { ...c.welcome, title: str(b.welcome.title, 80) ?? c.welcome.title, subtitle: str(b.welcome.subtitle, 200) ?? c.welcome.subtitle };
    if (Array.isArray(b.welcome.images)) {
      // array of: existing URL (keep) | data URL (new) — up to 6; removed URLs are deleted
      const next = b.welcome.images.slice(0, 6).map((v) => (typeof v === 'string' && v.startsWith('data:') ? saveImage(v) : v)).filter((v) => typeof v === 'string' && v.startsWith('/uploads/'));
      for (const old of c.welcome.images) if (!next.includes(old)) removeImage(old);
      c.welcome.images = next;
    }
  }
  if (b.home) c.home = { ...c.home, headline: str(b.home.headline, 80) ?? c.home.headline,
    orderImage: updateImage(c.home.orderImage, b.home.orderImage), bookImage: updateImage(c.home.bookImage, b.home.bookImage) };
  save(); pushContent();
  res.json(c);
});

function cleanSpace(b, prev = {}) {
  const cap = Array.isArray(b.capacity) ? [num(b.capacity[0], 1, 1000, 1), num(b.capacity[1], 1, 1000, 10)] : prev.capacity ?? [1, 10];
  if (cap[1] < cap[0]) cap[1] = cap[0];
  return {
    name: str(b.name, 60) ?? prev.name, description: str(b.description, 300) ?? prev.description ?? '',
    emoji: str(b.emoji, 8) ?? prev.emoji ?? '🛋️',
    gradient: Array.isArray(b.gradient) && b.gradient.length === 2 ? b.gradient.map((g) => String(g).slice(0, 9)) : prev.gradient ?? ['#7C5CFF', '#1E1442'],
    capacity: cap, minSpend: b.minSpend !== undefined ? num(b.minSpend, 0, 1e7, 0) : prev.minSpend ?? 0,
    perks: Array.isArray(b.perks) ? b.perks.map((p) => str(p, 30)).filter(Boolean).slice(0, 6) : prev.perks ?? [],
    multiParty: typeof b.multiParty === 'boolean' ? b.multiParty : prev.multiParty ?? false,
    active: typeof b.active === 'boolean' ? b.active : prev.active ?? true,
  };
}
app.post('/api/spaces', requireAdmin, (req, res) => {
  const sp = { id: `space-${crypto.randomBytes(3).toString('hex')}`, ...cleanSpace(req.body || {}) };
  if (!sp.name) return res.status(400).json({ error: 'Name required' });
  sp.image = updateImage(undefined, req.body.image) || undefined;
  db.spaces.push(sp);
  save(); pushSpaces();
  res.status(201).json(sp);
});
app.patch('/api/spaces/:id', requireAdmin, (req, res) => {
  const i = db.spaces.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  const prev = db.spaces[i];
  const next = { ...prev, ...cleanSpace(req.body || {}, prev) };
  const img = updateImage(prev.image, req.body.image);
  if (img) next.image = img; else delete next.image;
  db.spaces[i] = next;
  save(); pushSpaces();
  res.json(next);
});
app.delete('/api/spaces/:id', requireAdmin, (req, res) => {
  const sp = db.spaces.find((x) => x.id === req.params.id);
  if (!sp) return res.status(404).json({ error: 'Not found' });
  if (db.bookings.some((b) => b.spaceId === sp.id && ['pending', 'confirmed'].includes(b.status) && b.date >= new Date().toISOString().slice(0, 10)))
    return res.status(409).json({ error: 'This space has upcoming bookings — hide it instead (untick "Bookable").' });
  removeImage(sp.image);
  db.spaces = db.spaces.filter((x) => x.id !== sp.id);
  save(); pushSpaces();
  res.json({ ok: true });
});

// ---------- menu management ----------
function cleanItem(b, prev = {}) {
  const opts = Array.isArray(b.options) ? b.options.slice(0, 6).map((o) => ({
    label: str(o.label, 30) || 'Option',
    choices: (Array.isArray(o.choices) ? o.choices : []).slice(0, 12)
      .map((c) => ({ name: str(c.name, 40), price: num(c.price, 0, 100000, 0) })).filter((c) => c.name),
  })).filter((o) => o.choices.length) : prev.options;
  const grad = Array.isArray(b.gradient) && b.gradient.length === 2 && b.gradient.every((g) => /^#[0-9a-f]{3,8}$/i.test(g)) ? b.gradient : prev.gradient ?? ['#7C5CFF', '#2A1B6B'];
  const offer = b.offerPrice === null || b.offerPrice === '' ? undefined : b.offerPrice !== undefined ? num(b.offerPrice, 0, 1e6, undefined) : prev.offerPrice;
  return {
    name: str(b.name, 80) ?? prev.name,
    category: CATEGORY_IDS.includes(b.category) ? b.category : prev.category ?? 'cocktails',
    price: b.price !== undefined ? num(b.price, 0, 1e6, 0) : prev.price ?? 0,
    offerPrice: offer,
    description: str(b.description, 300) ?? prev.description ?? '',
    emoji: str(b.emoji, 8) ?? prev.emoji ?? '🍸',
    gradient: grad,
    tags: Array.isArray(b.tags) ? b.tags.map((t) => str(t, 20)).filter(Boolean).slice(0, 4) : prev.tags,
    abv: str(b.abv, 10) ?? prev.abv,
    popular: typeof b.popular === 'boolean' ? b.popular : prev.popular ?? false,
    available: typeof b.available === 'boolean' ? b.available : prev.available ?? true,
    options: opts?.length ? opts : undefined,
  };
}
/** Guests get happy-hour prices applied; staff get the raw menu (for editing) plus the live price marker. */
function menuView(c) {
  const hhs = activeHappyHours();
  if (!c.staff) return db.menu.map((m) => effectiveItem(m, hhs));
  return db.menu.map((m) => { const e = effectiveItem(m, hhs); return e.happyHour ? { ...m, happyHour: e.happyHour, hhPrice: e.offerPrice } : m; });
}
function pushMenu() {
  for (const c of clients) {
    send(c, 'menu', menuView(c));
    send(c, 'happyHours', c.staff ? db.happyHours : activeHappyHours().map(({ name, category, percent, end }) => ({ name, category, percent, end })));
  }
}
// Re-push prices the minute a happy hour starts or ends
let hhSignature = '';
setInterval(() => {
  const sig = activeHappyHours().map((h) => h.id).sort().join(',');
  if (sig !== hhSignature) { hhSignature = sig; pushMenu(); }
}, 20_000);

function cleanHappyHour(b, prev = {}) {
  return {
    name: str(b.name, 40) ?? prev.name ?? 'Happy Hour',
    category: b.category === 'all' || CATEGORY_IDS.includes(b.category) ? b.category : prev.category ?? 'all',
    percent: b.percent !== undefined ? num(b.percent, 1, 90, 20) : prev.percent ?? 20,
    days: Array.isArray(b.days) ? [...new Set(b.days.map(Number).filter((d) => d >= 0 && d <= 6))] : prev.days ?? [0, 1, 2, 3, 4, 5, 6],
    start: /^\d{2}:\d{2}$/.test(b.start || '') ? b.start : prev.start ?? '16:00',
    end: /^\d{2}:\d{2}$/.test(b.end || '') ? b.end : prev.end ?? '19:00',
    active: typeof b.active === 'boolean' ? b.active : prev.active ?? true,
  };
}
app.post('/api/happy-hours', requireAdmin, (req, res) => {
  const h = { id: uid(), ...cleanHappyHour(req.body || {}) };
  if (!h.days.length) return res.status(400).json({ error: 'Pick at least one day' });
  db.happyHours.push(h);
  save(); pushMenu();
  res.status(201).json(h);
});
app.patch('/api/happy-hours/:id', requireAdmin, (req, res) => {
  const i = db.happyHours.findIndex((h) => h.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  db.happyHours[i] = { ...db.happyHours[i], ...cleanHappyHour(req.body || {}, db.happyHours[i]) };
  save(); pushMenu();
  res.json(db.happyHours[i]);
});
app.delete('/api/happy-hours/:id', requireAdmin, (req, res) => {
  db.happyHours = db.happyHours.filter((h) => h.id !== req.params.id);
  save(); pushMenu();
  res.json({ ok: true });
});

app.post('/api/menu', requireAdmin, (req, res) => {
  const item = { id: `item-${crypto.randomBytes(4).toString('hex')}`, ...cleanItem(req.body || {}) };
  if (!item.name) return res.status(400).json({ error: 'Name required' });
  if (req.body.image) item.image = saveImage(req.body.image) || undefined;
  db.menu.unshift(item);
  save(); pushMenu();
  res.status(201).json(item);
});
app.patch('/api/menu/:id', requireAdmin, (req, res) => {
  const i = db.menu.findIndex((m) => m.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  const prev = db.menu[i];
  const next = { ...prev, ...cleanItem(req.body || {}, prev) };
  if (next.offerPrice === undefined) delete next.offerPrice;
  if (req.body.image) { removeImage(prev.image); next.image = saveImage(req.body.image) || undefined; }
  if (req.body.removeImage) { removeImage(prev.image); delete next.image; }
  db.menu[i] = next;
  save(); pushMenu();
  res.json(next);
});
// Bulk offer: set (percent) or clear (percent = null) offer prices for a whole category
app.post('/api/menu/offer', requireAdmin, (req, res) => {
  const { category, percent } = req.body || {};
  const pct = percent == null ? null : num(percent, 1, 90, null);
  let n = 0;
  for (const m of db.menu) {
    if (category !== 'all' && m.category !== category) continue;
    if (pct == null) delete m.offerPrice; else m.offerPrice = round(m.price * (1 - pct / 100));
    n++;
  }
  save(); pushMenu();
  res.json({ updated: n });
});
app.delete('/api/menu/:id', requireAdmin, (req, res) => {
  const item = db.menu.find((m) => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  removeImage(item.image);
  db.menu = db.menu.filter((m) => m.id !== item.id);
  save(); pushMenu();
  res.json({ ok: true });
});

// ---------- ads / offers ----------
const PLACEMENTS = ['home', 'menu', 'book', 'social', 'events', 'tv'];
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
app.post('/api/ads', requireAdmin, (req, res) => {
  const ad = { id: uid(), createdAt: Date.now(), ...cleanAd(req.body || {}) };
  if (!ad.title) return res.status(400).json({ error: 'Title required' });
  if (req.body.image) ad.image = saveImage(req.body.image) || undefined;
  db.ads.unshift(ad);
  save(); pushAds();
  res.status(201).json(ad);
});
app.patch('/api/ads/:id', requireAdmin, (req, res) => {
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
app.delete('/api/ads/:id', requireAdmin, (req, res) => {
  const ad = db.ads.find((x) => x.id === req.params.id);
  if (!ad) return res.status(404).json({ error: 'Not found' });
  removeImage(ad.image);
  db.ads = db.ads.filter((x) => x.id !== ad.id);
  save(); pushAds();
  res.json({ ok: true });
});

// ---------- demo data ----------
app.post('/api/demo', requireAdmin, (_req, res) => {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const mk = (customer, mins, status, table, items) => {
    const lines = items.map(([itemId, name, unitPrice, qty]) => ({ key: itemId, itemId, name, unitPrice, qty, choices: [] }));
    const subtotal = round(lines.reduce((s, l) => s + l.unitPrice * l.qty, 0));
    const serviceFee = Math.round(subtotal * db.content.bar.serviceFeeRate);
    return { id: uid(), code: code('RZ'), createdAt: now - mins * 60000, updatedAt: now, customer, customerId: `demo-${customer}`,
      lines, subtotal, discount: 0, serviceFee, tip: 300, total: round(subtotal + serviceFee + 300), fulfilment: 'table', table, status };
  };
  db.orders.unshift(
    mk('Amara', 2, 'new', '7', [['rizz-royale', 'Rizz Royale', 1600, 2], ['truffle-fries', 'Truffle Parm Fries', 900, 1]]),
    mk('Leo', 6, 'preparing', '3', [['espresso-martini', 'Espresso Martini', 1500, 3]]),
    mk('Zuri', 11, 'ready', 'Bar 2', [['burger', 'The Rizz Burger', 1900, 1], ['grey-goose', 'Grey Goose', 1200, 2]]),
    mk('Amara', 60 * 24 * 3, 'served', '4', [['moet', 'Moët & Chandon Brut', 9500, 1], ['tequila-shot', 'Tequila Shot', 600, 4]]),
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
  app.use('/admin', express.static(dist));
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Rizz backend listening on http://0.0.0.0:${PORT}${PUBLIC_URL ? ` — public URL ${PUBLIC_URL}` : ''}`);
  console.log(`M-Pesa: ${mpesaInfo().mode} mode, till ${mpesaInfo().till}${mpesaInfo().mode !== 'mock' && !PUBLIC_URL ? ' — WARNING: no public URL, payment callbacks cannot arrive' : ''}`);
  console.log(`Data: ${DATA_FILE}`);
  if (STAFF_PIN === '1234') console.log('⚠  Using default staff PIN 1234 — set STAFF_PIN in production.');
  if (!process.env.ADMIN_PIN) console.log(`⚠  ADMIN_PIN not set — using ${process.env.STAFF_PIN ? 'STAFF_PIN' : 'default 0000'} for admin. Set ADMIN_PIN in production.`);
});
