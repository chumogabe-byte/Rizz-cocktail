import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useStore } from './store/store';
import './styles.css';

/**
 * One app, two logins:
 *  - Guests use the consumer app.
 *  - "Staff & admin login" (welcome screen / Profile, or /admin on the web) opens the management side.
 * VITE_APP=admin builds an admin-only app (optional "Rizz Admin" APK).
 */
const ADMIN_ONLY = import.meta.env.VITE_APP === 'admin';
const AdminApp = lazy(() => import('./admin/AdminApp'));

function Root() {
  const mode = useStore((s) => s.appMode);
  if (ADMIN_ONLY || mode === 'admin') return <Suspense fallback={null}><AdminApp adminOnly={ADMIN_ONLY} /></Suspense>;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
