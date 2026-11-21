import type { Booking, Order } from './types';

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

export interface Snapshot { orders: Order[]; bookings: Booking[] }

/** Subscribe to live updates. Reconnects automatically. Returns an unsubscribe function. */
export function subscribe(handlers: {
  snapshot: (s: Snapshot) => void;
  order: (o: Order) => void;
  booking: (b: Booking) => void;
  status: (online: boolean) => void;
}) {
  let es: EventSource | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const open = () => {
    es = new EventSource(getServerUrl() + '/api/events');
    es.addEventListener('snapshot', (e) => { handlers.status(true); handlers.snapshot(JSON.parse((e as MessageEvent).data)); });
    es.addEventListener('order', (e) => handlers.order(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('booking', (e) => handlers.booking(JSON.parse((e as MessageEvent).data)));
    es.onerror = () => {
      handlers.status(false);
      es?.close();
      if (!closed) retry = setTimeout(open, 3000);
    };
  };
  open();
  return () => { closed = true; clearTimeout(retry); es?.close(); };
}
