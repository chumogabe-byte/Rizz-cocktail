import { useState } from 'react';
import type { Nav } from '../router';
import { useStore } from '../store/store';
import { Empty, TopBar } from '../components/Layout';
import { money } from '../config';
import { statusLabel } from './Home';
import { bookingStatusText, fmtDate } from './BookingDetail';

export function Activity({ nav, tab: initial }: { nav: Nav; tab?: 'orders' | 'bookings' }) {
  const [tab, setTab] = useState(initial ?? 'orders');
  const customerId = useStore((s) => s.customerId);
  const orders = useStore((s) => s.orders).filter((o) => o.customerId === customerId);
  const bookings = useStore((s) => s.bookings).filter((b) => b.customerId === customerId);

  return (
    <div className="screen">
      <TopBar title="My activity" />
      <div className="seg">
        <button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>Orders ({orders.length})</button>
        <button className={tab === 'bookings' ? 'on' : ''} onClick={() => setTab('bookings')}>Bookings ({bookings.length})</button>
      </div>
      <div className="list">
        {tab === 'orders' && (orders.length === 0
          ? <Empty emoji="🧾" title="No orders yet" action={<button className="btn btn-primary" onClick={() => nav.go({ name: 'menu' })}>Order now</button>} />
          : orders.map((o) => (
            <button key={o.id} className="row-card" onClick={() => nav.go({ name: 'order', id: o.id })}>
              <div className="row-icon">🍸</div>
              <div className="row-body">
                <strong>{o.code} · {money(o.total)}</strong>
                <span className="muted small clamp1">{o.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}</span>
                <span className="tiny muted">{new Date(o.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <span className={`status status-${o.status}`}>{statusLabel(o.status)}</span>
            </button>
          )))}
        {tab === 'bookings' && (bookings.length === 0
          ? <Empty emoji="📅" title="No bookings yet" action={<button className="btn btn-lime" onClick={() => nav.go({ name: 'book' })}>Book a space</button>} />
          : bookings.map((b) => (
            <button key={b.id} className="row-card" onClick={() => nav.go({ name: 'booking', id: b.id })}>
              <div className="row-icon">📅</div>
              <div className="row-body">
                <strong>{b.spaceName}</strong>
                <span className="muted small">{fmtDate(b.date)} · {b.time} · {b.guests} guests</span>
              </div>
              <span className={`status status-${b.status}`}>{bookingStatusText[b.status]}</span>
            </button>
          )))}
      </div>
    </div>
  );
}
