import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { actions, connect, useStore } from '../store/store';
import { getServerUrl, mediaUrl, setServerUrl } from '../api';
import { useBar } from '../config';

export function Welcome() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'splash' | 'form'>('splash');
  // The installed phone app needs to know where the bar's server is (the web app is served by it, so it already knows).
  const needsServer = Capacitor.isNativePlatform() && !getServerUrl();
  const [server, setServer] = useState('');
  const bar = useBar();
  const welcome = useStore((s) => s.content?.welcome);
  const images = welcome?.images ?? [];
  const title = (welcome?.title || 'Sip, Snack & Book Your Spot.').trim();
  const lastSpace = title.lastIndexOf(' ');

  return (
    <div className="welcome">
      <div className="bubbles" aria-hidden>{Array.from({ length: 18 }, (_, i) => <span key={i} style={{ ['--i' as string]: i }} />)}</div>
      <div className="welcome-mosaic" aria-hidden>
        {['🍸', '🥃', '🍹', '🍾', '🍋', '🎶'].map((e, i) => (
          <div key={i} className={`mosaic-tile t${i}`} style={images[i] ? { background: `center/cover url("${mediaUrl(images[i])}")` } : undefined}>
            {!images[i] && <span>{e}</span>}
          </div>
        ))}
      </div>
      <div className="welcome-body">
        <div className="brand-mark">{bar.name.toUpperCase()}<span>.</span></div>
        {step === 'splash' ? (
          <>
            <h1 className="welcome-title">{lastSpace > 0 ? title.slice(0, lastSpace) + ' ' : ''}<span className="accent">{title.slice(lastSpace + 1)}</span></h1>
            <p className="muted">{welcome?.subtitle || 'Order cocktails and bites straight to your table, or reserve the best seats in the house.'}</p>
            <button className="btn btn-primary btn-block" onClick={() => setStep('form')}>Get Started</button>
            <p className="tiny muted center">{bar.tagline} · {bar.hours}</p>
          </>
        ) : (
          <form className="stack" onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || (needsServer && !server.trim())) return;
            if (needsServer) { setServerUrl(/^https?:\/\//.test(server.trim()) ? server : `http://${server.trim()}`); connect(); }
            actions.login({ name: name.trim(), phone: phone.trim() });
          }}>
            <h2>Welcome in 👋</h2>
            <label className="field"><span>Your name</span>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan" required />
            </label>
            <label className="field"><span>Phone (for order & booking updates)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" inputMode="tel" />
            </label>
            {needsServer && (
              <label className="field"><span>Bar server address (ask the staff)</span>
                <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="https://rizz.example.com or 192.168.1.20:3001" inputMode="url" autoCapitalize="off" required />
              </label>
            )}
            <button className="btn btn-primary btn-block" type="submit" disabled={!name.trim() || (needsServer && !server.trim())}>Continue</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setStep('splash')}>Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
