import { useSyncExternalStore } from 'react';
import type { HappyHour, HappyHourNow, Wallet, Topup, AppContent, Space, StaffRole, BarEvent, TicketOrder, TicketStatus, MenuItem, Ad, Booking, BookingStatus, CartLine, CustomerStats, Order, OrderStatus, Post, Settings, User, Voucher } from '../types';
import { api, subscribe, type Snapshot } from '../api';
// Built-in copy of the bar's content (menu, offers, events…) so the app is complete before/without a server.
// Regenerated from the server's own data on every build (scripts/make-offline-seed.mjs).
import offline from '../data/offline-seed.json';

/**
 * App state.
 *  - Orders, bookings, posts, ads, vouchers and the guest's reward stats come from the backend
 *    and stay live via Server-Sent Events, so every device sees the same data instantly.
 *  - User, cart, favourites, applied promo code and the device's customer id stay on the device.
 */
export interface State {
  user: User | null;
  customerId: string;
  cart: CartLine[];
  favorites: string[];
  appliedCode: string | null;
  orders: Order[];
  bookings: Booking[];
  posts: Post[];
  ads: Ad[];
  vouchers: Voucher[];
  me: CustomerStats | null;
  settings: Settings;
  menu: MenuItem[];
  events: BarEvent[];
  tickets: TicketOrder[];
  mpesa: Snapshot['mpesa'] | null;
  content: AppContent | null;
  wallet: Wallet | null;
  happyHours: (HappyHour | HappyHourNow)[];
  walletRev: number; // bumps when any wallet changes (staff screens refetch)
  spaces: Space[];
  staffRole: StaffRole | null;
  /** Which side of the app is showing: guest (consumer) or admin/staff. */
  appMode: 'guest' | 'admin';
  online: boolean;
  loaded: boolean;
  staffToken: string | null;
  toast: string | null;
}

const KEY = 'rizz-bar-device-v2';
const TOKEN_KEY = 'rizz-staff-token';

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

function load(): State {
  let saved: Partial<State> = {};
  let token: string | null = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* ignore */ }
  let role: StaffRole | null = null;
  try { token = localStorage.getItem(TOKEN_KEY); role = localStorage.getItem(TOKEN_KEY + '-role') as StaffRole | null; } catch { /* ignore */ }
  return {
    user: saved.user ?? null,
    customerId: saved.customerId || newId(),
    cart: saved.cart ?? [],
    favorites: saved.favorites ?? [],
    appliedCode: saved.appliedCode ?? null,
    orders: [], bookings: [], posts: [], ads: offline.ads as Ad[], vouchers: [], me: null,
    settings: { rewardThreshold: 100, rewardValue: 1000, pointsPerUnit: 0.01, ...(offline.settings as Partial<Settings>) },
    menu: offline.menu as MenuItem[],
    events: offline.events as BarEvent[], tickets: [], mpesa: null, wallet: null, happyHours: offline.happyHours as HappyHourNow[], walletRev: 0, appMode: initialMode(), content: offline.content as AppContent, spaces: offline.spaces as Space[], staffRole: role,
    online: false, loaded: false,
    staffToken: token,
    toast: null,
  };
}

function initialMode(): 'guest' | 'admin' {
  if (typeof location !== 'undefined' && (/\/admin\/?$/.test(location.pathname) || location.hash.startsWith('#staff') || location.hash.startsWith('#admin'))) return 'admin';
  try { return localStorage.getItem('rizz-app-mode') === 'admin' ? 'admin' : 'guest'; } catch { return 'guest'; }
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    const { user, customerId, cart, favorites, appliedCode } = state;
    localStorage.setItem(KEY, JSON.stringify({ user, customerId, cart, favorites, appliedCode }));
  } catch { /* ignore */ }
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
}

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

