import type { Nav } from '../router';
import { SPACES } from '../data/spaces';
import { actions, useStore } from '../store/store';
import { Art } from '../components/Art';
import { Icon } from '../components/Icon';
import { TopBar } from '../components/Layout';
import { BAR, money } from '../config';

export const bookingStatusText: Record<string, string> = {
  pending: 'Awaiting confirmation', confirmed: 'Confirmed', declined: 'Declined', 'checked-in': 'Checked in', cancelled: 'Cancelled',
};

export const fmtDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export function BookingDetail({ nav, id }: { nav: Nav; id: string }) {
  const b = useStore((s) => s.bookings.find((x) => x.id === id));
  if (!b) return null;
  const sp = SPACES.find((s) => s.id === b.spaceId);

  return (
    <div className="screen">
      <TopBar title="Booking" onBack={() => nav.go({ name: 'home' })} />
      <div className="ticket">
        {sp && <Art emoji={sp.emoji} gradient={sp.gradient} size="lg" />}
        <div className="ticket-body">
          <span className={`status status-${b.status}`}>{bookingStatusText[b.status]}</span>
          <h2>{b.spaceName}</h2>
          <div className="ticket-grid">
            <div><Icon name="calendar" size={16} /><span>{fmtDate(b.date)}</span></div>
            <div><Icon name="clock" size={16} /><span>{b.time} · {b.durationHrs}h</span></div>
            <div><Icon name="users" size={16} /><span>{b.guests} guests</span></div>
            <div><Icon name="pin" size={16} /><span>{BAR.address}</span></div>
          </div>
          {b.occasion && <p className="small">🎉 {b.occasion}</p>}
          {b.notes && <p className="small muted">“{b.notes}”</p>}
          {sp && sp.minSpend > 0 && <p className="tiny muted">Minimum spend {money(sp.minSpend)}</p>}
          <div className="ticket-cut" />
          <div className="ticket-code"><small className="muted">Booking code</small><strong>{b.code}</strong></div>
          {b.status === 'pending' && <p className="tiny muted center">We'll confirm shortly via {b.phone}.</p>}
        </div>
      </div>
      <div className="row-gap">
        <button className="btn btn-primary grow" onClick={() => nav.go({ name: 'menu' })}>Pre-order drinks</button>
        {['pending', 'confirmed'].includes(b.status) && (
          <button className="btn btn-ghost grow danger" onClick={() => actions.setBookingStatus(b.id, 'cancelled')}>Cancel</button>
        )}
      </div>
    </div>
  );
}
