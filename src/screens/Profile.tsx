import { useState } from 'react';
import type { Nav } from '../router';
import { actions, connect, useStore } from '../store/store';
import { getServerUrl, setServerUrl } from '../api';
import { Icon } from '../components/Icon';
import { TopBar } from '../components/Layout';
import { money, useBar } from '../config';

export function Profile({ nav }: { nav: Nav }) {
  const bar = useBar();
  const wallet = useStore((s) => s.wallet);
  const staffToken = useStore((s) => s.staffToken);
  const user = useStore((s) => s.user)!;
  const customerId = useStore((s) => s.customerId);
  const online = useStore((s) => s.online);
  const orders = useStore((s) => s.orders).filter((o) => o.customerId === customerId && o.status !== 'cancelled');
  const bookings = useStore((s) => s.bookings).filter((b) => b.customerId === customerId);
  const [server, setServer] = useState(getServerUrl());
  const [saved, setSaved] = useState(false);
  const favs = useStore((s) => s.favorites);
  const me = useStore((s) => s.me);
  const threshold = useStore((s) => s.settings.rewardThreshold) || 100;
  const spent = me?.spent ?? 0;
  const points = me?.points ?? 0;

  return (
    <div className="screen">
      <TopBar title="Profile" onBack={nav.back} />
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

      <button className="loyalty" onClick={() => nav.go({ name: 'rewards' })}>
        <div><small>Rizz Rewards</small><strong>{points} pts</strong><span className="tiny">Spent {money(spent)} via the app · tap for your codes</span></div>
        <div className="loyalty-bar"><span style={{ width: `${((points % threshold) / threshold) * 100}%` }} /></div>
      </button>

      <div className="list">
        <button className="row-card" onClick={() => nav.go({ name: 'activity', tab: 'orders' })}><Icon name="receipt" /><div className="row-body"><strong>Order history</strong></div>›</button>
        <button className="row-card" onClick={() => nav.go({ name: 'activity', tab: 'bookings' })}><Icon name="calendar" /><div className="row-body"><strong>My bookings</strong></div>›</button>
        <button className="row-card" onClick={() => nav.go({ name: 'wallet' })}><span style={{ fontSize: 20 }}>👛</span><div className="row-body"><strong>Rizz Wallet</strong><span className="small muted">Balance {money(wallet?.balance ?? 0)}</span></div>›</button>
        <button className="row-card" onClick={() => nav.go({ name: 'tickets' })}><Icon name="ticket" /><div className="row-body"><strong>My event tickets</strong></div>›</button>
        <button className="row-card" onClick={() => actions.setMode('admin')}><Icon name="shield" /><div className="row-body"><strong>Staff & admin</strong><span className="small muted">{staffToken ? 'Back to the admin side' : 'Log in to manage the bar'}</span></div>›</button>
        <button className="row-card" onClick={() => nav.go({ name: 'rewards' })}><Icon name="star" /><div className="row-body"><strong>Rewards & codes</strong></div>›</button>
        <a className="row-card" href={`tel:${bar.phone.replace(/\s/g, '')}`}><Icon name="bell" /><div className="row-body"><strong>Call the bar</strong><span className="small muted">{bar.phone}</span></div>›</a>
      </div>

      <div className="card stack">
        <h3>Server <span className={`status ${online ? 'status-served' : 'status-cancelled'}`}>{online ? 'Connected' : 'Offline'}</span></h3>
        <p className="tiny muted">The bar's server address. Leave blank when using the web app hosted by the bar.</p>
        <form className="row-gap" onSubmit={(e) => { e.preventDefault(); setServerUrl(server); connect(); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
          <input className="grow" value={server} onChange={(e) => setServer(e.target.value)} placeholder="https://rizz.example.com" inputMode="url" autoCapitalize="off" />
          <button className="btn btn-ghost" type="submit">{saved ? '✓' : 'Save'}</button>
        </form>
      </div>

      <button className="btn btn-ghost btn-block danger" onClick={actions.logout}><Icon name="logout" size={16} /> Sign out</button>
    </div>
  );
}
