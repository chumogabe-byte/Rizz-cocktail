import { useSyncExternalStore } from 'react';
import type { BarEvent, TicketOrder, TicketStatus, MenuItem, Ad, Booking, BookingStatus, CartLine, CustomerStats, Order, OrderStatus, Post, Settings, User, Voucher } from '../types';
import { api, subscribe, type Snapshot } from '../api';
import seedMenu from '../../server/seed-menu.json';

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
  try { token = sessionStorage.getItem(TOKEN_KEY); } catch { /* ignore */ }
  return {
    user: saved.user ?? null,
    customerId: saved.customerId || newId(),
    cart: saved.cart ?? [],
    favorites: saved.favorites ?? [],
    appliedCode: saved.appliedCode ?? null,
    orders: [], bookings: [], posts: [], ads: [], vouchers: [], me: null,
    settings: { rewardThreshold: 100, rewardValue: 1000, pointsPerUnit: 0.01 },
    menu: seedMenu as MenuItem[],
    events: [], tickets: [], mpesa: null,
    online: false, loaded: false,
    staffToken: token,
    toast: null,
  };
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
    snapshot: (s: Snapshot) => set({ ...s, loaded: true }),
    order: (o) => set({ orders: upsert(state.orders, o) }),
    booking: (b) => set({ bookings: upsert(state.bookings, b) }),
    post: (p) => set({ posts: p.removed ? state.posts.filter((x) => x.id !== p.id) : upsert(state.posts, p) }),
    ads: (ads) => set({ ads }),
    vouchers: (vouchers) => set({ vouchers }),
    me: (me) => set({ me }),
    menu: (menu) => set({ menu }),
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
  async placeOrder(input: Pick<Order, 'fulfilment' | 'table' | 'notes' | 'tip'> & { paymentMethod: 'mpesa' | 'cash' }): Promise<Order> {
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
  // ---- M-Pesa ----
  /** Sends the M-Pesa PIN prompt to `phone` for an order or ticket purchase. */
  payMpesa(kind: 'order' | 'ticket', refId: string, phone: string) {
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
  async buyTickets(eventId: string, items: { typeId: string; qty: number }[]) {
    const t = await api<TicketOrder>(`/api/events/${eventId}/tickets`, { method: 'POST',
      body: { items, customerId: state.customerId, customer: state.user?.name, phone: state.user?.phone } });
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
      const { token } = await api<{ token: string }>('/api/staff/login', { method: 'POST', body: { pin } });
      try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
      set({ staffToken: token });
      connect(); // re-open the stream with staff visibility
      return true;
    } catch {
      return false;
    }
  },
  lockStaff() {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    set({ staffToken: null });
    connect();
  },
  async seedDemo() { await api('/api/demo', { method: 'POST', ...staff() }); },
};

export const cartSubtotal = (cart: CartLine[]) => +cart.reduce((s, l) => s + l.unitPrice * l.qty, 0).toFixed(2);
export const cartCount = (cart: CartLine[]) => cart.reduce((s, l) => s + l.qty, 0);