// ---- live connection ----
let unsubscribe: (() => void) | null = null;
export function connect() {
  unsubscribe?.();
  unsubscribe = subscribe({ customerId: state.customerId, token: state.staffToken }, {
    snapshot: ({ role, ...s }: Snapshot) => set({ ...s, loaded: true, ...(state.staffToken && role ? { staffRole: role } : {}) }),
    order: (o) => set({ orders: upsert(state.orders, o) }),
    booking: (b) => set({ bookings: upsert(state.bookings, b) }),
    post: (p) => set({ posts: p.removed ? state.posts.filter((x) => x.id !== p.id) : upsert(state.posts, p) }),
    ads: (ads) => set({ ads }),
    vouchers: (vouchers) => set({ vouchers }),
    me: (me) => set({ me }),
    menu: (menu) => set({ menu }),
    content: (content) => set({ content }),
    wallet: (wallet) => set({ wallet }),
    happyHours: (happyHours) => set({ happyHours }),
    walletChanged: () => set({ walletRev: state.walletRev + 1 }),
    spaces: (spaces) => set({ spaces }),
    events: (events) => set({ events }),
    ticket: (t) => set({ tickets: upsert(state.tickets, t) }),
    status: (online) => { if (online !== state.online) set({ online }); },
  });
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => selector(state),
  );
}

export const getState = () => state;

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function showToast(msg: string) {
  clearTimeout(toastTimer);
  set({ toast: msg });
  toastTimer = setTimeout(() => set({ toast: null }), 3500);
}
/** Fire-and-forget an async action, surfacing any error as a toast. */
export const run = (p: Promise<unknown>) => {
  p.catch((e) => {
    const msg = (e as Error).message;
    if (msg === 'Staff login required') actions.lockStaff();
    showToast(msg);
  });
};

const staff = () => ({ token: state.staffToken });

