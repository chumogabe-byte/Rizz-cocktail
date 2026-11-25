import type { HappyHour, HappyHourNow, Wallet, AppContent, Space, BarEvent, TicketOrder, MenuItem, Ad, Booking, CustomerStats, Order, Post, Settings, Voucher } from './types';

/**
 * Where the backend lives.
 *  1. A server address saved on the device (set in-app: Profile → Server) — used by the mobile app
 *  2. VITE_API_URL at build time
 *  3. Same origin (when the web app is served by the backend itself)
 */
const SERVER_KEY = 'rizz-server-url';

export function getServerUrl(): string {
  let saved = '';
  try { saved = localStorage.getItem(SERVER_KEY) || ''; } catch { /* ignore */ }
  return (saved || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
}
export function setServerUrl(url: string) {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) localStorage.setItem(SERVER_KEY, clean); else localStorage.removeItem(SERVER_KEY);
  } catch { /* ignore */ }
}

export class ApiError extends Error {}

/**
 * True when this copy of the app is not served by the bar's own server: the installed Android/iOS app,
 * or the static web copy on GitHub Pages (built with VITE_STATIC=1). Such copies need a server address
 * (built in via VITE_API_URL, or entered in Profile → Server) for live features.
 */
export function isDetachedClient() {
  const native = typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  return native || import.meta.env.VITE_STATIC === '1';
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  // Installed app that was never given the bar's server address: say so plainly
  if (!getServerUrl() && isDetachedClient())
    throw new ApiError("This app isn't connected to the bar yet. Add the server address in Profile → Server to order and pay.");
  let res: Response;
  try {
    res = await fetch(getServerUrl() + path, {
      method: opts.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the bar's server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error
    || (res.status >= 500 || res.status === 404 ? "Can't reach the bar's server right now. Check your connection and try again." : `Request failed (${res.status})`));
  return data as T;
}

export interface Snapshot {
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
  content: AppContent;
  spaces: Space[];
  role: 'admin' | 'staff' | null;
  wallet: Wallet | null;
  happyHours: (HappyHour | HappyHourNow)[];
  mpesa: { mode: 'mock' | 'sandbox' | 'production'; till: string; type: 'till' | 'paybill'; shortcode: string | null; callbackConfigured: boolean };
}

type Handlers = {
  snapshot: (s: Snapshot) => void;
  order: (o: Order) => void;
  booking: (b: Booking) => void;
  post: (p: Post) => void;
  ads: (a: Ad[]) => void;
  vouchers: (v: Voucher[]) => void;
  me: (m: CustomerStats) => void;
  menu: (m: MenuItem[]) => void;
  events: (e: BarEvent[]) => void;
  ticket: (t: TicketOrder) => void;
  content: (c: AppContent) => void;
  wallet: (w: Wallet) => void;
  happyHours: (h: (HappyHour | HappyHourNow)[]) => void;
  walletChanged: (x: { customerId: string }) => void;
  spaces: (s: Space[]) => void;
  status: (online: boolean) => void;
};

/** Absolute URL for an uploaded image path like /uploads/x.jpeg */
export const mediaUrl = (p?: string) => (!p ? '' : /^https?:|^data:/.test(p) ? p : getServerUrl() + p);

/**
 * Subscribe to live updates. The server tailors the stream to the viewer:
 * staff (token) get everything, guests (customerId) get their own orders/bookings + public content.
 * Reconnects automatically. Returns an unsubscribe function.
 */
export function subscribe(who: { customerId: string; token: string | null }, h: Handlers) {
  let es: EventSource | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  const qs = new URLSearchParams({ customerId: who.customerId, ...(who.token ? { token: who.token } : {}) });

  const open = () => {
    es = new EventSource(`${getServerUrl()}/api/events?${qs}`);
    const on = <T,>(type: string, fn: (d: T) => void) => es!.addEventListener(type, (e) => fn(JSON.parse((e as MessageEvent).data)));
    on<Snapshot>('snapshot', (d) => { h.status(true); h.snapshot(d); });
    on('order', h.order); on('booking', h.booking); on('post', h.post);
    on('ads', h.ads); on('vouchers', h.vouchers); on('me', h.me); on('menu', h.menu); on('events', h.events); on('ticket', h.ticket); on('content', h.content); on('wallet', h.wallet); on('happyHours', h.happyHours); on('walletChanged', h.walletChanged); on('spaces', h.spaces);
    es.onerror = () => {
      h.status(false);
      es?.close();
      if (!closed) retry = setTimeout(open, 3000);
    };
  };
  open();
  return () => { closed = true; clearTimeout(retry); es?.close(); };
}
