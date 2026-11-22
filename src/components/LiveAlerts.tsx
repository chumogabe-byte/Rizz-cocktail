import { useEffect, useRef } from 'react';
import { showToast, useStore } from '../store/store';
import { confetti } from '../fx';

const buzz = (pattern: number[]) => { try { navigator.vibrate?.(pattern); } catch { /* not supported */ } };

/**
 * Watches the guest's own orders, bookings, tickets and wallet and pops an alert (toast + vibration)
 * the moment something happens — whichever screen they're on.
 */
export function LiveAlerts() {
  const orders = useStore((s) => s.orders);
  const bookings = useStore((s) => s.bookings);
  const loaded = useStore((s) => s.loaded);
  const last = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    if (!loaded) return;
    const now: Record<string, string> = {};
    orders.forEach((o) => (now[`o:${o.id}`] = `${o.status}|${o.payment?.status ?? ''}`));
    bookings.filter((b) => !b.anon).forEach((b) => (now[`b:${b.id}`] = b.status));
    const prev = last.current;
    last.current = now;
    if (!prev) return; // first snapshot: nothing to announce
    for (const o of orders) {
      const before = prev[`o:${o.id}`]; if (!before) continue;
      const [st] = before.split('|');
      if (st !== o.status) {
        if (o.status === 'preparing') showToast(`🍸 ${o.code}: the bartenders are on it`);
        if (o.status === 'ready') { buzz([200, 100, 200]); confetti({ count: 40, emojis: ['🛎️', '✨'] }); showToast(o.fulfilment === 'pickup' ? `🛎️ ${o.code} is ready — collect at the bar!` : `🛎️ ${o.code} is ready — on its way to you!`); }
        if (o.status === 'cancelled') { buzz([300]); showToast(`${o.code} was cancelled${o.payment?.status === 'refunded' ? ' — refunded to your wallet' : ''}.`); }
      }
    }
    for (const b of bookings) {
      const before = prev[`b:${b.id}`]; if (!before || before === b.status) continue;
      if (b.status === 'confirmed') { buzz([150, 80, 150]); showToast(`✅ Your ${b.spaceName} booking is confirmed!`); }
      if (b.status === 'declined') { buzz([300]); showToast(`Sorry — your ${b.spaceName} booking couldn't be confirmed.`); }
    }
  }, [orders, bookings, loaded]);

  return null;
}
