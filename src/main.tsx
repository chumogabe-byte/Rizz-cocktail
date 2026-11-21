import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

/**
 * Which app to run:
 *  - VITE_APP=consumer → guest app only (Rizz APK; admin code is not included)
 *  - VITE_APP=admin    → admin app only (Rizz Admin APK)
 *  - unset (web)       → guest app at "/", admin app at "/admin"
 */
const MODE = import.meta.env.VITE_APP as 'consumer' | 'admin' | undefined;
const AdminApp = MODE === 'consumer' ? null : lazy(() => import('./admin/AdminApp'));
const isAdmin = MODE === 'admin' || (MODE !== 'consumer' && (location.pathname.replace(/\/+$/, '').endsWith('/admin') || location.hash.startsWith('#staff') || location.hash.startsWith('#admin')));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdmin && AdminApp ? <Suspense fallback={null}><AdminApp /></Suspense> : <App />}
  </React.StrictMode>,
);
