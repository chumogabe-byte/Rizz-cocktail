import { useState } from 'react';
import type { Nav } from '../router';
import { actions, useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { Stepper } from '../components/Layout';
import { money } from '../config';
import { eventBg, fmtWhen } from './Events';
import { isValidKePhone } from '../components/MpesaPay';
import { confetti } from '../fx';

export function EventDetail({ nav, id }: { nav: Nav; id: string }) {
  const e = useStore((s) => s.events.find((x) => x.id === id));
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const user = useStore((s) => s.user);
  const walletBalance = useStore((s) => s.wallet?.balance ?? 0);
  const [payChoice, setPayChoice] = useState<'wallet' | 'mpesa' | 'door' | null>(null);
  const [phone, setPhone] = useState(user?.phone || '');
  if (!e) return <div className="screen"><p className="muted pad">Loading event…</p></div>;

  const total = e.ticketTypes.reduce((s, t) => s + t.price * (qty[t.id] || 0), 0);
  const count = Object.values(qty).reduce((a, b) => a + b, 0);
  const past = (e.endsAt || e.startsAt) < Date.now();
  const paidEvent = e.ticketTypes.some((t) => t.price > 0);
  const pay = payChoice ?? (walletBalance > 0 && walletBalance >= total ? 'wallet' : 'mpesa');
  const payNow = pay !== 'door';

  const buy = async () => {
    if (total > 0 && pay === 'mpesa' && !isValidKePhone(phone)) return setErr('Enter your M-Pesa number, e.g. 0712 345 678.');
    if (total > 0 && pay === 'wallet' && walletBalance < total) return setErr('Not enough in your wallet — top up or choose M-Pesa.');
    setBusy(true); setErr('');
    try {
      const t = await actions.buyTickets(e.id, Object.entries(qty).filter(([, q]) => q > 0).map(([typeId, q]) => ({ typeId, qty: q })), total > 0 && pay === 'wallet' ? 'wallet' : undefined);
      confetti({ emojis: ['🎟️', '🎉', '🪩', '✨'] });
      if (total > 0 && pay === 'mpesa') await actions.payMpesa('ticket', t.id, phone).catch(() => {});
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
        {e.repeat === 'weekly' && <span className="tag tag-purple">↻ Every {new Date(e.startsAt).toLocaleDateString(undefined, { weekday: 'long' })} — tickets are for the next one</span>}
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
              <button className={pay === 'wallet' ? 'on' : ''} onClick={() => setPayChoice('wallet')}>👛 Wallet</button>
              <button className={pay === 'mpesa' ? 'on' : ''} onClick={() => setPayChoice('mpesa')}>📱 M-Pesa</button>
              <button className={pay === 'door' ? 'on' : ''} onClick={() => setPayChoice('door')}>🚪 At the door</button>
            </div>
            {pay === 'wallet' && (
              <div className={`wallet-pay ${walletBalance >= total ? 'ok' : 'low'}`}>
                <div className="row-body"><strong>Rizz Wallet · {money(walletBalance)}</strong>
                  <span className="tiny">{walletBalance >= total ? 'Tickets paid instantly' : `You need ${money(total - walletBalance)} more`}</span></div>
                <button className="btn btn-ghost sm" onClick={() => nav.go({ name: 'wallet' })}>Top up</button>
              </div>
            )}
            {pay === 'mpesa' && <label className="field"><span>M-Pesa number</span><input inputMode="tel" value={phone} onChange={(x) => { setPhone(x.target.value); setErr(''); }} placeholder="0712 345 678" /></label>}
          </div>
        )}
        <p className="tiny muted">{total > 0 ? (pay === 'wallet' ? 'Paid straight from your Rizz Wallet — your QR tickets are ready instantly.' : payNow ? "Your seats are held while you approve the M-Pesa prompt. Your QR tickets appear in My tickets — they're marked Paid the moment M-Pesa confirms." : 'Your tickets are reserved instantly. Pay at the door or bar — show the QR codes in My tickets.') + ' Paid tickets earn Rizz Rewards points.' : count > 0 || !paidEvent ? 'Free RSVP — show your QR code at the door to skip the queue.' : 'Choose your tickets above, then pay with M-Pesa or at the door.'}</p>
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
