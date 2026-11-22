import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { Nav } from '../router';
import type { TicketOrder } from '../types';
import { actions, run, useStore } from '../store/store';
import { Empty, TopBar } from '../components/Layout';
import { money } from '../config';
import { fmtWhen } from './Events';
import { MpesaPay } from '../components/MpesaPay';
import { PayFromWallet } from './Wallet';

const STATUS: Record<string, string> = { reserved: 'Unpaid', paid: 'Paid', 'checked-in': 'Checked in', cancelled: 'Cancelled' };

export function MyTickets({ nav }: { nav: Nav }) {
  const tickets = useStore((s) => s.tickets);
  const live = tickets.filter((t) => t.status !== 'cancelled' && t.startsAt > Date.now() - 12 * 3600e3);
  const past = tickets.filter((t) => !live.includes(t));
  return (
    <div className="screen">
      <TopBar title="My tickets" onBack={nav.back} />
      {tickets.length === 0 && <Empty emoji="🎟️" title="No tickets yet" text="Grab tickets for upcoming events — they'll show up here with QR codes."
        action={<button className="btn btn-lime" onClick={() => nav.go({ name: 'events' })}>See events</button>} />}
      {live.map((t) => <TicketCard key={t.id} t={t} onTopUp={() => nav.go({ name: 'wallet' })} />)}
      {past.length > 0 && <h3 className="muted">Past & cancelled</h3>}
      {past.map((t) => <TicketCard key={t.id} t={t} compact />)}
    </div>
  );
}

function TicketCard({ t, compact, onTopUp }: { t: TicketOrder; compact?: boolean; onTopUp?: () => void }) {
  const [qr, setQr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (compact) return;
    Promise.all(t.units.map(async (u) => [u.code, await QRCode.toDataURL(u.code, { margin: 1, width: 240 })] as const))
      .then((pairs) => setQr(Object.fromEntries(pairs)));
  }, [t.units, compact]);
  return (
    <div className={`ticket-order ${compact ? 'compact' : ''}`}>
      <div className="ticket-order-head">
        <div className="row-body"><strong>{t.eventTitle}</strong><span className="small muted">{fmtWhen(t.startsAt)} · {t.location}</span></div>
        <span className={`status status-${t.status === 'reserved' ? 'pending' : t.status === 'paid' ? 'confirmed' : t.status}`}>{t.status === 'paid' && t.total === 0 ? 'Confirmed' : STATUS[t.status]}</span>
      </div>
      <div className="small">{t.lines.map((l) => `${l.qty}× ${l.name}`).join(' · ')} — <b>{t.total ? money(t.total) : 'Free'}</b></div>
      {!compact && (
        <div className="qr-row">
          {t.units.map((u) => (
            <figure key={u.code} className={`qr ${u.checkedInAt ? 'used' : ''}`}>
              {qr[u.code] && <img src={qr[u.code]} alt={`Ticket ${u.code}`} />}
              <figcaption><b>{u.code}</b><small>{u.typeName}{u.checkedInAt ? ' · used' : ''}</small></figcaption>
            </figure>
          ))}
        </div>
      )}
      {!compact && t.total > 0 && t.status !== 'cancelled' && !['paid', 'pending'].includes(t.payment?.status ?? '') && (
        <PayFromWallet kind="ticket" refId={t.id} amount={t.total} onTopUp={onTopUp ?? (() => {})} />
      )}
      {!compact && t.total > 0 && t.status !== 'cancelled' && (t.payment?.status !== 'paid' || t.payment.method === 'mpesa' || t.payment.method === 'wallet') && (
        <MpesaPay kind="ticket" refId={t.id} amount={t.total} payment={t.payment} title="Pay for these tickets" />
      )}
      {t.status === 'reserved' && !compact && t.payment?.status !== 'pending' && (
        <button className="link small danger" onClick={() => { if (confirm('Cancel these tickets?')) run(actions.setTicketStatus(t.id, 'cancelled')); }}>Cancel reservation</button>
      )}
    </div>
  );
}
