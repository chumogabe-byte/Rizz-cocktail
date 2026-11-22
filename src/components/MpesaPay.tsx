import { useEffect, useRef, useState } from 'react';
import { confetti } from '../fx';
import type { Payment } from '../types';
import { actions, useStore } from '../store/store';
import { BAR, money } from '../config';

export const isValidKePhone = (p: string) => /^(?:\+?254|0)?[17]\d{8}$/.test(p.replace(/[\s-]/g, ''));

/**
 * M-Pesa Express payment card for an order or ticket purchase.
 * Shows a phone form → "check your phone" while the PIN prompt is open → receipt when paid.
 * State comes from the live `payment` on the order/ticket, so it updates the moment Safaricom confirms.
 */
export function MpesaPay({ kind, refId, amount, payment, title = 'Pay with M-Pesa', onPaid }: {
  kind: 'order' | 'ticket' | 'topup'; refId: string; amount: number; payment?: Payment; title?: string; onPaid?: () => void;
}) {
  const user = useStore((s) => s.user);
  const mode = useStore((s) => s.mpesa?.mode);
  const till = useStore((s) => s.mpesa?.till) || BAR.mpesaTill;
  const [phone, setPhone] = useState(payment?.phone ? '0' + payment.phone.slice(3) : user?.phone || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const status = payment?.status ?? 'unpaid';

  // Poll while waiting — covers servers that can't receive Safaricom's callback (e.g. on the bar's Wi-Fi)
  useEffect(() => {
    if (status !== 'pending' || !payment?.paymentId) return;
    const id = payment.paymentId;
    const t = setInterval(() => { actions.paymentStatus(id).catch(() => {}); }, 4000);
    return () => clearInterval(t);
  }, [status, payment?.paymentId]);
  const prev = useRef(status);
  useEffect(() => {
    if (status === 'paid' && prev.current === 'pending') { confetti({ emojis: ['💚', '✅', '🍸', '🥂'] }); onPaid?.(); }
    prev.current = status;
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (!isValidKePhone(phone)) return setErr('Enter your Safaricom number, e.g. 0712 345 678');
    setBusy(true); setErr('');
    try { await actions.payMpesa(kind, refId, phone); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  if (status === 'paid') {
    return (
      <div className="mpesa paid">
        <div className="mpesa-icon">✓</div>
        <div className="row-body">
          <strong>Paid {payment?.amount ? money(payment.amount) : ''}{payment?.method === 'mpesa' ? ' via M-Pesa' : payment?.method === 'wallet' ? ' from Rizz Wallet' : payment?.method === 'cash' ? ' at the bar' : ''}</strong>
          {payment?.receipt && <span className="small">Receipt <b className="code-chip">{payment.receipt}</b></span>}
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="mpesa pending">
        <div className="mpesa-spinner" />
        <div className="row-body">
          <strong>Check your phone 📲</strong>
          <span className="small">Enter your M-Pesa PIN to pay {money(Math.ceil(amount))} to <b>Rizz · Till {till}</b>.</span>
          <span className="tiny muted">Sent to {payment?.phone ? '0' + payment.phone.slice(3) : phone}. This updates automatically.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mpesa">
      <div className="mpesa-head">
        <span className="mpesa-logo">M-PESA</span>
        <strong>{title}</strong>
        <span className="price">{money(Math.ceil(amount))}</span>
      </div>
      <div className="till-line">Buy Goods · Till No. <b>{till}</b></div>
      {status === 'failed' && <p className="error">{payment?.message || 'Payment failed.'} Try again below.</p>}
      <div className="row-gap">
        <input className="grow" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErr(''); }} placeholder="0712 345 678" />
        <button className="btn btn-mpesa" onClick={send} disabled={busy}>{busy ? 'Sending…' : status === 'failed' ? 'Retry' : 'Pay now'}</button>
      </div>
      {err && <p className="error">{err}</p>}
      <p className="tiny muted">You'll get an M-Pesa prompt on this phone — enter your PIN to confirm. Prefer to pay manually? Use Lipa na M-Pesa → Buy Goods → Till {till} and show the staff your confirmation SMS.{mode === 'mock' ? ' (Test mode: no real money moves. Numbers ending 000 simulate a failed payment.)' : ''}</p>
    </div>
  );
}

/** Small status pill for staff screens. */
export function PayBadge({ payment, total }: { payment?: Payment; total: number }) {
  if (!payment || total <= 0) return null;
  if (payment.status === 'paid') return <span className="pay-badge paid">{payment.method === 'mpesa' ? `M-Pesa ✓ ${payment.receipt ?? ''}` : payment.method === 'wallet' ? 'Wallet ✓' : payment.method === 'free' ? 'Free' : 'Paid (cash) ✓'}</span>;
  if (payment.status === 'refunded') return <span className="pay-badge unpaid">Refunded to wallet</span>;
  if (payment.status === 'pending') return <span className="pay-badge pending">⏳ M-Pesa prompt sent</span>;
  if (payment.status === 'failed') return <span className="pay-badge failed">M-Pesa failed</span>;
  return <span className="pay-badge unpaid">{payment.method === 'mpesa' ? 'M-Pesa (not yet paid)' : 'Pay at bar'}</span>;
}
