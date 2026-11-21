import { useEffect, useRef, useState } from 'react';
import { confetti } from '../fx';
import type { Nav } from '../router';
import type { OrderStatus } from '../types';
import { actions, run, useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { Chip, TopBar } from '../components/Layout';
import { money, seatLabel } from '../config';
import { MpesaPay } from '../components/MpesaPay';

const STEPS: { s: OrderStatus; label: string; emoji: string }[] = [
  { s: 'new', label: 'Received', emoji: '🧾' },
  { s: 'preparing', label: 'Mixing', emoji: '🍸' },
  { s: 'ready', label: 'Ready', emoji: '🛎️' },
  { s: 'served', label: 'Served', emoji: '🥂' },
];

const FACES = ['😞', '🙁', '😐', '🙂', '😃', '🥰'];
const LIKES = ['Delicious drinks', 'Fast service', 'Friendly staff', 'Great music', 'Good value', 'Great energy'];

export function OrderTracking({ nav, id }: { nav: Nav; id: string }) {
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  const [face, setFace] = useState<number | null>(null);
  const [likes, setLikes] = useState<string[]>([]);
  const prevStatus = useRef(order?.status);
  useEffect(() => {
    if (order && prevStatus.current && prevStatus.current !== order.status && (order.status === 'served' || order.status === 'ready'))
      confetti({ count: order.status === 'served' ? 80 : 40, emojis: order.status === 'served' ? ['🥂', '🍸', '🎉'] : ['🛎️', '✨'] });
    prevStatus.current = order?.status;
  }, [order?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!order) return null;

  const idx = STEPS.findIndex((x) => x.s === order.status);
  const cancelled = order.status === 'cancelled';

  return (
    <div className="screen">
      <TopBar title={`Order ${order.code}`} onBack={() => nav.go({ name: 'home' })} />

      <div className={`track-hero ${cancelled ? 'is-cancelled' : ''}`}>
        <div className="track-emoji">{cancelled ? '❌' : STEPS[idx]?.emoji}</div>
        <h2>{cancelled ? 'Order cancelled' : order.status === 'ready' ? (order.fulfilment === 'pickup' ? 'Ready at the bar!' : 'On its way to you!') : order.status === 'served' ? 'Enjoy! Cheers 🥂' : order.status === 'preparing' ? 'Our bartenders are on it' : 'Order sent to the bar'}</h2>
        <p className="muted small">
          {order.fulfilment === 'table' ? <>{seatLabel(order.table)}</> : <>Pickup at the bar · show code <strong>{order.code}</strong></>}
        </p>
        {!cancelled && (
          <div className="steps">
            {STEPS.map((st, i) => (
              <div key={st.s} className={`step ${i <= idx ? 'done' : ''} ${i === idx ? 'current' : ''}`}>
                <span className="dot">{i < idx ? <Icon name="check" size={14} /> : i + 1}</span>
                <small>{st.label}</small>
              </div>
            ))}
          </div>
        )}
        <p className="tiny muted">Updates live as the bar works on your order.</p>
      </div>

      <div className="card">
        {order.lines.map((l) => (
          <div key={l.key} className="line-mini">
            <span><b>{l.qty}×</b> {l.name}{l.choices.length > 0 && <span className="tiny muted"> · {l.choices.join(', ')}</span>}</span>
            <span>{money(l.unitPrice * l.qty)}</span>
          </div>
        ))}
        <div className="summary">
          {!!order.discount && <div className="discount"><span>Discount ({order.voucherCode})</span><span>−{money(order.discount)}</span></div>}
          <div><span>Service</span><span>{money(order.serviceFee)}</span></div>
          <div><span>Tip</span><span>{money(order.tip)}</span></div>
          <div className="summary-total"><span>Total</span><span>{money(order.total)}</span></div>
        </div>
      </div>

      {order.status !== 'cancelled' && order.payment && (order.payment.method === 'mpesa' || order.payment.status === 'paid'
        ? <MpesaPay kind="order" refId={order.id} amount={order.total} payment={order.payment} title="Pay for this order" />
        : (
          <details className="card">
            <summary className="small">💵 Paying at the bar — or tap to <b>pay now with M-Pesa</b></summary>
            <div style={{ marginTop: 12 }}><MpesaPay kind="order" refId={order.id} amount={order.total} payment={order.payment} /></div>
          </details>
        ))}

      {order.status === 'new' && !['paid', 'pending'].includes(order.payment?.status ?? '') && (
        <button className="btn btn-ghost btn-block danger" onClick={() => run(actions.setOrderStatus(order.id, 'cancelled'))}>Cancel order</button>
      )}

      {order.status === 'served' && (
        <div className="card stack">
          {order.rating != null ? (
            <p className="center">Thanks for the feedback {FACES[order.rating]} — see you next round!</p>
          ) : (
            <>
              <h3>How was your experience?</h3>
              <div className="faces">
                {FACES.map((f, i) => <button key={i} className={face === i ? 'on' : ''} onClick={() => setFace(i)}>{f}</button>)}
              </div>
              <h3>What did you enjoy the most?</h3>
              <div className="chips-wrap">
                {LIKES.map((l) => <Chip key={l} active={likes.includes(l)} onClick={() => setLikes(likes.includes(l) ? likes.filter((x) => x !== l) : [...likes, l])}>{l}</Chip>)}
              </div>
              <button className="btn btn-primary btn-block" disabled={face == null} onClick={() => face != null && run(actions.rateOrder(order.id, face))}>Submit feedback</button>
            </>
          )}
        </div>
      )}

      <div className="row-gap">
        <button className="btn btn-ghost grow" onClick={() => { actions.reorder(order.id); nav.go({ name: 'cart' }); }}><Icon name="repeat" size={16} /> Order again</button>
        <button className="btn btn-ghost grow" onClick={() => nav.go({ name: 'menu' })}>Add more</button>
      </div>
    </div>
  );
}
