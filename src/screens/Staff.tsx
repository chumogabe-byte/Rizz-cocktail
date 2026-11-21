import { useEffect, useRef, useState } from 'react';
import type { Booking, Order, OrderStatus } from '../types';
import { actions, run, useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { money, seatLabel, useBar } from '../config';
import { bookingStatusText, fmtDate } from './BookingDetail';
import { AdsPanel, CustomersPanel, PromosPanel, SocialPanel } from './StaffMarketing';
import { MenuPanel } from './StaffMenu';
import { SettingsPanel, SpacesPanel } from '../admin/AdminContent';
import { getServerUrl } from '../api';
import type { StaffRole } from '../types';
import { PayBadge } from '../components/MpesaPay';
import { EventsPanel } from './StaffEvents';

type Tab = 'orders' | 'bookings' | 'events' | 'menu' | 'spaces' | 'settings' | 'promos' | 'ads' | 'social' | 'customers' | 'overview';

const COLUMNS: { s: OrderStatus; title: string; next?: OrderStatus; cta?: string }[] = [
  { s: 'new', title: 'New', next: 'preparing', cta: 'Accept & prepare' },
  { s: 'preparing', title: 'Preparing', next: 'ready', cta: 'Mark ready' },
  { s: 'ready', title: 'Ready', next: 'served', cta: 'Served' },
];

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.15);
      o.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch { /* audio unavailable */ }
}

function useNow(ms = 15000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

type NavItem = [Tab, string, string, StaffRole[]];
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Operations', items: [['overview', '📊', 'Dashboard', ['admin']], ['orders', '🧾', 'Orders', ['admin', 'staff']], ['bookings', '📅', 'Bookings', ['admin', 'staff']], ['events', '🎉', 'Events & Tickets', ['admin', 'staff']]] },
  { group: 'Catalogue', items: [['menu', '🍸', 'Menu & Prices', ['admin']], ['spaces', '🛋️', 'Spaces', ['admin']]] },
  { group: 'Marketing', items: [['ads', '📣', 'Offers & Hero slides', ['admin']], ['promos', '🎟️', 'Promo codes & Rewards', ['admin']], ['social', '📸', 'Moments', ['admin', 'staff']]] },
  { group: 'People & app', items: [['customers', '👥', 'Customers', ['admin']], ['settings', '🎨', 'App & Branding', ['admin']]] },
];

