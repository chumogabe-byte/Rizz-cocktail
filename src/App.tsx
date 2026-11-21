import { useCallback, useEffect, useState } from 'react';
import type { Nav, Route } from './router';
import { actions, useStore } from './store/store';
import { Icon } from './components/Icon';
import { Welcome } from './screens/Welcome';
import { Home } from './screens/Home';
import { Menu } from './screens/Menu';
import { ItemDetail } from './screens/ItemDetail';
import { Cart } from './screens/Cart';
import { OrderTracking } from './screens/OrderTracking';
import { Book } from './screens/Book';
import { BookingDetail } from './screens/BookingDetail';
import { Activity } from './screens/Activity';
import { Profile } from './screens/Profile';
import { Staff } from './screens/Staff';

const TABS: { route: Route; icon: string; label: string }[] = [
  { route: { name: 'home' }, icon: 'home', label: 'Home' },
  { route: { name: 'menu' }, icon: 'menu', label: 'Menu' },
  { route: { name: 'book' }, icon: 'calendar', label: 'Book' },
  { route: { name: 'activity' }, icon: 'receipt', label: 'Activity' },
  { route: { name: 'profile' }, icon: 'user', label: 'Profile' },
];

const initialRoute = (): Route => (location.hash === '#staff' ? { name: 'staff' } : { name: 'home' });

export default function App() {
  const user = useStore((s) => s.user);
  const staffUnlocked = useStore((s) => s.staffUnlocked);
  const [stack, setStack] = useState<Route[]>(() => [initialRoute()]);
  const route = stack[stack.length - 1];

  // Integrate with the browser/phone back button.
  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((r: Route) => {
    history.pushState(null, '');
    setStack((s) => [...s, r]);
  }, []);
  // Bottom-nav tabs replace the stack instead of piling up history.
  const switchTab = (r: Route) => {
    if (r.name !== 'home' && stack.length === 1) history.pushState(null, '');
    setStack(r.name === 'home' ? [r] : [{ name: 'home' }, r]);
  };
  const back = useCallback(() => history.back(), []);
  const nav: Nav = { go, back };

  useEffect(() => { window.scrollTo(0, 0); }, [route]);

  if (route.name === 'staff') {
    if (!staffUnlocked) return <StaffGate />;
    return <Staff nav={nav} />;
  }
  if (!user) return <div className="app"><Welcome /></div>;

  const showNav = ['home', 'menu', 'book', 'activity', 'profile'].includes(route.name);

  return (
    <div className="app">
      <main className={showNav ? 'has-nav' : ''}>
        {route.name === 'home' && <Home nav={nav} />}
        {route.name === 'menu' && <Menu key={route.category ?? 'all'} nav={nav} initial={route.category} />}
        {route.name === 'item' && <ItemDetail key={route.id} nav={nav} id={route.id} />}
        {route.name === 'cart' && <Cart nav={nav} />}
        {route.name === 'order' && <OrderTracking nav={nav} id={route.id} />}
        {route.name === 'book' && <Book key={route.spaceId ?? 'any'} nav={nav} spaceId={route.spaceId} />}
        {route.name === 'booking' && <BookingDetail nav={nav} id={route.id} />}
        {route.name === 'activity' && <Activity key={route.tab ?? 'o'} nav={nav} tab={route.tab} />}
        {route.name === 'profile' && <Profile nav={nav} />}
      </main>
      {showNav && (
        <nav className="bottom-nav">
          {TABS.map((t) => (
            <button key={t.label} className={route.name === t.route.name ? 'on' : ''} onClick={() => switchTab(t.route)} aria-label={t.label}>
              <Icon name={t.icon} size={22} />
              <small>{t.label}</small>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function StaffGate() {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  return (
    <div className="app">
      <div className="screen gate">
        <div className="brand-mark">RIZZ<span>.</span></div>
        <h2>Staff console</h2>
        <p className="muted small">Enter the staff PIN to receive orders and manage bookings.</p>
        <form className="stack" onSubmit={(e) => {
          e.preventDefault();
          if (!actions.unlockStaff(pin)) setErr(true);
        }}>
          <input className={err ? 'invalid' : ''} autoFocus type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={(e) => { setPin(e.target.value); setErr(false); }} />
          {err && <p className="error">Wrong PIN</p>}
          <button className="btn btn-primary btn-block" type="submit">Unlock</button>
        </form>
      </div>
    </div>
  );
}
