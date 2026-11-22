import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { actions, connect, useStore } from '../store/store';
import { getServerUrl, setServerUrl } from '../api';
import { useBar } from '../config';
import { initFx } from '../fx';
import { Staff } from '../screens/Staff';

/**
 * Rizz Admin — the management app (separate from the guest app).
 * Admin PIN → everything (prices, images, menu, settings…). Staff PIN → orders, bookings, check-in, moments.
 */
export default function AdminApp({ adminOnly = false }: { adminOnly?: boolean }) {
  const token = useStore((s) => s.staffToken);
  const online = useStore((s) => s.online);
  const loaded = useStore((s) => s.loaded);
  const toast = useStore((s) => s.toast);

  useEffect(() => { document.title = 'Rizz Admin'; connect(); initFx(); }, []);

  return (
    <>
      {!online && <div className="offline-bar">{loaded ? 'Reconnecting to the server…' : 'Connecting to the server…'}</div>}
      {toast && <div className="toast">{toast}</div>}
      {token
        ? <Staff onExit={() => { actions.lockStaff(); if (!adminOnly) actions.setMode('guest'); }} onPreview={adminOnly ? undefined : () => actions.setMode('guest')} />
        : <AdminLogin adminOnly={adminOnly} />}
    </>
  );
}

function AdminLogin({ adminOnly }: { adminOnly: boolean }) {
  const bar = useBar();
  const online = useStore((s) => s.online);
  const native = Capacitor.isNativePlatform();
  const [server, setServer] = useState(getServerUrl());
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const needsServer = native && !getServerUrl();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    if (native && server.trim() && server.trim() !== getServerUrl()) {
      setServerUrl(/^https?:\/\//.test(server.trim()) ? server.trim() : `https://${server.trim()}`);
      connect();
    }
    const ok = await actions.unlockStaff(pin);
    setBusy(false);
    if (!ok) setErr(online || !native ? 'Wrong PIN' : "Can't reach the server — check the address.");
  };

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="brand-mark">{bar.name.toUpperCase()}<span>.</span></div>
        <h1>Staff & admin login</h1>
        <p className="muted small">Manage orders, menu & prices, events, offers, images and settings.</p>
        <form className="stack" onSubmit={submit}>
          {(native) && (
            <label className="field"><span>Server address{needsServer ? '' : ' (change if needed)'}</span>
              <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="https://rizz-cocktail-bar.onrender.com" autoCapitalize="off" inputMode="url" required={needsServer} />
            </label>
          )}
          <label className="field"><span>PIN</span>
            <input className={err ? 'invalid' : ''} autoFocus type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value); setErr(''); }} placeholder="••••" />
          </label>
          {err && <p className="error">{err}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy || !pin}>{busy ? 'Checking…' : 'Log in'}</button>
          <p className="tiny muted center">Manager PIN = full access · Staff PIN = orders, bookings & check-in</p>
          {!adminOnly && <button type="button" className="btn btn-ghost btn-block" onClick={() => actions.setMode('guest')}>← Back to the guest app</button>}
        </form>
      </div>
    </div>
  );
}
