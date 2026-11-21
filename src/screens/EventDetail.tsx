import { useState } from 'react';
import type { Nav } from '../router';
import { actions, useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { Stepper } from '../components/Layout';
import { money } from '../config';
import { eventBg, fmtWhen } from './Events';
import { isValidKePhone } from '../components/MpesaPay';

export function EventDetail({ nav, id }: { nav: Nav; id: string }) {
  const e = useStore((s) => s.events.find((x) => x.id === id));
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const user = useStore((s) => s.user);
  const [payNow, setPayNow] = useState(true);
  const [phone, setPhone] = useState(user?.phone || '');
  if (!e) return <div className="screen"><p className="muted pad">Loading event…</p></div>;

  const total = e.ticketTypes.reduce((s, t) => s + t.price * (qty[t.id] || 0), 0);
  const count = Object.values(qty).reduce((a, b) => a + b, 0);
  const past = (e.endsAt || e.startsAt) < Date.now();

  const buy = async () => {
    if (total > 0 && payNow && !isValidKePhone(phone)) return setErr('Enter your M-Pesa number, e.g. 0712 345 678.');
    setBusy(true); setErr('');
    try {
      const t = await actions.buyTickets(e.id, Object.entries(qty).filter(([, q]) => q > 0).map(([typeId, q]) => ({ typeId, qty: q })));
      if (total > 0 && payNow) await actions.payMpesa('ticket', t.id, phone).catch(() => {});
      nav.go({ name: 'tickets' });
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="screen detail">
      <div className="event-hero" style={{ background: eventBg(e, false) }}>
        {!e.image && <span className="event-hero-emoji">{e.emoji}</span>}
        <div className="detail-hero-bar">
          <button className="icon-btn glass" onClick={nav.back} aria-label="Back"><Icon name="back" /></button>
          <button className="icon-btn glass" onClick={() => nav.go({ name: 'tickets' })} aria-label="My tickets"><Icon name="ticket" /></button>
        </div>
      </div>
      <div className="detail-body">
        {e.featured && <span className="tag tag-lime">★ Featured event</span>}
        <h1 className="display-sm">{e.title}</h1>
        {e.subtitle && <p className="muted">{e.subtitle}</p>}
        <div className="info-card">
          <div><Icon name="calendar" size={16} /> {fmtWhen(e.startsAt)}{e.endsAt ? ` – ${new Date(e.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
          <div><Icon name="pin" size={16} /> {e.location || 'Rizz Bar'}</div>
        </div>
        <p className="muted">{e.description}</p>

        <h3>Tickets</h3>
        {past && <p className="error">This event has finished.</p>}
        <div className="list">
          {e.ticketTypes.map((t) => {
            const left = t.capacity - (e.sold[t.id] || 0);
            return (
              <div key={t.id} className={`ticket-type ${left <= 0 ? 'off' : ''}`}>
                <div className="row-body">
                  <strong>{t.name}</strong>
                  <span className="price">{t.price === 0 ? 'Free' : money(t.price)}</span>
                  <span className="tiny muted">{left <= 0 ? 'Sold out' : left <= 10 ? `Only ${left} left!` : `${left} available`}</span>
                </div>
                {left > 0 && !past && <Stepper value={qty[t.id] || 0} onChange={(n) => setQty({ ...qty, [t.id]: Math.min(n, left, 20) })} />}
              </div>
            );
          })}
        </div>
        {total > 0 && (
          <div className="card stack">
            <h3>Payment</h3>
            <div className="seg">
              <button className={payNow ? 'on' : ''} onClick={() => setPayNow(true)}>📱 Pay now with M-Pesa</button>
              <button className={!payNow ? 'on' : ''} onClick={() => setPayNow(false)}>🚪 Pay at the door</button>
            </div>
            {payNow && <label className="field"><span>M-Pesa number</span><input inputMode="tel" value={phone} onChange={(x) => { setPhone(x.target.value); setErr(''); }} placeholder="0712 345 678" /></label>}
          </div>
        )}
        <p className="tiny muted">{total > 0 ? (payNow ? "Your seats are held while you approve the M-Pesa prompt. Your QR tickets appear in My tickets — they're marked Paid the moment M-Pesa confirms." : 'Your tickets are reserved instantly. Pay at the door or bar — show the QR codes in My tickets.') + ' Paid tickets earn Rizz Rewards points.' : 'Free RSVP — show your QR code at the door to skip the queue.'}</p>
        {err && <p className="error">{err}</p>}
      </div>
      {!past && (
        <div className="sticky-cta">
          <button className="btn btn-lime grow" disabled={!count || busy} onClick={buy}>
            {busy ? 'Reserving…' : !count ? 'Choose tickets' : total > 0 ? `${payNow ? 'Pay' : 'Reserve'} ${count} ticket${count > 1 ? 's' : ''} · ${money(total)}` : `Get ${count} free ticket${count > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