export const actions = {
  /** Switch between the guest app and the admin/staff side (same app, two logins). */
  setMode(appMode: 'guest' | 'admin') {
    try { localStorage.setItem('rizz-app-mode', appMode); } catch { /* ignore */ }
    set({ appMode });
    window.scrollTo(0, 0);
  },
  login(user: User) {
    set({ user });
    run(api('/api/customers/me', { method: 'POST', body: { customerId: state.customerId, ...user } }));
  },
  logout() { set({ user: null, cart: [], appliedCode: null }); },

  toggleFavorite(id: string) {
    const f = state.favorites;
    set({ favorites: f.includes(id) ? f.filter((x) => x !== id) : [...f, id] });
  },

  // ---- cart ----
  addToCart(line: Omit<CartLine, 'key'>) {
    const key = `${line.itemId}|${line.choices.join(',')}|${line.note ?? ''}`;
    const existing = state.cart.find((l) => l.key === key);
    set({ cart: existing
      ? state.cart.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l))
      : [...state.cart, { ...line, key }] });
  },
  setQty(key: string, qty: number) {
    set({ cart: qty <= 0 ? state.cart.filter((l) => l.key !== key) : state.cart.map((l) => (l.key === key ? { ...l, qty } : l)) });
  },
  clearCart() { set({ cart: [] }); },
  applyCode(code: string | null) { set({ appliedCode: code ? code.trim().toUpperCase() : null }); },
  validateCode(code: string, subtotal: number) {
    return api<{ code: string; description: string; discount: number }>('/api/vouchers/validate', { method: 'POST',
      body: { code, subtotal, customerId: state.customerId } });
  },

  // ---- orders ----
  async placeOrder(input: Pick<Order, 'fulfilment' | 'table' | 'locationHint' | 'notes' | 'tip'> & { paymentMethod: 'mpesa' | 'cash' | 'wallet' }): Promise<Order> {
    const order = await api<Order>('/api/orders', { method: 'POST', body: {
      ...input, lines: state.cart, voucherCode: state.appliedCode || undefined,
      customerId: state.customerId, customer: state.user?.name, phone: state.user?.phone } });
    set({ orders: upsert(state.orders, order), cart: [], appliedCode: null });
    return order;
  },
  async setOrderStatus(id: string, status: OrderStatus) {
    const o = await api<Order>(`/api/orders/${id}`, { method: 'PATCH', ...staff(), body: { status, customerId: state.customerId } });
    set({ orders: upsert(state.orders, o) });
  },
  async rateOrder(id: string, rating: number) {
    const o = await api<Order>(`/api/orders/${id}`, { method: 'PATCH', body: { rating, customerId: state.customerId } });
    set({ orders: upsert(state.orders, o) });
  },
  reorder(id: string) {
    const o = state.orders.find((x) => x.id === id);
    if (o) set({ cart: o.lines.map((l) => ({ ...l })) });
  },

  // ---- bookings ----
  async createBooking(b: Omit<Booking, 'id' | 'code' | 'createdAt' | 'status'>): Promise<Booking> {
    const booking = await api<Booking>('/api/bookings', { method: 'POST', body: { ...b, customerId: state.customerId } });
    set({ bookings: upsert(state.bookings, booking) });
    return booking;
  },
  async setBookingStatus(id: string, status: BookingStatus) {
    const bk = await api<Booking>(`/api/bookings/${id}`, { method: 'PATCH', ...staff(), body: { status, customerId: state.customerId } });
    set({ bookings: upsert(state.bookings, bk) });
  },

  // ---- social ----
  async createPost(image: string, caption: string) {
    const p = await api<Post>('/api/posts', { method: 'POST',
      body: { image, caption, customerId: state.customerId, author: state.user?.name } });
    set({ posts: upsert(state.posts, p) });
    return p;
  },
  async toggleLike(id: string) {
    // optimistic
    set({ posts: state.posts.map((p) => p.id !== id ? p : { ...p, likes: p.likes.includes(state.customerId)
      ? p.likes.filter((x) => x !== state.customerId) : [...p.likes, state.customerId] }) });
    await api(`/api/posts/${id}/like`, { method: 'POST', body: { customerId: state.customerId } });
  },
  async deletePost(id: string) {
    await api(`/api/posts/${id}?customerId=${encodeURIComponent(state.customerId)}`, { method: 'DELETE', ...staff() });
    set({ posts: state.posts.filter((p) => p.id !== id) });
  },
  async moderatePost(id: string, patch: { hidden?: boolean; featured?: boolean }) {
    const p = await api<Post>(`/api/posts/${id}`, { method: 'PATCH', ...staff(), body: patch });
    set({ posts: upsert(state.posts, p) });
  },

  // ---- staff: ads, vouchers, settings, customers ----
  async saveAd(ad: Partial<Ad> & { image?: string; removeImage?: boolean }, id?: string) {
    await api<Ad>(id ? `/api/ads/${id}` : '/api/ads', { method: id ? 'PATCH' : 'POST', ...staff(), body: ad });
  },
  async saveMenuItem(item: Omit<Partial<MenuItem>, 'offerPrice'> & { image?: string; removeImage?: boolean; offerPrice?: number | null }, id?: string) {
    await api<MenuItem>(id ? `/api/menu/${id}` : '/api/menu', { method: id ? 'PATCH' : 'POST', ...staff(), body: item });
  },
  async categoryOffer(category: string, percent: number | null) {
    return api<{ updated: number }>('/api/menu/offer', { method: 'POST', ...staff(), body: { category, percent } });
  },
  async deleteMenuItem(id: string) { await api(`/api/menu/${id}`, { method: 'DELETE', ...staff() }); },
  // ---- happy hours (admin) ----
  async saveHappyHour(h: Partial<HappyHour>, id?: string) {
    await api(id ? `/api/happy-hours/${id}` : '/api/happy-hours', { method: id ? 'PATCH' : 'POST', ...staff(), body: h });
  },
  async deleteHappyHour(id: string) { await api(`/api/happy-hours/${id}`, { method: 'DELETE', ...staff() }); },

  // ---- Rizz Wallet ----
  /** Creates a top-up request, then sends the M-Pesa prompt for it. */
  async topUp(amount: number, phone: string) {
    const t = await api<Topup>('/api/wallet/topups', { method: 'POST', body: { amount, customerId: state.customerId } });
    await actions.payMpesa('topup', t.id, phone);
    return t;
  },
  async payWithWallet(kind: 'order' | 'ticket', refId: string) {
    await api('/api/wallet/pay', { method: 'POST', body: { kind, refId, customerId: state.customerId } });
  },
  fetchWallets() {
    return api<{ rows: { customerId: string; name: string; phone?: string; balance: number; updatedAt: number }[];
      totals: { balance: number; topups: number; spent: number; bonus: number; refunds: number }; recent: (import('../types').WalletTx)[] }>('/api/wallets', staff());
  },
  adjustWallet(customerId: string, amount: number, type: 'cash' | 'adjust', note?: string) {
    return api(`/api/wallets/${encodeURIComponent(customerId)}/adjust`, { method: 'POST', ...staff(), body: { amount, type, note } });
  },

  // ---- M-Pesa ----
  /** Sends the M-Pesa PIN prompt to `phone` for an order or ticket purchase. */
  payMpesa(kind: 'order' | 'ticket' | 'topup', refId: string, phone: string) {
    return api<{ paymentId: string; amount: number; message: string; mode: string }>('/api/payments/mpesa', { method: 'POST',
      ...staff(), body: { kind, refId, phone, customerId: state.customerId } });
  },
  paymentStatus(id: string) {
    return api<{ status: string; receipt?: string; message?: string }>(`/api/payments/${id}/status`, { method: 'POST' });
  },
  async markOrderPaid(id: string, paid: boolean) {
    const o = await api<Order>(`/api/orders/${id}`, { method: 'PATCH', ...staff(), body: { markPaid: paid } });
    set({ orders: upsert(state.orders, o) });
  },

  // ---- events & tickets ----
  async buyTickets(eventId: string, items: { typeId: string; qty: number }[], payWith?: 'wallet') {
    const t = await api<TicketOrder>(`/api/events/${eventId}/tickets`, { method: 'POST',
      body: { items, payWith, customerId: state.customerId, customer: state.user?.name, phone: state.user?.phone } });
    set({ tickets: upsert(state.tickets, t) });
    return t;
  },
  async setTicketStatus(id: string, status: TicketStatus) {
    const t = await api<TicketOrder>(`/api/tickets/${id}`, { method: 'PATCH', ...staff(), body: { status, customerId: state.customerId } });
    set({ tickets: upsert(state.tickets, t) });
  },
  checkIn(code: string) {
    return api<{ ticket: TicketOrder; unit: TicketOrder['units'][number]; unpaid: boolean }>('/api/tickets/checkin', { method: 'POST', ...staff(), body: { code } });
  },
  async saveEvent(ev: Partial<BarEvent> & { image?: string; removeImage?: boolean }, id?: string) {
    await api(id ? `/api/events/${id}` : '/api/events', { method: id ? 'PATCH' : 'POST', ...staff(), body: ev });
  },
  async deleteEvent(id: string) { await api(`/api/events/${id}`, { method: 'DELETE', ...staff() }); },
  async deleteAd(id: string) { await api(`/api/ads/${id}`, { method: 'DELETE', ...staff() }); },
  async createVoucher(v: Partial<Voucher>) { await api('/api/vouchers', { method: 'POST', ...staff(), body: v }); },
  async setVoucherActive(id: string, active: boolean) { await api(`/api/vouchers/${id}`, { method: 'PATCH', ...staff(), body: { active } }); },
  async saveSettings(s: Partial<Settings>) { await api('/api/settings', { method: 'PATCH', ...staff(), body: s }); },
  fetchCustomers() { return api<CustomerStats[]>('/api/customers', staff()); },

  async unlockStaff(pin: string): Promise<boolean> {
    try {
      const { token, role } = await api<{ token: string; role: StaffRole }>('/api/staff/login', { method: 'POST', body: { pin } });
      try { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(TOKEN_KEY + '-role', role); } catch { /* ignore */ }
      set({ staffToken: token, staffRole: role });
      connect(); // re-open the stream with staff visibility
      return true;
    } catch {
      return false;
    }
  },
  lockStaff() {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY + '-role'); } catch { /* ignore */ }
    set({ staffToken: null, staffRole: null });
    connect();
  },
  // ---- admin: app content & spaces ----
  async saveContent(patch: { bar?: Partial<AppContent['bar']>; welcome?: { title?: string; subtitle?: string; images?: string[] }; home?: { headline?: string; orderImage?: string | null; bookImage?: string | null } }) {
    const content = await api<AppContent>('/api/content', { method: 'PATCH', ...staff(), body: patch });
    set({ content });
  },
  async saveSpace(sp: Omit<Partial<Space>, 'image'> & { image?: string | null }, id?: string) {
    await api(id ? `/api/spaces/${id}` : '/api/spaces', { method: id ? 'PATCH' : 'POST', ...staff(), body: sp });
  },
  async deleteSpace(id: string) { await api(`/api/spaces/${id}`, { method: 'DELETE', ...staff() }); },
  async seedDemo() { await api('/api/demo', { method: 'POST', ...staff() }); },
};

export const cartSubtotal = (cart: CartLine[]) => +cart.reduce((s, l) => s + l.unitPrice * l.qty, 0).toFixed(2);
export const cartCount = (cart: CartLine[]) => cart.reduce((s, l) => s + l.qty, 0);
