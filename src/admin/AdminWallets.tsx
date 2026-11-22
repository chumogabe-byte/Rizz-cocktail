import { useEffect, useState } from 'react';
import { actions, run, showToast, useStore } from '../store/store';
import { money } from '../config';
import { timeAgo } from '../screens/Social';

type Data = Awaited<ReturnType<typeof actions.fetchWallets>>;

export function WalletsPanel() {
  const role = useStore((s) => s.staffRole);
  const rev = useStore((s) => s.walletRev);
  const settings = useStore((s) => s.settings);
  const [data, setData] = useState<Data | null>(null);
  const [q, setQ] = useState('');
  const [act, setAct] = useState<{ customerId: string; name: string; type: 'cash' | 'adjust' } | null>(null);
  const [bonus, setBonus] = useState({ walletBonusPercent: settings.walletBonusPercent ?? 0, walletBonusMin: settings.walletBonusMin ?? 0 });
  useEffect(() => setBonus({ walletBonusPercent: settings.walletBonusPercent ?? 0, walletBonusMin: settings.walletBonusMin ?? 0 }), [settings.walletBonusPercent, settings.walletBonusMin]);

  const load = () => actions.fetchWallets().then(setData).catch((e) => showToast((e as Error).message));
  useEffect(() => { load(); }, [rev]); // live refresh whenever any wallet changes

  const rows = (data?.rows ?? []).filter((r) => `${r.name} ${r.phone ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const t = data?.totals;

  return (
    <div className="stack">
      <div className="overview">
        <div className="kpi"><small>Held in wallets</small><strong>{money(t?.balance ?? 0)}</strong></div>
        <div className="kpi"><small>Total top-ups</small><strong>{money(t?.topups ?? 0)}</strong></div>
        <div className="kpi"><small>Spent from wallets</small><strong>{money(t?.spent ?? 0)}</strong></div>
        <div className="kpi"><small>Bonuses given</small><strong>{money(t?.bonus ?? 0)}</strong></div>
      </div>

      {role === 'admin' && (
        <form className="card row-gap wrap" onSubmit={(e) => { e.preventDefault(); run(actions.saveSettings(bonus).then(() => showToast('✅ Top-up bonus saved'))); }}>
          <strong>🎁 Top-up bonus</strong>
          <input type="number" min={0} max={50} value={bonus.walletBonusPercent} onChange={(e) => setBonus({ ...bonus, walletBonusPercent: +e.target.value })} style={{ maxWidth: 90 }} />
          <span className="small">% extra on top-ups of at least</span>
          <input type="number" min={0} step={500} value={bonus.walletBonusMin} onChange={(e) => setBonus({ ...bonus, walletBonusMin: +e.target.value })} style={{ maxWidth: 130 }} />
          <button className="btn btn-primary sm" type="submit">Save</button>
          <span className="tiny muted" style={{ flexBasis: '100%' }}>Guests see the offer on their wallet screen. Set 0% to switch it off. Applies to M-Pesa and cash top-ups.</span>
        </form>
      )}

      <div className="row-gap">
        <input className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a guest by name or phone…" />
        <button className="btn btn-ghost sm" onClick={load}>Refresh</button>
      </div>

      <div className="card">
        <div className="table wallets">
          <div className="tr th"><span>Guest</span><span>Balance</span><span>Last activity</span><span /></div>
          {rows.slice(0, 100).map((r) => (
            <div key={r.customerId} className="tr">
              <span><b>{r.name}</b><br /><span className="tiny muted">{r.phone || '—'}</span></span>
              <span className={r.balance > 0 ? 'price' : 'muted'}>{money(r.balance)}</span>
              <span className="tiny">{r.updatedAt ? timeAgo(r.updatedAt) : '—'}</span>
              <span className="row-gap wrap">
                <button className="btn btn-lime sm" onClick={() => setAct({ customerId: r.customerId, name: r.name, type: 'cash' })}>+ Cash top-up</button>
                {role === 'admin' && <button className="btn btn-ghost sm" onClick={() => setAct({ customerId: r.customerId, name: r.name, type: 'adjust' })}>Adjust</button>}
              </span>
            </div>
          ))}
          {data && rows.length === 0 && <p className="muted pad">No guests found.</p>}
        </div>
      </div>

      <div className="card">
        <h3>Recent wallet activity</h3>
        {(data?.recent ?? []).slice(0, 25).map((x) => (
          <div key={x.id} className="line-mini">
            <span><b>{x.name}</b> · {x.note || x.type}{x.ref ? <span className="tiny muted"> · {x.ref}</span> : null}</span>
            <span><b className={x.amount >= 0 ? 'plus' : 'minus'}>{x.amount >= 0 ? '+' : '−'}{money(Math.abs(x.amount))}</b> <span className="tiny muted">{timeAgo(x.at)}</span></span>
          </div>
        ))}
        {!data?.recent.length && <p className="tiny muted">No wallet activity yet.</p>}
      </div>

      {act && <AdjustSheet {...act} onClose={() => setAct(null)} onDone={load} />}
    </div>
  );
}

function AdjustSheet({ customerId, name, type, onClose, onDone }: { customerId: string; name: string; type: 'cash' | 'adjust'; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Math.round(+amount);
    if (!n) return showToast('Enter an amount');
    setBusy(true);
    try {
      await actions.adjustWallet(customerId, n, type, note || undefined);
      showToast(type === 'cash' ? `✅ ${money(n)} added to ${name}'s wallet` : `✅ ${name}'s wallet adjusted by ${money(n)}`);
      onDone(); onClose();
    } catch (x) { showToast((x as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{type === 'cash' ? `Cash top-up for ${name}` : `Adjust ${name}'s wallet`}</h3>
        <p className="tiny muted">{type === 'cash' ? 'Take the cash first, then add it here — the guest sees it instantly.' : 'Use a negative amount to deduct (e.g. moving a balance to a new phone). Every change is logged.'}</p>
        <label className="field"><span>Amount (KSh){type === 'adjust' ? ' — negative to deduct' : ''}</span>
          <input autoFocus inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(type === 'cash' ? /[^\d]/g : /[^\d-]/g, ''))} placeholder="1000" />
        </label>
        <label className="field"><span>Note (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={type === 'cash' ? 'Cash at bar' : 'Moved from old phone'} /></label>
        <div className="row-gap">
          <button type="button" className="btn btn-ghost grow" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary grow" disabled={busy}>{busy ? 'Saving…' : type === 'cash' ? 'Add cash' : 'Apply'}</button>
        </div>
      </form>
    </div>
  );
}
