import { useState } from 'react';
import type { Nav } from '../router';
import type { WalletTx } from '../types';
import { actions, useStore } from '../store/store';
import { TopBar, Empty } from '../components/Layout';
import { MpesaPay, isValidKePhone } from '../components/MpesaPay';
import { CountUp } from '../components/CountUp';
import { money, useBar } from '../config';

const AMOUNTS = [500, 1000, 2000, 5000, 10000];
const TX_LABEL: Record<WalletTx['type'], string> = {
  topup: 'M-Pesa top-up', cash: 'Cash top-up', bonus: 'Top-up bonus', payment: 'Payment', refund: 'Refund', adjust: 'Adjustment',
};
const TX_ICON: Record<WalletTx['type'], string> = { topup: '📲', cash: '💵', bonus: '🎁', payment: '🍸', refund: '↩️', adjust: '🛠️' };

export function Wallet({ nav }: { nav: Nav }) {
  const user = useStore((s) => s.user);
  const wallet = useStore((s) => s.wallet);
  const settings = useStore((s) => s.settings);
  const bar = useBar();
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [topupId, setTopupId] = useState<string | null>(null);

  const balance = wallet?.balance ?? 0;
  const value = custom ? Math.round(+custom || 0) : amount;
  const pct = settings.walletBonusPercent ?? 0;
  const bonusMin = settings.walletBonusMin ?? 0;
  const bonus = pct > 0 && value >= bonusMin ? Math.round(value * pct / 100) : 0;
  const active = wallet?.topups.find((t) => t.id === topupId);

  const topUp = async () => {
    if (value < 50) return setErr('Minimum top-up is KSh 50.');
    if (!isValidKePhone(phone)) return setErr('Enter your M-Pesa number, e.g. 0712 345 678.');
    setBusy(true); setErr('');
    try { const t = await actions.topUp(value, phone); setTopupId(t.id); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="screen">
      <TopBar title="Rizz Wallet" onBack={nav.back} />

      <div className="wallet-card">
        <div className="wallet-card-top"><span>{bar.name.toUpperCase()} WALLET</span><span className="wallet-chip" /></div>
        <small>Available balance</small>
        <strong className="wallet-balance"><CountUp value={balance} format={(n) => money(Math.round(n))} /></strong>
        <div className="wallet-card-foot"><span>{user?.name}</span><span>Pay at the bar in one tap</span></div>
      </div>

      {pct > 0 && <div className="wallet-bonus">🎁 Top up {money(bonusMin)} or more and get <b>{pct}% extra</b> free!</div>}

      {active && active.payment?.status !== 'unpaid' ? (
        <div className="stack">
          <MpesaPay kind="topup" refId={active.id} amount={active.amount} payment={active.payment} title="Top up wallet" />
          {active.payment?.status === 'paid' && (
            <p className="small center">+{money(active.amount)}{active.bonus ? <> and a <b>{money(active.bonus)}</b> bonus</> : null} added to your wallet 🎉</p>
          )}
          {(active.payment?.status === 'paid' || active.payment?.status === 'failed') && <button className="btn btn-ghost" onClick={() => setTopupId(null)}>Top up again</button>}
        </div>
      ) : (
        <div className="card stack">
          <h3>Load money</h3>
          <div className="amount-grid">
            {AMOUNTS.map((a) => (
              <button key={a} className={`amount ${!custom && amount === a ? 'on' : ''}`} onClick={() => { setAmount(a); setCustom(''); }}>{money(a)}</button>
            ))}
            <input className={`amount ${custom ? 'on' : ''}`} inputMode="numeric" placeholder="Other" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} />
          </div>
          <label className="field"><span>M-Pesa number</span><input inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setErr(''); }} placeholder="0712 345 678" /></label>
          {err && <p className="error">{err}</p>}
          <button className="btn btn-mpesa btn-block" onClick={topUp} disabled={busy || value < 50}>
            {busy ? 'Sending prompt…' : <>Top up {money(value)}{bonus ? ` (+${money(bonus)} bonus)` : ''} with M-Pesa</>}
          </button>
          <p className="tiny muted">You can also top up with cash at the bar — staff add it to your wallet instantly.</p>
        </div>
      )}

      <h3>Activity</h3>
      {!wallet?.tx.length ? <Empty emoji="👛" title="No activity yet" text="Top up once, then pay for drinks, food and event tickets in a single tap." /> : (
        <div className="list">
          {wallet.tx.map((t) => (
            <div key={t.id} className="tx-row">
              <span className="tx-icon">{TX_ICON[t.type]}</span>
              <div className="row-body">
                <strong>{t.note || TX_LABEL[t.type]}</strong>
                <span className="tiny muted">{new Date(t.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}{t.ref ? ` · ${t.ref}` : ''}</span>
              </div>
              <div className="tx-amount">
                <b className={t.amount >= 0 ? 'plus' : 'minus'}>{t.amount >= 0 ? '+' : '−'}{money(Math.abs(t.amount))}</b>
                <small className="muted">{money(t.balanceAfter)}</small>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="tiny muted center">Your wallet is linked to this phone's Rizz account. Changing phones? Ask staff to move your balance.</p>
    </div>
  );
}

/** Compact balance pill used in headers / checkout. */
export function WalletPill({ onClick }: { onClick: () => void }) {
  const balance = useStore((s) => s.wallet?.balance ?? 0);
  return (
    <button className="wallet-pill" onClick={onClick} aria-label="Rizz Wallet">
      <span>👛</span><CountUp value={balance} format={(n) => money(Math.round(n))} duration={600} />
    </button>
  );
}

/** "Pay from wallet" button for an unpaid order or ticket purchase. */
export function PayFromWallet({ kind, refId, amount, onTopUp }: { kind: 'order' | 'ticket'; refId: string; amount: number; onTopUp: () => void }) {
  const balance = useStore((s) => s.wallet?.balance ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const need = Math.ceil(amount);
  if (balance <= 0) return null;
  const enough = balance >= need;
  return (
    <div className={`wallet-pay ${enough ? 'ok' : 'low'}`}>
      <div className="row-body">
        <strong>👛 Rizz Wallet · {money(balance)}</strong>
        <span className="tiny">{enough ? `Pay ${money(need)} instantly` : `Top up ${money(need - balance)} more to pay from your wallet`}</span>
        {err && <span className="tiny error">{err}</span>}
      </div>
      {enough
        ? <button className="btn btn-primary sm" disabled={busy} onClick={async () => { setBusy(true); setErr(''); try { await actions.payWithWallet(kind, refId); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } }}>{busy ? 'Paying…' : 'Pay now'}</button>
        : <button className="btn btn-ghost sm" onClick={onTopUp}>Top up</button>}
    </div>
  );
}
