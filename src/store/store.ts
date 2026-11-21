import { useSyncExternalStore } from 'react';
import type { Booking, BookingStatus, CartLine, Order, OrderStatus, User } from '../types';
import { BAR } from '../config';

/**
 * Lightweight persisted store.
 *
 * Data lives in localStorage and is synced live between tabs/windows via the
 * `storage` event, so a customer tab and a staff console tab on the same device
 * update each other instantly. Swap `persist`/`load` for API calls to connect a
 * real backend (see README).
 */
export interface State {
  user: User | null;
  cart: CartLine[];
  orders: Order[];
  bookings: Booking[];
  favorites: string[];
  staffUnlocked: boolean;
}

const KEY = 'rizz-bar-state-v1';
const SHARED_KEYS: (keyof State)[] = ['orders', 'bookings'];

const initial: State = { user: null, cart: [], orders: [], bookings: [], favorites: [], staffUnlocked: false };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial, ...JSON.parse(raw), staffUnlocked: false };
  } catch {
    /* ignore */
  }
  return initial;
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    const { staffUnlocked: _ignored, ...rest } = state;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* storage may be unavailable (private mode) */
  }
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const incoming = JSON.parse(e.newValue) as State;
      const patch: Partial<State> = {};
      SHARED_KEYS.forEach((k) => ((patch as Record<string, unknown>)[k] = incoming[k]));
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    } catch {
      /* ignore */
    }
  });
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
  );
}

export const getState = () => state;

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const shortCode = (prefix: string) => `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

export const actions = {
  login(user: User) {
    set({ user });
  },
  logout() {
    set({ user: null, cart: [] });
  },

  toggleFavorite(id: string) {
    const f = state.favorites;
    set({ favorites: f.includes(id) ? f.filter((x) => x !== id) : [...f, id] });
  },

  addToCart(line: Omit<CartLine, 'key'>) {
    const key = `${line.itemId}|${line.choices.join(',')}|${line.note ?? ''}`;
    const existing = state.cart.find((l) => l.key === key);
    if (existing) {
      set({ cart: state.cart.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l)) });
    } else {
      set({ cart: [...state.cart, { ...line, key }] });
    }
  },
  setQty(key: string, qty: number) {
    set({ cart: qty <= 0 ? state.cart.filter((l) => l.key !== key) : state.cart.map((l) => (l.key === key ? { ...l, qty } : l)) });
  },
  clearCart() {
    set({ cart: [] });
  },

  placeOrder(input: Pick<Order, 'fulfilment' | 'table' | 'notes' | 'tip'>): Order {
    const subtotal = cartSubtotal(state.cart);
    const serviceFee = +(subtotal * BAR.serviceFeeRate).toFixed(2);
    const now = Date.now();
    const order: Order = {
      id: uid(),
      code: shortCode('RZ'),
      createdAt: now,
      updatedAt: now,
      customer: state.user?.name ?? 'Guest',
      phone: state.user?.phone,
      lines: state.cart,
      subtotal,
      serviceFee,
      tip: input.tip,
      total: +(subtotal + serviceFee + input.tip).toFixed(2),
      fulfilment: input.fulfilment,
      table: input.table,
      notes: input.notes,
      status: 'new',
    };
    set({ orders: [order, ...state.orders], cart: [] });
    return order;
  },
  setOrderStatus(id: string, status: OrderStatus) {
    set({ orders: state.orders.map((o) => (o.id === id ? { ...o, status, updatedAt: Date.now() } : o)) });
  },
  rateOrder(id: string, rating: number) {
    set({ orders: state.orders.map((o) => (o.id === id ? { ...o, rating } : o)) });
  },
  reorder(id: string) {
    const o = state.orders.find((x) => x.id === id);
    if (o) set({ cart: o.lines.map((l) => ({ ...l })) });
  },

  createBooking(b: Omit<Booking, 'id' | 'code' | 'createdAt' | 'status'>): Booking {
    const booking: Booking = { ...b, id: uid(), code: shortCode('BK'), createdAt: Date.now(), status: 'pending' };
    set({ bookings: [booking, ...state.bookings] });
    return booking;
  },
  setBookingStatus(id: string, status: BookingStatus) {
    set({ bookings: state.bookings.map((b) => (b.id === id ? { ...b, status } : b)) });
  },

  unlockStaff(pin: string) {
    if (pin === BAR.staffPin) {
      set({ staffUnlocked: true });
      return true;
    }
    return false;
  },
  lockStaff() {
    set({ staffUnlocked: false });
  },

  /** Seed a few demo orders/bookings so the staff console has something to show. */
  seedDemo() {
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const mk = (name: string, mins: number, status: OrderStatus, table: string, lines: [string, string, number, number][]): Order => {
      const ls: CartLine[] = lines.map(([itemId, n, p, q]) => ({ key: itemId, itemId, name: n, unitPrice: p, qty: q, choices: [] }));
      const subtotal = cartSubtotal(ls);
      const serviceFee = +(subtotal * BAR.serviceFeeRate).toFixed(2);
      return { id: uid(), code: shortCode('RZ'), createdAt: now - mins * 60000, updatedAt: now - mins * 60000, customer: name,
        lines: ls, subtotal, serviceFee, tip: 3, total: +(subtotal + serviceFee + 3).toFixed(2), fulfilment: 'table', table, status };
    };
    const orders = [
      mk('Amara', 2, 'new', '7', [['rizz-royale', 'Rizz Royale', 16, 2], ['truffle-fries', 'Truffle Parm Fries', 9, 1]]),
      mk('Leo', 6, 'preparing', '3', [['espresso-martini', 'Espresso Martini', 15, 3]]),
      mk('Zuri', 11, 'ready', 'Bar 2', [['burger', 'The Rizz Burger', 19, 1], ['lime-light', 'Lime Light', 15, 1]]),
    ];
    const bookings: Booking[] = [
      { id: uid(), code: shortCode('BK'), createdAt: now, spaceId: 'rooftop', spaceName: 'Rooftop Terrace', date: today, time: '21:00',
        durationHrs: 3, guests: 6, customer: 'Kai', phone: '+1 555 0199', occasion: 'Birthday', status: 'pending' },
      { id: uid(), code: shortCode('BK'), createdAt: now, spaceId: 'lounge-booth', spaceName: 'Velvet Lounge Booth', date: today, time: '20:00',
        durationHrs: 2, guests: 2, customer: 'Nia', phone: '+1 555 0123', occasion: 'Date night', status: 'confirmed' },
    ];
    set({ orders: [...orders, ...state.orders], bookings: [...bookings, ...state.bookings] });
  },
};

export const cartSubtotal = (cart: CartLine[]) => +cart.reduce((s, l) => s + l.unitPrice * l.qty, 0).toFixed(2);
export const cartCount = (cart: CartLine[]) => cart.reduce((s, l) => s + l.qty, 0);
