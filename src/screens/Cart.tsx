import { useState } from 'react';
import type { Nav } from '../router';
import type { FulfilmentType } from '../types';
import { getItem } from '../data/menu';
import { actions, cartSubtotal, useStore } from '../store/store';
import { Art } from '../components/Art';
import { Empty, Stepper, TopBar } from '../components/Layout';
import { BAR, money } from '../config';

const TIPS = [0, 0.1, 0.15, 0.2];

export function Cart({ nav }: { nav: Nav }) {
  const cart = useStore((s) => s.cart);
  const [fulfilment, setFulfilment] = useState<FulfilmentType>('table');
  const [table, setTable] = useState('');
  const [notes, setNotes] = useState('');
  const [tipRate, setTipRate] = useState(0.1);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const subtotal = cartSubtotal(cart);
  const fee = +(subtotal * BAR.serviceFeeRate).toFixed(2);
  const tip = +(subtotal * tipRate).toFixed(2);
  const total = subtotal + fee + tip;

  if (cart.length === 0) {
    return (
      <div className="screen">
        <TopBar title="Your order" onBack={nav.back} />
        <Empty emoji="🧊" title="Your glass is empty" text="Add a few drinks or bites to get the night started."
          action={<button className="btn btn-primary" onClick={() => nav.go({ name: 'menu' })}>Browse menu</button>} />
      </div>
    );
  }

  const place = async () => {
    if (fulfilment === 'table' && !table.trim()) return setErr('Enter your table or seat number so we can find you.');
    setBusy(true); setErr('');
    try {
      const order = await actions.placeOrder({ fulfilment, table: fulfilment === 'table' ? table.trim() : undefined, notes: notes.trim() || undefined, tip });
      nav.go({ name: 'order', id: order.id });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen with-cta">
      <TopBar title="Your order" onBack={nav.back} right={<button className="link" onClick={actions.clearCart}>Clear</button>} />
      <div className="list">
        {cart.map((l) => {
          const item = getItem(l.itemId);
          return (
            <div key={l.key} className="cart-line">
              {item && <Art emoji={item.emoji} gradient={item.gradient} size="sm" />}
              <div className="row-body">
                <strong>{l.name}</strong>
                {l.choices.length > 0 && <span className="tiny muted">{l.choices.join(' · ')}</span>}
                {l.note && <span className="tiny muted">“{l.note}”</span>}
                <span className="price">{money(l.unitPrice * l.qty)}</span>
              </div>
              <Stepper value={l.qty} onChange={(n) => actions.setQty(l.key, n)} />
            </div>
          );
        })}
        <button className="btn btn-ghost" onClick={() => nav.go({ name: 'menu' })}>+ Add more items</button>
      </div>

      <div className="card stack">
        <h3>How should we serve you?</h3>
        <div className="seg">
          <button className={fulfilment === 'table' ? 'on' : ''} onClick={() => setFulfilment('table')}>🪑 To my table</button>
          <button className={fulfilment === 'pickup' ? 'on' : ''} onClick={() => setFulfilment('pickup')}>🛎️ Pickup at bar</button>
        </div>
        {fulfilment === 'table' && (
          <label className="field"><span>Table / seat number</span>
            <input value={table} onChange={(e) => { setTable(e.target.value); setErr(''); }} placeholder="e.g. 12 or Bar 3" />
          </label>
        )}
        <label className="field"><span>Notes for the bar (optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bring everything together, please" />
        </label>
      </div>

      <div className="card stack">
        <h3>Tip the team</h3>
        <div className="seg">
          {TIPS.map((t) => <button key={t} className={tipRate === t ? 'on' : ''} onClick={() => setTipRate(t)}>{t === 0 ? 'None' : `${t * 100}%`}</button>)}
        </div>
      </div>

      <div className="card summary">
        <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div><span>Service ({BAR.serviceFeeRate * 100}%)</span><span>{money(fee)}</span></div>
        <div><span>Tip</span><span>{money(tip)}</span></div>
        <div className="summary-total"><span>Total</span><span>{money(total)}</span></div>
        <p className="tiny muted">Pay at the bar or with your server. Card & mobile money accepted.</p>
      </div>

      {err && <p className="error">{err}</p>}
      <div className="sticky-cta">
        <button className="btn btn-primary grow" onClick={place} disabled={busy}>{busy ? 'Sending to the bar…' : <>Place order · {money(total)}</>}</button>
      </div>
    </div>
  );
}
