import { useSyncExternalStore } from 'react';
import type { Booking, BookingStatus, CartLine, Order, OrderStatus, User } from '../types';
import { api, subscribe, type Snapshot } from '../api';

/**
 * App state.
 *  - Orders & bookings come from the backend and are kept live via Server-Sent Events,
 *    so every phone, tablet and staff screen sees the same data instantly.
 *  - User, cart, favourites and the device's customer id stay on the device.
 */
export interface State {
  user: User | null;
  customerId: string;
  cart: CartLine[];
  favorites: string[];
  orders: Order[];
  bookings: Booking[];
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
    orders: [], bookings: [], online: false, loaded: false,
    staffToken: token,
    toast: null,
  };
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    const { user, customerId, cart, favorites } = state;
    localStorage.setItem(KEY, JSON.stringify({ user, customerId, cart, favorites }));
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
  unsubscribe = subscribe({
    snapshot: (s: Snapshot) => set({ orders: s.orders, bookings: s.bookings, loaded: true }),
    order: (o) => set({ orders: upsert(state.orders, o) }),
    booking: (b) => set({ bookings: upsert(state.bookings, b) }),
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
    // Server restarted / token expired → send staff back to the PIN screen.
    if (msg === 'Staff login required') actions.lockStaff();
    showToast(msg);
  });
};

export const actions = {
  login(user: User) { set({ user }); },
  logout() { set({ user: null, cart: [] }); },

  toggleFavorite(id: string) {
    const f = state.favorites;
    set({ favorites: f.includes(id) ? f.filter((x) => x !== id) : [...f, id] });
  },

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

  async placeOrder(input: Pick<Order, 'fulfilment' | 'table' | 'notes' | 'tip'>): Promise<Order> {
    const order = await api<Order>('/api/orders', { method: 'POST', body: {
      ...input, lines: state.cart, customerId: state.customerId, customer: state.user?.name, phone: state.user?.phone } });
    set({ orders: upsert(state.orders, order), cart: [] });
    return order;
  },
  async setOrderStatus(id: string, status: OrderStatus) {
    const o = await api<Order>(`/api/orders/${id}`, { method: 'PATCH', token: state.staffToken, body: { status, customerId: state.customerId } });
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

  async createBooking(b: Omit<Booking, 'id' | 'code' | 'createdAt' | 'status'>): Promise<Booking> {
    const booking = await api<Booking>('/api/bookings', { method: 'POST', body: { ...b, customerId: state.customerId } });
    set({ bookings: upsert(state.bookings, booking) });
    return booking;
  },
  async setBookingStatus(id: string, status: BookingStatus) {
    const bk = await api<Booking>(`/api/bookings/${id}`, { method: 'PATCH', token: state.staffToken, body: { status, customerId: state.customerId } });
    set({ bookings: upsert(state.bookings, bk) });
  },

  async unlockStaff(pin: string): Promise<boolean> {
    try {
      const { token } = await api<{ token: string }>('/api/staff/login', { method: 'POST', body: { pin } });
      try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
      set({ staffToken: token });
      return true;
    } catch {
      return false;
    }
  },
  lockStaff() {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    set({ staffToken: null });
  },
  async seedDemo() {
    await api('/api/demo', { method: 'POST', token: state.staffToken });
  },
};

export const cartSubtotal = (cart: CartLine[]) => +cart.reduce((s, l) => s + l.unitPrice * l.qty, 0).toFixed(2);
export const cartCount = (cart: CartLine[]) => cart.reduce((s, l) => s + l.qty, 0);
