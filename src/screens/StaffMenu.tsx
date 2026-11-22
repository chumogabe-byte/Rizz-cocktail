import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, HappyHour, MenuItem } from '../types';
import { actions, run, showToast, useStore } from '../store/store';
import { CATEGORIES, OPTION_PRESETS, SECTIONS } from '../data/menu';
import { resizeImage } from '../image';
import { mediaUrl } from '../api';
import { ItemArt } from '../components/ItemBits';
import { Art } from '../components/Art';
import { AD_THEMES } from '../components/Promo';
import { money } from '../config';

type Draft = Omit<Partial<MenuItem>, 'offerPrice'> & { image?: string; removeImage?: boolean; offerPrice?: number | null };

export function MenuPanel() {
  const menu = useStore((s) => s.menu);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null);
  const [offerCat, setOfferCat] = useState<string>('cocktails');
  const [offerPct, setOfferPct] = useState(20);

  const list = useMemo(() => menu.filter((m) => (cat === 'all' || m.category === cat) &&
    `${m.name} ${m.description}`.toLowerCase().includes(q.toLowerCase())), [menu, cat, q]);
  const soldOut = menu.filter((m) => m.available === false).length;
  const onOffer = menu.filter((m) => m.offerPrice != null).length;

  const newItem = () => setEditing({ draft: { name: '', category: cat === 'all' ? 'cocktails' : cat, price: 10, description: '',
    emoji: '🍸', gradient: AD_THEMES.purple, available: true, popular: false, options: [] } });

  return (
    <div className="stack">
      <div className="overview">
        <div className="kpi"><small>Menu items</small><strong>{menu.length}</strong></div>
        <div className="kpi"><small>On offer</small><strong>{onOffer}</strong></div>
        <div className="kpi"><small>Sold out</small><strong>{soldOut}</strong></div>
        <div className="kpi"><small>Categories</small><strong>{new Set(menu.map((m) => m.category)).size}</strong></div>
      </div>

      <HappyHoursCard />

      <div className="card stack">
        <h3>🔥 Quick category offer</h3>
        <p className="tiny muted">Put a whole section on offer (e.g. happy hour). Guests see the offer price, the old price struck through and an "Offer" badge, and items appear under "Today's offers" on the home screen.</p>
        <div className="row-gap wrap">
          <select value={offerCat} onChange={(e) => setOfferCat(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="all">Whole menu</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input type="number" min={1} max={90} value={offerPct} onChange={(e) => setOfferPct(+e.target.value)} style={{ maxWidth: 90 }} />
          <span className="small">% off</span>
          <button className="btn btn-lime sm" onClick={() => run(actions.categoryOffer(offerCat, offerPct).then((r) => showToast(`🔥 ${r.updated} items now ${offerPct}% off`)))}>Apply offer</button>
          <button className="btn btn-ghost sm" onClick={() => run(actions.categoryOffer(offerCat, null).then((r) => showToast(`Offers cleared on ${r.updated} items`)))}>Clear offers</button>
        </div>
      </div>

      <div className="row-gap wrap">
        <input className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the menu…" style={{ minWidth: 200 }} />
        <select value={cat} onChange={(e) => setCat(e.target.value as Category | 'all')} style={{ maxWidth: 220 }}>
          <option value="all">All categories</option>
          {SECTIONS.map((s) => (
            <optgroup key={s.id} label={s.label}>
              {CATEGORIES.filter((c) => c.section === s.id).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </optgroup>
          ))}
        </select>
        <button className="btn btn-primary sm" onClick={newItem}>+ Add item</button>
      </div>

      <div className="menu-admin">
        {list.map((m) => (
          <article key={m.id} className={`menu-admin-row ${m.available === false ? 'off' : ''}`}>
            <ItemArt item={m} size="sm" />
            <div className="row-body">
              <strong>{m.name} {m.popular && <span className="tag tag-lime">Hot</span>}</strong>
              <span className="tiny muted">{CATEGORIES.find((c) => c.id === m.category)?.label} · {m.options?.length ? `${m.options.length} option group(s)` : 'no options'}</span>
            </div>
            <InlinePrice item={m} />
            <label className="switch" title="Available">
              <input type="checkbox" checked={m.available !== false} onChange={(e) => run(actions.saveMenuItem({ available: e.target.checked }, m.id))} />
              <span>{m.available === false ? 'Sold out' : 'Available'}</span>
            </label>
            <button className="btn btn-ghost sm" onClick={() => setEditing({ id: m.id, draft: { ...m, image: undefined } })}>Edit</button>
          </article>
        ))}
        {list.length === 0 && <p className="muted pad">No items match.</p>}
      </div>

      {editing && <ItemEditor id={editing.id} initial={editing.draft} existingImage={menu.find((m) => m.id === editing.id)?.image} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ItemEditor({ id, initial, existingImage, onClose }: { id?: string; initial: Draft; existingImage?: string; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [tags, setTags] = useState((initial.tags ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const options = d.options ?? [];
  const img = d.image ?? (d.removeImage ? undefined : existingImage);
  const setOpt = (next: NonNullable<MenuItem['options']>) => setD({ ...d, options: next });

  const save = async () => {
    if (!d.name?.trim()) return showToast('Give the item a name');
    if (!(Number(d.price) >= 0)) return showToast('Enter a price');
    setBusy(true);
    try {
      await actions.saveMenuItem({ ...d, tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        offerPrice: d.offerPrice === undefined || d.offerPrice === null || Number.isNaN(d.offerPrice) ? null : d.offerPrice }, id);
      showToast(id ? '✅ Item updated — live on all devices' : '✅ Item added to the menu');
      onClose();
    } catch (e) { showToast((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!id || !confirm(`Delete "${d.name}" from the menu?`)) return;
    try { await actions.deleteMenuItem(id); onClose(); } catch (e) { showToast((e as Error).message); }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet wide" onClick={(e) => e.stopPropagation()}>
        <h3>{id ? 'Edit menu item' : 'Add menu item'}</h3>

        <div className="row-gap">
          <Art emoji={d.emoji || '🍸'} gradient={(d.gradient as [string, string]) ?? AD_THEMES.purple} size="md" img={img ? (img.startsWith('data:') ? img : mediaUrl(img)) : undefined} />
          <div className="stack" style={{ gap: 6 }}>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setD({ ...d, image: await resizeImage(f, 1000), removeImage: false }); }} />
            <button type="button" className="btn btn-ghost sm" onClick={() => fileRef.current?.click()}>📷 {img ? 'Change photo' : 'Add photo'}</button>
            {img && <button type="button" className="btn btn-ghost sm danger" onClick={() => setD({ ...d, image: undefined, removeImage: true })}>Remove photo</button>}
          </div>
        </div>

        <div className="two-col">
          <label className="field"><span>Name</span><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Passion Martini" /></label>
          <label className="field"><span>Category</span>
            <select value={d.category} onChange={(e) => setD({ ...d, category: e.target.value as Category })}>
              {SECTIONS.map((s) => (
                <optgroup key={s.id} label={s.label}>{CATEGORIES.filter((c) => c.section === s.id).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>
              ))}
            </select>
          </label>
          <label className="field"><span>Price{options.some((o) => o.choices.some((c) => c.name.startsWith('Single'))) ? ' (per single)' : ''}</span>
            <input type="number" min={0} step="0.5" value={d.price ?? ''} onChange={(e) => setD({ ...d, price: e.target.value === '' ? undefined : +e.target.value })} /></label>
          <label className="field"><span>Offer price (optional)</span>
            <input type="number" min={0} step="0.5" value={d.offerPrice ?? ''} placeholder="Leave blank for no offer" onChange={(e) => setD({ ...d, offerPrice: e.target.value === '' ? null : +e.target.value })} /></label>
        </div>
        <label className="field"><span>Description</span><textarea rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></label>
        <div className="two-col">
          <label className="field"><span>Emoji (when no photo)</span><input maxLength={4} value={d.emoji} onChange={(e) => setD({ ...d, emoji: e.target.value })} /></label>
          <div className="field"><span>Colour</span>
            <div className="swatches">{Object.entries(AD_THEMES).map(([k, g]) => (
              <button key={k} type="button" className={d.gradient?.[0] === g[0] ? 'on' : ''} style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }} onClick={() => setD({ ...d, gradient: g })} aria-label={k} />
            ))}</div>
          </div>
          <label className="field"><span>Tags (comma separated)</span><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Signature, Spicy" /></label>
          <label className="field"><span>ABV (optional)</span><input value={d.abv ?? ''} onChange={(e) => setD({ ...d, abv: e.target.value })} placeholder="14%" /></label>
          <label className="field check"><input type="checkbox" checked={!!d.popular} onChange={(e) => setD({ ...d, popular: e.target.checked })} /><span>Mark as "Hot" / popular</span></label>
          <label className="field check"><input type="checkbox" checked={d.available !== false} onChange={(e) => setD({ ...d, available: e.target.checked })} /><span>Available (untick = sold out)</span></label>
          <label className="field check"><input type="checkbox" checked={!!d.bottle} onChange={(e) => setD({ ...d, bottle: e.target.checked })} /><span>🍾 Counts as a bottle purchase</span></label>
          <label className="field check"><input type="checkbox" checked={!!d.requiresBottle} onChange={(e) => setD({ ...d, requiresBottle: e.target.checked })} /><span>Only with a bottle in the same order</span></label>
          <label className="field check"><input type="checkbox" checked={!!d.window} onChange={(e) => setD({ ...d, window: e.target.checked ? { days: [0, 1, 2, 3, 4, 5, 6], start: '14:00', end: '17:00' } : (null as never) })} /><span>🕑 Only available at certain times</span></label>
        </div>
        {d.window && (
          <div className="hh-editor stack">
            <div className="row-gap wrap">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dn, i) => (
                <button key={dn} type="button" className={`chip ${d.window!.days.includes(i) ? 'chip-active' : ''}`}
                  onClick={() => setD({ ...d, window: { ...d.window!, days: d.window!.days.includes(i) ? d.window!.days.filter((x) => x !== i) : [...d.window!.days, i] } })}>{dn}</button>
              ))}
            </div>
            <div className="two-col">
              <label className="field"><span>From (Kenya time)</span><input type="time" value={d.window.start} onChange={(e) => setD({ ...d, window: { ...d.window!, start: e.target.value } })} /></label>
              <label className="field"><span>Until</span><input type="time" value={d.window.end} onChange={(e) => setD({ ...d, window: { ...d.window!, end: e.target.value } })} /></label>
            </div>
            <p className="tiny muted">Outside these times guests see the item but can't order it — perfect for happy-hour deals.</p>
          </div>
        )}
        <div>
        </div>

        <div className="field">
          <span>Options guests can choose</span>
          <div className="row-gap wrap">
            <button type="button" className="chip" onClick={() => setOpt(OPTION_PRESETS.spirit(Math.round((d.price ?? 8) * 9)))}>+ Spirit: single / double / bottle</button>
            <button type="button" className="chip" onClick={() => setOpt(OPTION_PRESETS.pour(Math.round((d.price ?? 8) * 3)))}>+ Glass / bottle</button>
            <button type="button" className="chip" onClick={() => setOpt(OPTION_PRESETS.upgrade())}>+ Spirit upgrade</button>
            <button type="button" className="chip" onClick={() => setOpt([...options, { label: 'Size', choices: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 3 }] }])}>+ Custom group</button>
            {options.length > 0 && <button type="button" className="chip danger" onClick={() => setOpt([])}>Clear options</button>}
          </div>
          {options.map((o, gi) => (
            <div key={gi} className="opt-editor">
              <div className="row-gap">
                <input value={o.label} onChange={(e) => setOpt(options.map((x, i) => i === gi ? { ...x, label: e.target.value } : x))} placeholder="Group name e.g. Size" />
                <button type="button" className="btn btn-ghost sm danger" onClick={() => setOpt(options.filter((_, i) => i !== gi))}>Remove group</button>
              </div>
              {o.choices.map((c, ci) => (
                <div key={ci} className="row-gap">
                  <input className="grow" value={c.name} onChange={(e) => setOpt(options.map((x, i) => i !== gi ? x : { ...x, choices: x.choices.map((y, j) => j === ci ? { ...y, name: e.target.value } : y) }))} placeholder="Choice" />
                  <input type="number" min={0} step="0.5" style={{ maxWidth: 110 }} value={c.price} onChange={(e) => setOpt(options.map((x, i) => i !== gi ? x : { ...x, choices: x.choices.map((y, j) => j === ci ? { ...y, price: +e.target.value } : y) }))} title="Extra price" />
                  <button type="button" className="icon-btn sm-icon" onClick={() => setOpt(options.map((x, i) => i !== gi ? x : { ...x, choices: x.choices.filter((_, j) => j !== ci) }))} aria-label="Remove choice">✕</button>
                </div>
              ))}
              <button type="button" className="link small" onClick={() => setOpt(options.map((x, i) => i !== gi ? x : { ...x, choices: [...x.choices, { name: '', price: 0 }] }))}>+ Add choice</button>
            </div>
          ))}
          {options.length > 0 && <p className="tiny muted">The number is the extra cost. "Double…" choices charge 2× the price; for "Bottle (…)" the number is the full bottle price.</p>}
        </div>

        <div className="row-gap">
          {id && <button className="btn btn-ghost danger" onClick={remove}>Delete</button>}
          <button className="btn btn-ghost grow" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary grow" onClick={save} disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : `Add · ${money(d.offerPrice ?? d.price ?? 0)}`}</button>
        </div>
      </div>
    </div>
  );
}

/** Edit a price straight from the list: type, then Enter or tap away to save. */
function InlinePrice({ item }: { item: MenuItem }) {
  const [v, setV] = useState(String(item.price));
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  useEffect(() => { setV(String(item.price)); }, [item.price]);
  const commit = async () => {
    const n = Math.round(+v);
    if (!Number.isFinite(n) || n < 0 || n === item.price) { setV(String(item.price)); return; }
    setState('saving');
    try { await actions.saveMenuItem({ price: n }, item.id); setState('saved'); setTimeout(() => setState('idle'), 1200); }
    catch (e) { showToast((e as Error).message); setV(String(item.price)); setState('idle'); }
  };
  return (
    <div className="inline-price">
      <span className="tiny muted">KSh</span>
      <input inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setV(String(item.price)); (e.target as HTMLInputElement).blur(); } }} aria-label={`Price of ${item.name}`} />
      {state === 'saving' && <span className="tiny muted">…</span>}
      {state === 'saved' && <span className="tiny plus">✓</span>}
      {item.offerPrice != null && <span className="tiny price">offer {money(item.offerPrice)}</span>}
      {item.happyHour && <span className="tiny hh-tag">🍹 {money(item.hhPrice ?? 0)} now</span>}
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Scheduled happy hours: automatic % off a category on chosen days & times (Nairobi time). */
function HappyHoursCard() {
  const hours = useStore((s) => s.happyHours) as HappyHour[];
  const [draft, setDraft] = useState<Partial<HappyHour> | null>(null);
  const save = async () => {
    if (!draft) return;
    try { await actions.saveHappyHour(draft, draft.id); setDraft(null); showToast('🍹 Happy hour saved — prices switch automatically'); }
    catch (e) { showToast((e as Error).message); }
  };
  const catLabel = (c: string) => (c === 'all' ? 'Whole menu' : CATEGORIES.find((x) => x.id === c)?.label ?? c);
  return (
    <div className="card stack">
      <div className="row-gap">
        <h3 className="grow">🍹 Happy hours (automatic)</h3>
        <button className="btn btn-primary sm" onClick={() => setDraft({ name: 'Happy Hour', category: 'cocktails', percent: 20, days: [1, 2, 3, 4, 5], start: '16:00', end: '19:00', active: true })}>+ Schedule</button>
      </div>
      <p className="tiny muted">Discounts switch on and off by themselves at the times below (Kenya time). Guests see a "Happy hour" badge and banner, and the server charges the happy-hour price.</p>
      {hours.length === 0 && <p className="tiny muted">No happy hours scheduled.</p>}
      {hours.map((h) => (
        <div key={h.id} className={`hh-row ${h.active ? '' : 'off'}`}>
          <div className="row-body">
            <strong>{h.name} · {h.percent}% off {catLabel(h.category)}</strong>
            <span className="tiny muted">{h.days.length === 7 ? 'Every day' : h.days.sort().map((d) => DAYS[d]).join(', ')} · {h.start}–{h.end}</span>
          </div>
          <label className="switch"><input type="checkbox" checked={h.active} onChange={(e) => run(actions.saveHappyHour({ active: e.target.checked }, h.id))} /><span>{h.active ? 'On' : 'Off'}</span></label>
          <button className="btn btn-ghost sm" onClick={() => setDraft({ ...h })}>Edit</button>
        </div>
      ))}
      {draft && (
        <div className="hh-editor stack">
          <div className="two-col">
            <label className="field"><span>Name</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <label className="field"><span>Applies to</span>
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                <option value="all">Whole menu</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className="field"><span>% off</span><input type="number" min={1} max={90} value={draft.percent} onChange={(e) => setDraft({ ...draft, percent: +e.target.value })} /></label>
            <div className="two-col">
              <label className="field"><span>From</span><input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></label>
              <label className="field"><span>Until</span><input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></label>
            </div>
          </div>
          <div className="chips-wrap">
            {DAYS.map((d, i) => (
              <button key={d} type="button" className={`chip ${draft.days?.includes(i) ? 'chip-active' : ''}`}
                onClick={() => setDraft({ ...draft, days: draft.days?.includes(i) ? draft.days.filter((x) => x !== i) : [...(draft.days ?? []), i] })}>{d}</button>
            ))}
          </div>
          <div className="row-gap">
            {draft.id && <button className="btn btn-ghost sm danger" onClick={() => { if (confirm('Delete this happy hour?')) run(actions.deleteHappyHour(draft.id!).then(() => setDraft(null))); }}>Delete</button>}
            <button className="btn btn-ghost sm grow" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn btn-primary sm grow" onClick={save}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
