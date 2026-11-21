import type { MenuItem, Ad, Booking, CustomerStats, Order, Post, Settings, Voucher } from './types';

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

export async function api<T>(path: string, opts: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
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
  if (!res.ok) throw new ApiError((data as { error?: string }).error || `Request failed (${res.status})`);
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
    on('ads', h.ads); on('vouchers', h.vouchers); on('me', h.me); on('menu', h.menu);
    es.onerror = () => {
      h.status(false);
      es?.close();
      if (!closed) retry = setTimeout(open, 3000);
    };
  };
  open();
  return () => { closed = true; clearTimeout(retry); es?.close(); };
}
