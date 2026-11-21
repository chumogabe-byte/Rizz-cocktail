/**
 * Rizz Cocktail Bar — backend.
 *
 * - REST API for orders and bookings (JSON file persistence, no DB to install)
 * - Server-Sent Events (/api/events) push every change to all connected devices
 * - Staff actions protected by a PIN → bearer token
 * - Serves the built web app from /dist, so one process runs everything
 *
 * Env: PORT (default 3001), STAFF_PIN (default 1234), DATA_FILE (default server/data/db.json)
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
const SERVICE_FEE_RATE = 0.05;

// ---------- persistence ----------
let db = { orders: [], bookings: [] };
try {
  db = { ...db, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
} catch { /* first run */ }

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  }, 50);
}

// ---------- realtime ----------
const clients = new Set();
function broadcast(type, payload) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(msg);
}

// ---------- helpers ----------
const uid = () => crypto.randomUUID();
const code = (p) => `${p}-${Math.floor(1000 + Math.random() * 9000)}`;
const round = (n) => Math.round(n * 100) / 100;
const tokens = new Set();
const isStaff = (req) => tokens.has((req.headers.authorization || '').replace(/^Bearer /, ''));
const requireStaff = (req, res, next) => (isStaff(req) ? next() : res.status(401).json({ error: 'Staff login required' }));
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

const ORDER_STATUSES = ['new', 'preparing', 'ready', 'served', 'cancelled'];
const BOOKING_STATUSES = ['pending', 'confirmed', 'declined', 'checked-in', 'cancelled'];
const ACTIVE_BOOKING = ['pending', 'confirmed', 'checked-in'];
const MULTI_PARTY_SPACES = ['bar-counter', 'rooftop'];

// ---------- app ----------
const app = express();
app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => {
  // Allow the mobile app (capacitor://, http://localhost) and other origins to call the API.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/state', (_req, res) => res.json({ orders: db.orders, bookings: db.bookings }));

app.get('/api/events', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(`event: snapshot\ndata: ${JSON.stringify({ orders: db.orders, bookings: db.bookings })}\n\n`);
  clients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); clients.delete(res); });
});

app.post('/api/staff/login', (req, res) => {
  if (str(req.body?.pin, 20) !== STAFF_PIN) return res.status(401).json({ error: 'Wrong PIN' });
  const token = crypto.randomBytes(24).toString('hex');
  tokens.add(token);
  res.json({ token });
});

// Orders
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

  const subtotal = round(clean.reduce((s, l) => s + l.unitPrice * l.qty, 0));
  const serviceFee = round(subtotal * SERVICE_FEE_RATE);
  const tip = round(Math.min(subtotal, Math.max(0, Number(b.tip) || 0)));
  const now = Date.now();
  const order = { id: uid(), code: code('RZ'), createdAt: now, updatedAt: now,
    customerId: str(b.customerId, 64), customer: str(b.customer, 60) || 'Guest', phone: str(b.phone, 30),
    lines: clean, subtotal, serviceFee, tip, total: round(subtotal + serviceFee + tip),
    fulfilment, table, notes: str(b.notes, 300), status: 'new' };
  db.orders.unshift(order);
  save();
  broadcast('order', order);
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
    // Guests may only cancel their own order while it is still new.
    if (!staff && !(owner && status === 'cancelled' && o.status === 'new')) return res.status(403).json({ error: 'Not allowed' });
    o.status = status;
  }
  if (rating !== undefined) {
    if (!owner && !staff) return res.status(403).json({ error: 'Not allowed' });
    o.rating = Math.min(5, Math.max(0, Math.floor(Number(rating))));
  }
  o.updatedAt = Date.now();
  save();
  broadcast('order', o);
  res.json(o);
});

// Bookings
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
  broadcast('booking', booking);
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
  broadcast('booking', bk);
  res.json(bk);
});

// Demo data for the staff console
app.post('/api/demo', requireStaff, (_req, res) => {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const mk = (customer, mins, status, table, items) => {
    const lines = items.map(([itemId, name, unitPrice, qty]) => ({ key: itemId, itemId, name, unitPrice, qty, choices: [] }));
    const subtotal = round(lines.reduce((s, l) => s + l.unitPrice * l.qty, 0));
    const serviceFee = round(subtotal * SERVICE_FEE_RATE);
    return { id: uid(), code: code('RZ'), createdAt: now - mins * 60000, updatedAt: now, customer, lines, subtotal, serviceFee,
      tip: 3, total: round(subtotal + serviceFee + 3), fulfilment: 'table', table, status };
  };
  db.orders.unshift(
    mk('Amara', 2, 'new', '7', [['rizz-royale', 'Rizz Royale', 16, 2], ['truffle-fries', 'Truffle Parm Fries', 9, 1]]),
    mk('Leo', 6, 'preparing', '3', [['espresso-martini', 'Espresso Martini', 15, 3]]),
    mk('Zuri', 11, 'ready', 'Bar 2', [['burger', 'The Rizz Burger', 19, 1], ['lime-light', 'Lime Light', 15, 1]]),
  );
  db.bookings.unshift(
    { id: uid(), code: code('BK'), createdAt: now, spaceId: 'rooftop', spaceName: 'Rooftop Terrace', date: today, time: '21:00',
      durationHrs: 3, guests: 6, customer: 'Kai', phone: '+1 555 0199', occasion: 'Birthday', status: 'pending' },
  );
  save();
  broadcast('snapshot', { orders: db.orders, bookings: db.bookings });
  res.json({ ok: true });
});

// Serve the built web app
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Rizz backend listening on http://0.0.0.0:${PORT}`);
  if (STAFF_PIN === '1234') console.log('⚠  Using default staff PIN 1234 — set STAFF_PIN in production.');
});
