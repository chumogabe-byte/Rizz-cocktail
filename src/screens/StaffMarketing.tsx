import { useEffect, useRef, useState } from 'react';
import type { Ad, CustomerStats, Placement } from '../types';
import { actions, run, showToast, useStore } from '../store/store';
import { mediaUrl } from '../api';
import { resizeImage } from '../image';
import { AD_THEMES, adBackground } from '../components/Promo';
import { CATEGORIES } from '../data/menu';
import { SPACES } from '../data/spaces';
import { money } from '../config';
import { timeAgo } from './Social';

// ======================= Promo codes & rewards =======================
export function PromosPanel() {
  const vouchers = useStore((s) => s.vouchers);
  const settings = useStore((s) => s.settings);
  const [f, setF] = useState({ code: '', description: '', kind: 'percent' as 'percent' | 'fixed', value: 10, minSpend: 0,
    perCustomer: 1, maxUses: '', expiresAt: '', firstOrderOnly: false });
  const [rs, setRs] = useState({ rewardThreshold: settings.rewardThreshold, rewardValue: settings.rewardValue });
  useEffect(() => setRs({ rewardThreshold: settings.rewardThreshold, rewardValue: settings.rewardValue }), [settings]);

  const promos = vouchers.filter((v) => v.source === 'promo');
  const rewards = vouchers.filter((v) => v.source === 'reward');

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await actions.createVoucher({ ...f, maxUses: f.maxUses ? Number(f.maxUses) : undefined,
        expiresAt: f.expiresAt ? (new Date(f.expiresAt + 'T23:59:59').getTime()) : undefined });
      showToast(`✅ Code ${f.code.toUpperCase()} is live`);
      setF({ ...f, code: '', description: '' });
    } catch (err) { showToast((err as Error).message); }
  };

  return (
    <div className="mk-grid">
      <form className="card stack" onSubmit={create}>
        <h3>🎟️ Create a promo code</h3>
        <p className="tiny muted">Advertise it with an Ad (hero slide / TV) — guests enter it at checkout. Every use is tracked.</p>
        <div className="two-col">
          <label className="field"><span>Code</span><input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} placeholder="FRIDAY20" /></label>
          <label className="field"><span>Type</span>
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as 'percent' | 'fixed' })}><option value="percent">% off</option><option value="fixed">Amount off</option></select>
          </label>
          <label className="field"><span>{f.kind === 'percent' ? 'Percent' : 'Amount'}</span><input type="number" min={1} value={f.value} onChange={(e) => setF({ ...f, value: +e.target.value })} /></label>
          <label className="field"><span>Min spend</span><input type="number" min={0} value={f.minSpend} onChange={(e) => setF({ ...f, minSpend: +e.target.value })} /></label>
          <label className="field"><span>Uses per guest</span><input type="number" min={1} value={f.perCustomer} onChange={(e) => setF({ ...f, perCustomer: +e.target.value })} /></label>
          <label className="field"><span>Total uses (blank = ∞)</span><input type="number" min={1} value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} /></label>
          <label className="field"><span>Expires</span><input type="date" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} /></label>
          <label className="field check"><input type="checkbox" checked={f.firstOrderOnly} onChange={(e) => setF({ ...f, firstOrderOnly: e.target.checked })} /><span>First app order only</span></label>
        </div>
        <label className="field"><span>Description (shown to guests)</span><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="20% off everything this Friday" /></label>
        <button className="btn btn-primary" type="submit">Create code</button>
      </form>

      <form className="card stack" onSubmit={(e) => { e.preventDefault(); run(actions.saveSettings(rs).then(() => showToast('✅ Reward rules saved'))); }}>
        <h3>🎁 Loyalty rewards</h3>
        <p className="tiny muted">The app tracks each guest's served orders. Every time they cross the points milestone, a personal one-time code is issued automatically.</p>
        <div className="two-col">
          <label className="field"><span>Points per reward</span><input type="number" min={0} value={rs.rewardThreshold} onChange={(e) => setRs({ ...rs, rewardThreshold: +e.target.value })} /></label>
          <label className="field"><span>Reward value</span><input type="number" min={0} value={rs.rewardValue} onChange={(e) => setRs({ ...rs, rewardValue: +e.target.value })} /></label>
        </div>
        <p className="tiny muted">1 point per {money(Math.round(1 / (settings.pointsPerUnit || 0.01)))} spent. Set either to 0 to pause rewards.</p>
        <button className="btn btn-ghost" type="submit">Save rules</button>
        <div className="kpi-row">
          <div><strong>{rewards.length}</strong><small>Rewards issued</small></div>
          <div><strong>{rewards.filter((v) => v.redemptions.length).length}</strong><small>Redeemed</small></div>
        </div>
      </form>

      <div className="card span-all">
        <h3>Active & past codes</h3>
        <div className="table">
          <div className="tr th"><span>Code</span><span>Offer</span><span>Uses</span><span>Status</span><span /></div>
          {promos.map((v) => (
            <div key={v.id} className="tr">
              <span className="code-chip">{v.code}</span>
              <span className="small">{v.kind === 'percent' ? `${v.value}% off` : `${money(v.value)} off`}{v.minSpend ? ` · min ${money(v.minSpend)}` : ''}{v.firstOrderOnly ? ' · 1st order' : ''}{v.expiresAt ? ` · until ${new Date(v.expiresAt).toLocaleDateString()}` : ''}<br /><span className="tiny muted">{v.description}</span></span>
              <span><b>{v.redemptions.length}</b>{v.maxUses ? ` / ${v.maxUses}` : ''}</span>
              <span className={`status ${v.active ? 'status-served' : 'status-cancelled'}`}>{v.active ? 'Live' : 'Paused'}</span>
              <button className="btn btn-ghost sm" onClick={() => run(actions.setVoucherActive(v.id, !v.active))}>{v.active ? 'Pause' : 'Resume'}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ======================= Ads / hero slides / TV =======================
const PLACEMENT_LABELS: { id: Placement; label: string }[] = [
  { id: 'home', label: 'Home' }, { id: 'menu', label: 'Menu' }, { id: 'book', label: 'Book' }, { id: 'social', label: 'Moments' }, { id: 'events', label: 'Events page' }, { id: 'tv', label: 'Bar TVs' },
];
const blankAd = (): Partial<Ad> & { image?: string } => ({ title: '', subtitle: '', emoji: '🍸', theme: 'purple',
  cta: { label: 'Order now', type: 'menu', target: 'cocktails' }, placements: ['home', 'menu', 'tv'], active: true });

export function AdsPanel() {
  const ads = useStore((s) => s.ads);
  const [editing, setEditing] = useState<{ id?: string; ad: Partial<Ad> & { image?: string; removeImage?: boolean } } | null>(null);
  return (
    <div className="stack">
      <div className="row-gap">
        <p className="small muted grow">Ads appear as hero slides at the top of pages, as cards inside the menu & feed, and on the bar TVs (open <b>/#tv</b> on a screen).</p>
        <button className="btn btn-primary sm" onClick={() => setEditing({ ad: blankAd() })}>+ New ad</button>
      </div>
      <div className="ads-grid">
        {ads.map((a) => (
          <article key={a.id} className={`ad-admin ${a.active ? '' : 'off'}`}>
            <div className="ad-admin-preview" style={{ background: adBackground(a) }}>
              {!a.image && <span>{a.emoji}</span>}
              <div><strong>{a.title}</strong><small>{a.subtitle}</small></div>
            </div>
            <div className="ad-admin-meta">
              <div className="chips-wrap">{a.placements.map((p) => <span key={p} className="tag tag-purple">{PLACEMENT_LABELS.find((x) => x.id === p)?.label}</span>)}</div>
              <div className="row-gap">
                <button className="btn btn-ghost sm" onClick={() => run(actions.saveAd({ active: !a.active }, a.id))}>{a.active ? 'Pause' : 'Go live'}</button>
                <button className="btn btn-ghost sm" onClick={() => setEditing({ id: a.id, ad: { ...a, image: undefined } })}>Edit</button>
                <button className="btn btn-ghost sm danger" onClick={() => { if (confirm(`Delete "${a.title}"?`)) run(actions.deleteAd(a.id)); }}>Delete</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {editing && <AdEditor id={editing.id} initial={editing.ad} existingImage={ads.find((x) => x.id === editing.id)?.image} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AdEditor({ id, initial, existingImage, onClose }: { id?: string; initial: Partial<Ad> & { image?: string; removeImage?: boolean }; existingImage?: string; onClose: () => void }) {
  const [ad, setAd] = useState(initial);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cta = ad.cta ?? { label: '', type: 'none', target: '' };
  const previewImg = ad.image ?? (ad.removeImage ? undefined : existingImage);
  const preview = { ...(ad as Ad), image: previewImg && previewImg.startsWith('data:') ? previewImg : previewImg };

  const save = async () => {
    if (!ad.title?.trim()) return showToast('Add a title');
    setBusy(true);
    try { await actions.saveAd(ad, id); onClose(); } catch (e) { showToast((e as Error).message); } finally { setBusy(false); }
  };
  const togglePlacement = (p: Placement) => {
    const cur = ad.placements ?? [];
    setAd({ ...ad, placements: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet wide" onClick={(e) => e.stopPropagation()}>
        <h3>{id ? 'Edit ad' : 'New ad'}</h3>
        <div className="hero-slide preview" style={{ background: adBackground(preview) }}>
          <div className="hero-copy"><span className="hero-kicker">Latest offer</span><h2>{ad.title || 'Your headline'}</h2><p>{ad.subtitle}</p>{cta.type !== 'none' && <span className="hero-cta">{cta.label || 'View'} →</span>}</div>
          {!previewImg && <span className="hero-emoji">{ad.emoji}</span>}
        </div>
        <div className="two-col">
          <label className="field"><span>Headline</span><input maxLength={60} value={ad.title} onChange={(e) => setAd({ ...ad, title: e.target.value })} placeholder="Ladies Night — free welcome shot" /></label>
          <label className="field"><span>Sub-text</span><input maxLength={120} value={ad.subtitle} onChange={(e) => setAd({ ...ad, subtitle: e.target.value })} placeholder="Every Wednesday from 8 PM" /></label>
          <label className="field"><span>Emoji (if no photo)</span><input maxLength={4} value={ad.emoji} onChange={(e) => setAd({ ...ad, emoji: e.target.value })} /></label>
          <div className="field"><span>Colour</span>
            <div className="swatches">{Object.entries(AD_THEMES).map(([k, [a, b]]) => (
              <button key={k} type="button" className={ad.theme === k ? 'on' : ''} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} onClick={() => setAd({ ...ad, theme: k })} aria-label={k} />
            ))}</div>
          </div>
        </div>
        <div className="row-gap">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setAd({ ...ad, image: await resizeImage(f, 1600), removeImage: false }); }} />
          <button type="button" className="btn btn-ghost sm" onClick={() => fileRef.current?.click()}>📷 {previewImg ? 'Change photo' : 'Add photo'}</button>
          {previewImg && <button type="button" className="btn btn-ghost sm danger" onClick={() => setAd({ ...ad, image: undefined, removeImage: true })}>Remove photo</button>}
        </div>
        <div className="two-col">
          <label className="field"><span>Button action</span>
            <select value={cta.type} onChange={(e) => setAd({ ...ad, cta: { ...cta, type: e.target.value as Ad['cta']['type'], target: '' } })}>
              <option value="none">No button</option><option value="menu">Open menu section</option><option value="book">Book a space</option>
              <option value="code">Give a promo code</option><option value="social">Open Moments</option>
            </select>
          </label>
          {cta.type !== 'none' && <label className="field"><span>Button text</span><input maxLength={24} value={cta.label} onChange={(e) => setAd({ ...ad, cta: { ...cta, label: e.target.value } })} /></label>}
          {cta.type === 'menu' && <label className="field"><span>Menu section</span><select value={cta.target} onChange={(e) => setAd({ ...ad, cta: { ...cta, target: e.target.value } })}><option value="">All</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
          {cta.type === 'book' && <label className="field"><span>Space</span><select value={cta.target} onChange={(e) => setAd({ ...ad, cta: { ...cta, target: e.target.value } })}><option value="">Any</option>{SPACES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
          {cta.type === 'code' && <label className="field"><span>Promo code</span><input value={cta.target} onChange={(e) => setAd({ ...ad, cta: { ...cta, target: e.target.value.toUpperCase() } })} placeholder="WELCOME10" /></label>}
        </div>
        <div className="field"><span>Show on</span>
          <div className="chips-wrap">{PLACEMENT_LABELS.map((p) => (
            <button key={p.id} type="button" className={`chip ${ad.placements?.includes(p.id) ? 'chip-active' : ''}`} onClick={() => togglePlacement(p.id)}>{p.label}</button>
          ))}</div>
        </div>
        <div className="row-gap">
          <button className="btn btn-ghost grow" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary grow" onClick={save} disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Publish ad'}</button>
        </div>
      </div>
    </div>
  );
}

// ======================= Social moderation =======================
export function SocialPanel() {
  const posts = useStore((s) => s.posts);
  return (
    <div className="stack">
      <p className="small muted">Feature great photos (they lead on the bar TVs), hide anything inappropriate, or delete it entirely.</p>
      {posts.length === 0 && <p className="muted pad">No posts yet.</p>}
      <div className="mod-grid">
        {posts.map((p) => (
          <article key={p.id} className={`mod-card ${p.hidden ? 'off' : ''}`}>
            <img src={mediaUrl(p.image)} alt="" loading="lazy" />
            <div className="mod-body">
              <div className="small"><b>{p.author}</b> · {timeAgo(p.createdAt)} · ♥ {p.likes.length}</div>
              {p.caption && <p className="tiny muted clamp2">{p.caption}</p>}
              <div className="row-gap">
                <button className={`btn sm ${p.featured ? 'btn-lime' : 'btn-ghost'}`} onClick={() => run(actions.moderatePost(p.id, { featured: !p.featured }))}>★ {p.featured ? 'Featured' : 'Feature'}</button>
                <button className="btn btn-ghost sm" onClick={() => run(actions.moderatePost(p.id, { hidden: !p.hidden }))}>{p.hidden ? 'Unhide' : 'Hide'}</button>
                <button className="btn btn-ghost sm danger" onClick={() => { if (confirm('Delete this post permanently?')) run(actions.deletePost(p.id)); }}>Delete</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ======================= Customers (app usage tracking) =======================
export function CustomersPanel() {
  const [rows, setRows] = useState<CustomerStats[] | null>(null);
  const [q, setQ] = useState('');
  const orders = useStore((s) => s.orders);
  const load = () => actions.fetchCustomers().then(setRows).catch((e) => showToast((e as Error).message));
  useEffect(() => { load(); }, [orders.length]); // refresh as new orders arrive

  const list = (rows ?? []).filter((r) => `${r.name} ${r.phone ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const active30 = (rows ?? []).filter((r) => r.lastVisit && Date.now() - r.lastVisit < 30 * 864e5).length;
  const exportCsv = () => {
    const csv = ['Name,Phone,Served orders,Spent,Points,Codes used,Posts,Last order',
      ...list.map((r) => [r.name, r.phone ?? '', r.orders, r.spent, r.points, r.redeemed, r.posts, r.lastVisit ? new Date(r.lastVisit).toISOString() : '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `rizz-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="stack">
      <div className="overview">
        <div className="kpi"><small>App users</small><strong>{rows?.length ?? '–'}</strong></div>
        <div className="kpi"><small>Active (30 days)</small><strong>{active30}</strong></div>
        <div className="kpi"><small>Spent via app</small><strong>{money((rows ?? []).reduce((s, r) => s + r.spent, 0))}</strong></div>
        <div className="kpi"><small>Codes redeemed</small><strong>{(rows ?? []).reduce((s, r) => s + r.redeemed, 0)}</strong></div>
      </div>
      <div className="row-gap">
        <input className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone…" />
        <button className="btn btn-ghost sm" onClick={load}>Refresh</button>
        <button className="btn btn-ghost sm" onClick={exportCsv}>Export CSV</button>
      </div>
      <div className="card">
        <div className="table cust">
          <div className="tr th"><span>Guest</span><span>Orders</span><span>Spent</span><span>Points</span><span>Codes</span><span>Last order</span></div>
          {list.map((r, i) => (
            <div key={r.customerId} className="tr">
              <span>{i < 3 && !q ? ['🥇', '🥈', '🥉'][i] + ' ' : ''}<b>{r.name}</b><br /><span className="tiny muted">{r.phone || '—'}</span></span>
              <span>{r.orders}</span><span>{money(r.spent)}</span><span>{r.points}</span><span>{r.redeemed}</span>
              <span className="tiny">{r.lastVisit ? timeAgo(r.lastVisit) : '—'}</span>
            </div>
          ))}
          {rows && list.length === 0 && <p className="muted pad">No guests yet.</p>}
        </div>
      </div>
      <p className="tiny muted">Use this list to reward your top spenders or send promo codes (e.g. by SMS/WhatsApp) to guests who haven't visited lately.</p>
    </div>
  );
}