export function Staff({ onExit }: { onExit: () => void }) {
  const bar = useBar();
  const role = useStore((s) => s.staffRole) ?? 'staff';
  const orders = useStore((s) => s.orders);
  const bookings = useStore((s) => s.bookings);
  const [tab, setTab] = useState<Tab>('orders');
  const allowed = (t: Tab) => NAV.some((g) => g.items.some(([id, , , roles]) => id === t && roles.includes(role)));
  useEffect(() => { if (!allowed(tab)) setTab('orders'); }, [role]); // eslint-disable-line react-hooks/exhaustive-deps
  const [menuOpen, setMenuOpen] = useState(false);
  const posts = useStore((s) => s.posts);
  const mpesa = useStore((s) => s.mpesa);
  const [sound, setSound] = useState(true);
  const now = useNow();

  const newCount = orders.filter((o) => o.status === 'new').length;
  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
  const prevNew = useRef(newCount);
  useEffect(() => {
    if (newCount > prevNew.current && sound) chime();
    prevNew.current = newCount;
  }, [newCount, sound]);

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) === today && o.status !== 'cancelled');
  const revenue = todayOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="admin-shell">
      <aside className={`admin-side ${menuOpen ? 'open' : ''}`}>
        <div className="brand-mark sm">{bar.name.toUpperCase()}<span>.</span> <small>Admin</small></div>
        <span className={`role-badge ${role}`}>{role === 'admin' ? '👑 Admin — full access' : '🧑‍🍳 Staff — operations'}</span>
        {NAV.map((g) => {
          const items = g.items.filter(([, , , roles]) => roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={g.group} className="admin-nav-group">
              <small>{g.group}</small>
              {items.map(([id, icon, label]) => (
                <button key={id} className={`admin-nav ${tab === id ? 'on' : ''}`} onClick={() => { setTab(id); setMenuOpen(false); window.scrollTo(0, 0); }}>
                  <span>{icon}</span>{label}
                  {id === 'orders' && newCount > 0 && <span className="badge inline">{newCount}</span>}
                  {id === 'bookings' && pendingBookings > 0 && <span className="badge inline">{pendingBookings}</span>}
                </button>
              ))}
            </div>
          );
        })}
        <div className="admin-nav-group">
          <small>Screens</small>
          <a className="admin-nav" href={`${getServerUrl() || location.origin}/#tv`} target="_blank" rel="noreferrer"><span>📺</span>Bar TV screen</a>
          <a className="admin-nav" href={`${getServerUrl() || location.origin}/`} target="_blank" rel="noreferrer"><span>📱</span>Open guest app</a>
        </div>
        <button className="admin-nav danger" onClick={onExit}><span>🚪</span>Log out</button>
      </aside>
      {menuOpen && <div className="admin-scrim" onClick={() => setMenuOpen(false)} />}
    <div className="staff">
      <header className="staff-head">
        <div className="row-gap">
          <button className="icon-btn admin-burger" onClick={() => setMenuOpen(true)} aria-label="Menu">☰</button>
          <h2 className="admin-title">{NAV.flatMap((g) => g.items).find(([id]) => id === tab)?.[2]}</h2>
        </div>
        <div className="row-gap">
          {mpesa && <span className={`pay-badge ${mpesa.mode === 'production' ? 'paid' : 'pending'}`} title="M-Pesa mode">M-Pesa: {mpesa.mode === 'mock' ? 'TEST MODE' : mpesa.mode === 'sandbox' ? 'Sandbox' : 'Live'}</span>}
          <button className={`icon-btn ${sound ? '' : 'muted'}`} onClick={() => setSound(!sound)} title="Sound alerts"><Icon name="bell" /></button>
        </div>
      </header>

      {role === 'admin' && orders.length === 0 && bookings.length === 0 && (tab === 'orders' || tab === 'overview') && (
        <div className="card center stack">
          <p className="muted">No orders or bookings yet. Open the app in another tab to place one — it'll appear here live.</p>
          <button className="btn btn-ghost" onClick={() => run(actions.seedDemo())}>Load demo data</button>
        </div>
      )}

      {tab === 'orders' && (
        <>
          <div className="kanban">
            {COLUMNS.map((c) => {
              const list = orders.filter((o) => o.status === c.s).sort((a, b) => a.createdAt - b.createdAt);
              return (
                <section key={c.s} className={`kcol kcol-${c.s}`}>
                  <h3>{c.title} <span className="count">{list.length}</span></h3>
                  {list.length === 0 && <p className="tiny muted pad">Nothing here</p>}
                  {list.map((o) => <OrderTicket key={o.id} o={o} now={now} cta={c.cta} onNext={() => { if (c.next) run(actions.setOrderStatus(o.id, c.next)); }} />)}
                </section>
              );
            })}
          </div>
          <RecentlyClosed orders={orders.filter((o) => o.status === 'served' || o.status === 'cancelled').slice(0, 8)} />
        </>
      )}

      {tab === 'bookings' && <BookingsBoard bookings={bookings} />}
      {tab === 'events' && <EventsPanel />}
      {tab === 'menu' && <MenuPanel />}
      {tab === 'spaces' && <SpacesPanel />}
      {tab === 'settings' && <SettingsPanel />}
      {tab === 'promos' && <PromosPanel />}
      {tab === 'ads' && <AdsPanel />}
      {tab === 'social' && <SocialPanel />}
      {tab === 'customers' && <CustomersPanel />}

      {tab === 'overview' && (
        <div className="overview">
          <div className="kpi"><small>Revenue today</small><strong>{money(revenue)}</strong></div>
          <div className="kpi"><small>Orders today</small><strong>{todayOrders.length}</strong></div>
          <div className="kpi"><small>Avg. order</small><strong>{money(todayOrders.length ? revenue / todayOrders.length : 0)}</strong></div>
          <div className="kpi"><small>M-Pesa collected today</small><strong>{money(todayOrders.filter((o) => o.payment?.method === 'mpesa' && o.payment.status === 'paid').reduce((s, o) => s + (o.payment?.amount ?? o.total), 0))}</strong></div>
          <div className="kpi"><small>Unpaid orders today</small><strong>{todayOrders.filter((o) => o.payment && o.payment.status !== 'paid').length}</strong></div>
          <div className="kpi"><small>Discounts given today</small><strong>{money(todayOrders.reduce((s, o) => s + (o.discount ?? 0), 0))}</strong></div>
          <div className="kpi"><small>Promo orders today</small><strong>{todayOrders.filter((o) => o.voucherCode).length}</strong></div>
          <div className="kpi"><small>Moments posted</small><strong>{posts.length}</strong></div>
          <div className="kpi"><small>Bookings today</small><strong>{bookings.filter((b) => b.date === today && ['confirmed', 'checked-in', 'pending'].includes(b.status)).length}</strong></div>
          <div className="card span2">
            <h3>Top sellers</h3>
            {topSellers(todayOrders).map(([name, qty]) => (
              <div key={name} className="line-mini"><span>{name}</span><span>{qty} sold</span></div>
            ))}
            {todayOrders.length === 0 && <p className="tiny muted">No sales yet today.</p>}
          </div>
          <div className="card span2">
            <h3>Ratings</h3>
            <p className="small muted">{(() => { const r = orders.filter((o) => o.rating != null); return r.length ? `${(r.reduce((s, o) => s + o.rating!, 0) / r.length + 1).toFixed(1)} / 6 average from ${r.length} guests` : 'No ratings yet'; })()}</p>
          </div>
        </div>
      )}
      <p className="tiny muted center pad">{bar.name} · {bar.address}</p>
    </div>
    </div>
  );
}

