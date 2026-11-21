import type { Nav } from '../router';
import { actions, showToast, useStore } from '../store/store';
import { Empty, TopBar } from '../components/Layout';
import { money } from '../config';

export function Rewards({ nav }: { nav: Nav }) {
  const me = useStore((s) => s.me);
  const settings = useStore((s) => s.settings);
  const applied = useStore((s) => s.appliedCode);
  const vouchers = useStore((s) => s.vouchers);
  const pts = me?.points ?? 0;
  const t = settings.rewardThreshold || 100;
  const perPoint = money(Math.round(1 / (settings.pointsPerUnit || 0.01)));
  const ready = vouchers.filter((v) => v.active && v.redemptions.length === 0 && (!v.expiresAt || v.expiresAt > Date.now()));
  const used = vouchers.filter((v) => v.redemptions.length > 0);

  const use = (code: string) => {
    actions.applyCode(code);
    showToast(`🎟️ ${code} will be applied at checkout.`);
    nav.go({ name: 'menu' });
  };

  return (
    <div className="screen">
      <TopBar title="Rizz Rewards" onBack={nav.back} />

      <div className="loyalty big">
        <small>Your points</small>
        <strong>{pts}</strong>
        <div className="loyalty-bar"><span style={{ width: `${((pts % t) / t) * 100}%` }} /></div>
        <span className="tiny">{t - (pts % t)} pts until your next {money(settings.rewardValue)} reward code</span>
      </div>

      <div className="stats-grid">
        <div><strong>{me?.orders ?? 0}</strong><small>App orders</small></div>
        <div><strong>{money(me?.spent ?? 0)}</strong><small>Spent via app</small></div>
        <div><strong>{me?.redeemed ?? 0}</strong><small>Codes used</small></div>
        <div><strong>{me?.posts ?? 0}</strong><small>Moments</small></div>
      </div>

      <h3>Your codes</h3>
      {applied && <p className="small">Applied to your next order: <span className="code-chip">{applied}</span> <button className="link small" onClick={() => actions.applyCode(null)}>Remove</button></p>}
      {ready.length === 0 ? (
        <Empty emoji="🎟️" title="No codes yet" text={`Order through the app — every ${perPoint} spent earns 1 pt. Hit ${t} pts and a reward code lands here automatically.`} />
      ) : (
        <div className="list">
          {ready.map((v) => (
            <div key={v.id} className="voucher">
              <div className="voucher-value">{v.kind === 'percent' ? `${v.value}%` : money(v.value)}<small>OFF</small></div>
              <div className="row-body">
                <strong className="code-chip">{v.code}</strong>
                <span className="small muted">{v.description}</span>
                {v.minSpend > 0 && <span className="tiny muted">Min spend {money(v.minSpend)}</span>}
                {v.expiresAt && <span className="tiny muted">Expires {new Date(v.expiresAt).toLocaleDateString()}</span>}
              </div>
              <button className="btn btn-lime sm" onClick={() => use(v.code)}>{applied === v.code ? 'Applied' : 'Use'}</button>
            </div>
          ))}
        </div>
      )}

      <div className="card stack">
        <h3>How it works</h3>
        <p className="small muted">1. Order drinks & food in the app — we track every purchase to your account.</p>
        <p className="small muted">2. Earn 1 point for every {perPoint} spent on served orders and paid tickets.</p>
        <p className="small muted">3. Every {t} points unlocks a {money(settings.rewardValue)} code, ready to use on your next order.</p>
        <p className="small muted">4. Watch the offers on the home screen and the bar's TVs for promo codes like <b>WELCOME10</b>.</p>
      </div>

      {used.length > 0 && (
        <div className="card">
          <h3>Used codes</h3>
          {used.map((v) => <div key={v.id} className="line-mini"><span>{v.code}</span><span className="muted">{new Date(v.redemptions[0].at).toLocaleDateString()}</span></div>)}
        </div>
      )}
    </div>
  );
}
