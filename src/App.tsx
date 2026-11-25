import { useCallback, useEffect, useRef, useState } from 'react';
import { initFx } from './fx';
import { setRouteBackHandler } from './native';
import type { Nav, Route } from './router';
import { actions, connect, useStore } from './store/store';
import { getServerUrl, isDetachedClient } from './api';
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
import { Social } from './screens/Social';
import { Rewards } from './screens/Rewards';
import { TV } from './screens/TV';
import { Events } from './screens/Events';
import { EventDetail } from './screens/EventDetail';
import { MyTickets } from './screens/MyTickets';
import { Wallet } from './screens/Wallet';
import { LiveAlerts } from './components/LiveAlerts';

const TABS: { route: Route; icon: string; label: string }[] = [
  { route: { name: 'home' }, icon: 'home', label: 'Home' },
  { route: { name: 'menu' }, icon: 'menu', label: 'Menu' },
  { route: { name: 'events' }, icon: 'ticket', label: 'Events' },
  { route: { name: 'book' }, icon: 'calendar', label: 'Book' },
  { route: { name: 'social' }, icon: 'camera', label: 'Moments' },
];

const initialRoute = (): Route => (location.hash === '#tv' ? { name: 'tv' } : { name: 'home' });

export default function App() {
  const user = useStore((s) => s.user);
  const online = useStore((s) => s.online);
  const loaded = useStore((s) => s.loaded);
  const toast = useStore((s) => s.toast);
  const staffToken = useStore((s) => s.staffToken);

  useEffect(() => { connect(); initFx(); }, []);
  // Direction of the last navigation, for page transitions
  const dir = useRef<'push' | 'pop' | 'tab'>('tab');
  const [stack, setStack] = useState<Route[]>(() => [initialRoute()]);
  const route = stack[stack.length - 1];

  // Integrate with the browser/phone back button.
  useEffect(() => {
    const onPop = () => { dir.current = 'pop'; setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((r: Route) => {
    history.pushState(null, '');
    dir.current = 'push';
    setStack((s) => [...s, r]);
  }, []);
  // Bottom-nav tabs replace the stack instead of piling up history.
  const switchTab = (r: Route) => {
    if (r.name !== 'home' && stack.length === 1) history.pushState(null, '');
    dir.current = 'tab';
    setStack(r.name === 'home' ? [r] : [{ name: 'home' }, r]);
  };
  const back = useCallback(() => history.back(), []);
  // Phone back button: previous screen → home tab → (double press) exit
  useEffect(() => {
    setRouteBackHandler(() => {
      if (stack.length > 1) {
        dir.current = 'pop';
        setStack((s) => s.slice(0, -1)); // step back one screen
        return true;
      }
      if (route.name !== 'home') { dir.current = 'tab'; setStack([{ name: 'home' }]); return true; }
      return false;
    });
    return () => setRouteBackHandler(null);
  }, [stack, route.name]);
  const nav: Nav = { go, back };

  useEffect(() => { window.scrollTo(0, 0); }, [route]);

  if (route.name === 'tv') return <TV />;
  const previewPill = staffToken && <button className="preview-pill" onClick={() => actions.setMode('admin')}>👀 Guest preview · <b>Back to admin</b></button>;
  if (!user) return <div className="app">{previewPill}<Welcome /></div>;

  const showNav = ['home', 'menu', 'events', 'book', 'social', 'profile'].includes(route.name);
  const tabIdx = TABS.findIndex((t) => t.route.name === route.name);
  const pageKey = `${stack.length}-${route.name}-${'id' in route ? route.id : ''}-${'category' in route ? route.category ?? '' : ''}`;

  return (
    <div className="app">
      {!online && <OfflineBar loaded={loaded} onSetup={() => go({ name: 'profile' })} />}
      {toast && <div className="toast">{toast}</div>}
      <LiveAlerts />
      {previewPill}
      <main className={showNav ? 'has-nav' : ''}>
        <div key={pageKey} className={`page page-${dir.current}`}>
        {route.name === 'home' && <Home nav={nav} />}
        {route.name === 'menu' && <Menu key={route.category ?? 'all'} nav={nav} initial={route.category} />}
        {route.name === 'item' && <ItemDetail key={route.id} nav={nav} id={route.id} />}
        {route.name === 'cart' && <Cart nav={nav} />}
        {route.name === 'order' && <OrderTracking nav={nav} id={route.id} />}
        {route.name === 'book' && <Book key={route.spaceId ?? 'any'} nav={nav} spaceId={route.spaceId} />}
        {route.name === 'booking' && <BookingDetail nav={nav} id={route.id} />}
        {route.name === 'activity' && <Activity key={route.tab ?? 'o'} nav={nav} tab={route.tab} />}
        {route.name === 'profile' && <Profile nav={nav} />}
        {route.name === 'social' && <Social nav={nav} />}
        {route.name === 'rewards' && <Rewards nav={nav} />}
        {route.name === 'events' && <Events nav={nav} />}
        {route.name === 'event' && <EventDetail key={route.id} nav={nav} id={route.id} />}
        {route.name === 'tickets' && <MyTickets nav={nav} />}
        {route.name === 'wallet' && <Wallet nav={nav} />}
        </div>
      </main>
      {showNav && (
        <nav className="bottom-nav" style={{ ['--tab' as string]: tabIdx }}>
          {tabIdx >= 0 && <span className="nav-pill" aria-hidden />}
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

function OfflineBar({ loaded, onSetup }: { loaded: boolean; onSetup?: () => void }) {
  // Installed app with no server address yet: everything is browsable from the built-in copy
  if (!getServerUrl() && isDetachedClient()) {
    return <button className="offline-bar" onClick={onSetup}>Browsing offline · tap to add the bar's server so you can order</button>;
  }
  return <div className="offline-bar">{loaded ? 'Reconnecting to the bar…' : 'Connecting to the bar…'}</div>;
}