function topSellers(orders: Order[]) {
  const m = new Map<string, number>();
  orders.forEach((o) => o.lines.forEach((l) => m.set(l.name, (m.get(l.name) ?? 0) + l.qty)));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function OrderTicket({ o, now, cta, onNext }: { o: Order; now: number; cta?: string; onNext: () => void }) {
  const mins = Math.max(0, Math.floor((now - o.createdAt) / 60000));
  const late = mins >= 15 && o.status !== 'ready';
  return (
    <article className={`ticket-card ${late ? 'late' : ''}`}>
      <div className="ticket-card-head">
        <strong>{o.code}</strong>
        <span className={`timer ${late ? 'late' : ''}`}><Icon name="clock" size={12} /> {mins}m</span>
      </div>
      <div className="small">
        <b>{o.fulfilment === 'table' ? seatLabel(o.table) : 'Pickup'}</b> · {o.customer}
      </div>
      <ul className="ticket-lines">
        {o.lines.map((l) => (
          <li key={l.key}><b>{l.qty}×</b> {l.name}
            {l.choices.length > 0 && <div className="tiny muted">{l.choices.join(' · ')}</div>}
            {l.note && <div className="tiny note">⚠ {l.note}</div>}
          </li>
        ))}
      </ul>
      {o.notes && <p className="tiny note">📝 {o.notes}</p>}
      {o.voucherCode && <p className="tiny">🎟️ {o.voucherCode} −{money(o.discount ?? 0)}</p>}
      <div className="row-gap wrap"><PayBadge payment={o.payment} total={o.total} />
        {o.payment && o.payment.status !== 'paid' && o.payment.status !== 'pending' && <button className="link tiny" onClick={() => run(actions.markOrderPaid(o.id, true))}>Mark paid (cash/card)</button>}</div>
      <div className="ticket-card-foot">
        <span className="small">{money(o.total)}</span>
        <div className="row-gap">
          {o.status === 'new' && <button className="btn btn-ghost sm danger" onClick={() => run(actions.setOrderStatus(o.id, 'cancelled'))}>Reject</button>}
          {cta && <button className="btn btn-primary sm" onClick={onNext}>{cta}</button>}
        </div>
      </div>
    </article>
  );
}

function RecentlyClosed({ orders }: { orders: Order[] }) {
  if (!orders.length) return null;
  return (
    <div className="card">
      <h3>Recently closed</h3>
      {orders.map((o) => (
        <div key={o.id} className="line-mini">
          <span>{o.code} · {o.customer}</span>
          <span className={`status status-${o.status}`}>{o.status}</span>
        </div>
      ))}
    </div>
  );
}

function BookingsBoard({ bookings }: { bookings: Booking[] }) {
  const [filter, setFilter] = useState<'upcoming' | 'pending' | 'all'>('upcoming');
  const today = new Date().toISOString().slice(0, 10);
  const list = bookings
    .filter((b) => filter === 'all' || (filter === 'pending' ? b.status === 'pending' : b.date >= today && !['cancelled', 'declined'].includes(b.status)))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <>
      <div className="chips-row">
        {(['upcoming', 'pending', 'all'] as const).map((f) => (
          <button key={f} className={`chip ${filter === f ? 'chip-active' : ''}`} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      <div className="booking-grid">
        {list.length === 0 && <p className="muted pad">No bookings.</p>}
        {list.map((b) => (
          <article key={b.id} className="ticket-card">
            <div className="ticket-card-head">
              <strong>{b.spaceName}</strong>
              <span className={`status status-${b.status}`}>{bookingStatusText[b.status]}</span>
            </div>
            <div className="small">{fmtDate(b.date)} · {b.time} · {b.durationHrs}h · <b>{b.guests} guests</b></div>
            <div className="small">{b.customer} · <a href={`tel:${b.phone}`}>{b.phone}</a></div>
            {b.occasion && <div className="tiny">🎉 {b.occasion}</div>}
            {b.notes && <div className="tiny note">📝 {b.notes}</div>}
            <div className="ticket-card-foot">
              <span className="tiny muted">{b.code}</span>
              <div className="row-gap">
                {b.status === 'pending' && <>
                  <button className="btn btn-ghost sm danger" onClick={() => run(actions.setBookingStatus(b.id, 'declined'))}>Decline</button>
                  <button className="btn btn-primary sm" onClick={() => run(actions.setBookingStatus(b.id, 'confirmed'))}>Confirm</button>
                </>}
                {b.status === 'confirmed' && <button className="btn btn-lime sm" onClick={() => run(actions.setBookingStatus(b.id, 'checked-in'))}>Check in</button>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
