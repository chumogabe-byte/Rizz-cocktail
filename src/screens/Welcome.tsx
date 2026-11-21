import { useState } from 'react';
import { actions } from '../store/store';
import { BAR } from '../config';

export function Welcome() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'splash' | 'form'>('splash');

  return (
    <div className="welcome">
      <div className="welcome-mosaic" aria-hidden>
        {['🍸', '🥃', '🍹', '🍾', '🍋', '🎶'].map((e, i) => (
          <div key={i} className={`mosaic-tile t${i}`}><span>{e}</span></div>
        ))}
      </div>
      <div className="welcome-body">
        <div className="brand-mark">RIZZ<span>.</span></div>
        {step === 'splash' ? (
          <>
            <h1 className="welcome-title">Sip, Snack &<br />Book Your <span className="accent">Spot.</span></h1>
            <p className="muted">Order cocktails and bites straight to your table, or reserve the best seats in the house.</p>
            <button className="btn btn-primary btn-block" onClick={() => setStep('form')}>Get Started</button>
            <p className="tiny muted center">{BAR.tagline} · {BAR.hours}</p>
          </>
        ) : (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); if (name.trim()) actions.login({ name: name.trim(), phone: phone.trim() }); }}>
            <h2>Welcome in 👋</h2>
            <label className="field"><span>Your name</span>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan" required />
            </label>
            <label className="field"><span>Phone (for order & booking updates)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" inputMode="tel" />
            </label>
            <button className="btn btn-primary btn-block" type="submit" disabled={!name.trim()}>Continue</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setStep('splash')}>Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
