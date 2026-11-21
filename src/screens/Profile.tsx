import { useState } from 'react';
import type { Nav } from '../router';
import { actions, useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { TopBar } from '../components/Layout';
import { BAR, money } from '../config';

export function Profile({ nav }: { nav: Nav }) {
  const user = useStore((s) => s.user)!;
  const orders = useStore((s) => s.orders).filter((o) => o.customer === user.name && o.status !== 'cancelled');
  const bookings = useStore((s) => s.bookings).filter((b) => b.customer === user.name);
  const favs = useStore((s) => s.favorites);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState(false);
  const spent = orders.reduce((s, o) => s + o.total, 0);
  const points = Math.floor(spent);

  return (
    <div className="screen">
      <TopBar title="Profile" />
      <div className="profile-head">
        <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
        <h2>{user.name}</h2>
        <p className="muted small">{user.phone || 'No phone added'}</p>
        <div className="stats">
          <div><strong>{orders.length}</strong><small>Orders</small></div>
          <div><strong>{bookings.length}</strong><small>Bookings</small></div>
          <div><strong>{favs.length}</strong><small>Favourites</small></div>
        </div>
      </div>

      <div className="loyalty">
        <div><small>Rizz Rewards</small><strong>{points} pts</strong><span className="tiny">Spent {money(spent)} · 100 pts = free cocktail</span></div>
        <div className="loyalty-bar"><span style={{ width: `${Math.min(100, points % 100)}%` }} /></div>
      </div>

      <div className="list">
        <button className="row-card" onClick={() => nav.go({ name: 'activity', tab: 'orders' })}><Icon name="receipt" /><div className="row-body"><strong>Order history</strong></div>›</button>
        <button className="row-card" onClick={() => nav.go({ name: 'activity', tab: 'bookings' })}><Icon name="calendar" /><div className="row-body"><strong>My bookings</strong></div>›</button>
        <a className="row-card" href={`tel:${BAR.phone.replace(/\s/g, '')}`}><Icon name="bell" /><div className="row-body"><strong>Call the bar</strong><span className="small muted">{BAR.phone}</span></div>›</a>
      </div>

      <div className="card stack">
        <h3><Icon name="shield" size={16} /> Staff console</h3>
        <p className="tiny muted">Bartenders & managers: receive orders and manage bookings. Demo PIN: {BAR.staffPin}</p>
        <form className="row-gap" onSubmit={(e) => { e.preventDefault(); if (actions.unlockStaff(pin)) nav.go({ name: 'staff' }); else setPinErr(true); }}>
          <input className={`grow ${pinErr ? 'invalid' : ''}`} type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={(e) => { setPin(e.target.value); setPinErr(false); }} />
          <button className="btn btn-primary" type="submit">Enter</button>
        </form>
      </div>

      <button className="btn btn-ghost btn-block danger" onClick={actions.logout}><Icon name="logout" size={16} /> Sign out</button>
    </div>
  );
}
