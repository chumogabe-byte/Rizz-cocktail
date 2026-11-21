import { useEffect, useRef, useState } from 'react';
import type { Space } from '../types';
import { actions, showToast, useStore } from '../store/store';
import { mediaUrl } from '../api';
import { resizeImage } from '../image';
import { Art } from '../components/Art';
import { AD_THEMES } from '../components/Promo';
import { BAR, money } from '../config';

/** Image picker: shows current image (URL or new data URL), lets admin replace or remove it. */
function ImagePick({ value, onChange, label, square, max = 1400 }: { value: string | null | undefined; onChange: (v: string | null) => void; label: string; square?: boolean; max?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const src = value ? (value.startsWith('data:') ? value : mediaUrl(value)) : '';
  return (
    <div className="img-pick">
      <div className={`img-pick-preview ${square ? 'square' : ''}`} style={src ? { backgroundImage: `url("${src}")` } : undefined} onClick={() => ref.current?.click()}>
        {!src && <span>📷<small>{label}</small></span>}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) onChange(await resizeImage(f, max)); e.target.value = ''; }} />
      <div className="row-gap">
        <button type="button" className="btn btn-ghost sm" onClick={() => ref.current?.click()}>{src ? 'Change' : 'Upload'}</button>
        {src && <button type="button" className="btn btn-ghost sm danger" onClick={() => onChange(null)}>Remove</button>}
      </div>
    </div>
  );
}

// ======================= App & Branding =======================
export function SettingsPanel() {
  const content = useStore((s) => s.content);
  const [bar, setBar] = useState(content?.bar ?? { ...BAR, serviceFeeRate: BAR.serviceFeeRate });
  const [welcome, setWelcome] = useState({ title: content?.welcome.title ?? '', subtitle: content?.welcome.subtitle ?? '' });
  const [images, setImages] = useState<string[]>(content?.welcome.images ?? []);
  const [home, setHome] = useState({ headline: content?.home.headline ?? '' });
  const [orderImage, setOrderImage] = useState<string | null | undefined>(undefined);
  const [bookImage, setBookImage] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!content) return;
    setBar(content.bar);
    setWelcome({ title: content.welcome.title, subtitle: content.welcome.subtitle });
    setImages(content.welcome.images);
    setHome({ headline: content.home.headline });
  }, [content?.bar, content?.welcome, content?.home]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setBusy(true);
    try {
      await actions.saveContent({ bar, welcome: { ...welcome, images }, home: { ...home, orderImage, bookImage } });
      setOrderImage(undefined); setBookImage(undefined);
      showToast('✅ Saved — guests see the changes instantly');
    } catch (e) { showToast((e as Error).message); } finally { setBusy(false); }
  };
  const curOrder = orderImage === undefined ? content?.home.orderImage : orderImage;
  const curBook = bookImage === undefined ? content?.home.bookImage : bookImage;

  return (
    <div className="stack">
      <div className="mk-grid">
        <div className="card stack">
          <h3>🏷️ Bar details</h3>
          <div className="two-col">
            <label className="field"><span>Bar name</span><input value={bar.name} onChange={(e) => setBar({ ...bar, name: e.target.value })} /></label>
            <label className="field"><span>Tagline</span><input value={bar.tagline} onChange={(e) => setBar({ ...bar, tagline: e.target.value })} /></label>
            <label className="field"><span>Opening hours</span><input value={bar.hours} onChange={(e) => setBar({ ...bar, hours: e.target.value })} /></label>
            <label className="field"><span>Phone</span><input value={bar.phone} onChange={(e) => setBar({ ...bar, phone: e.target.value })} /></label>
          </div>
          <label className="field"><span>Address</span><input value={bar.address} onChange={(e) => setBar({ ...bar, address: e.target.value })} /></label>
          <label className="field"><span>Service charge (%)</span>
            <input type="number" min={0} max={30} step="0.5" value={Math.round(bar.serviceFeeRate * 1000) / 10} onChange={(e) => setBar({ ...bar, serviceFeeRate: (+e.target.value || 0) / 100 })} style={{ maxWidth: 140 }} />
          </label>
          <p className="tiny muted">Applied to every new order (on the server). Set 0 for none.</p>
        </div>

        <div className="card stack">
          <h3>🏠 Home screen</h3>
          <label className="field"><span>Headline (the word "vibe", or the last word, is highlighted)</span><input value={home.headline} onChange={(e) => setHome({ headline: e.target.value })} placeholder="What's your vibe tonight?" /></label>
          <div className="two-col">
            <div className="field"><span>"Order Drinks & Food" button photo</span><ImagePick value={curOrder} onChange={setOrderImage} label="Order photo" /></div>
            <div className="field"><span>"Book a Space" button photo</span><ImagePick value={curBook} onChange={setBookImage} label="Booking photo" /></div>
          </div>
          <p className="tiny muted">Hero slides at the top of each page are managed under <b>Offers & Hero slides</b>.</p>
        </div>

        <div className="card stack span-all">
          <h3>👋 Welcome screen</h3>
          <div className="two-col">
            <label className="field"><span>Title (last word is highlighted)</span><input value={welcome.title} onChange={(e) => setWelcome({ ...welcome, title: e.target.value })} /></label>
            <label className="field"><span>Sub-title</span><input value={welcome.subtitle} onChange={(e) => setWelcome({ ...welcome, subtitle: e.target.value })} /></label>
          </div>
          <div className="field"><span>Background photos (up to 6 — shown as the animated mosaic)</span>
            <div className="welcome-pick">
              {Array.from({ length: 6 }, (_, i) => (
                <ImagePick key={i} square label={`Photo ${i + 1}`} value={images[i]} max={900}
                  onChange={(v) => { const next = [...images]; if (v) next[i] = v; else next.splice(i, 1); setImages(next.filter(Boolean)); }} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="sticky-save">
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save & publish to app'}</button>
      </div>
    </div>
  );
}

// ======================= Spaces =======================
type SpaceDraft = Omit<Partial<Space>, 'image'> & { image?: string | null };

export function SpacesPanel() {
  const spaces = useStore((s) => s.spaces);
  const [editing, setEditing] = useState<{ id?: string; d: SpaceDraft } | null>(null);
  return (
    <div className="stack">
      <div className="row-gap">
        <p className="small muted grow">These are the areas guests can book (Book tab). Untick "Bookable" to hide one temporarily.</p>
        <button className="btn btn-primary sm" onClick={() => setEditing({ d: { name: '', description: '', emoji: '🛋️', gradient: AD_THEMES.purple, capacity: [2, 8], minSpend: 0, perks: [], multiParty: false, active: true } })}>+ Add space</button>
      </div>
      <div className="ads-grid">
        {spaces.map((s) => (
          <article key={s.id} className={`ad-admin ${s.active === false ? 'off' : ''}`}>
            <Art emoji={s.emoji} gradient={s.gradient} size="lg" img={s.image ? mediaUrl(s.image) : undefined} />
            <div className="ad-admin-meta">
              <strong>{s.name} {s.active === false && <span className="tag">Hidden</span>}</strong>
              <span className="small muted">{s.capacity[0]}–{s.capacity[1]} guests · {s.minSpend ? `Min ${money(s.minSpend)}` : 'No minimum'}{s.multiParty ? ' · several parties per slot' : ''}</span>
              <button className="btn btn-ghost sm" onClick={() => setEditing({ id: s.id, d: { ...s, image: undefined } })}>Edit</button>
            </div>
          </article>
        ))}
      </div>
      {editing && <SpaceEditor id={editing.id} initial={editing.d} existing={spaces.find((x) => x.id === editing.id)?.image} onClose={() => setEditing(null)} />}
    </div>
  );
}

function SpaceEditor({ id, initial, existing, onClose }: { id?: string; initial: SpaceDraft; existing?: string; onClose: () => void }) {
  const [d, setD] = useState<SpaceDraft>(initial);
  const [perks, setPerks] = useState((initial.perks ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const img = d.image === undefined ? existing : d.image;
  const save = async () => {
    if (!d.name?.trim()) return showToast('Give the space a name');
    setBusy(true);
    try { await actions.saveSpace({ ...d, perks: perks.split(',').map((p) => p.trim()).filter(Boolean) }, id); showToast('✅ Space saved'); onClose(); }
    catch (e) { showToast((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!id || !confirm(`Delete "${d.name}"?`)) return;
    try { await actions.deleteSpace(id); onClose(); } catch (e) { showToast((e as Error).message); }
  };
  const cap = d.capacity ?? [1, 10];
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet wide" onClick={(e) => e.stopPropagation()}>
        <h3>{id ? 'Edit space' : 'Add space'}</h3>
        <div className="field"><span>Photo</span><ImagePick value={img} onChange={(v) => setD({ ...d, image: v })} label="Space photo" /></div>
        <div className="two-col">
          <label className="field"><span>Name</span><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Garden Cabana" /></label>
          <label className="field"><span>Emoji (if no photo)</span><input maxLength={4} value={d.emoji} onChange={(e) => setD({ ...d, emoji: e.target.value })} /></label>
          <label className="field"><span>Min guests</span><input type="number" min={1} value={cap[0]} onChange={(e) => setD({ ...d, capacity: [+e.target.value, cap[1]] })} /></label>
          <label className="field"><span>Max guests</span><input type="number" min={1} value={cap[1]} onChange={(e) => setD({ ...d, capacity: [cap[0], +e.target.value] })} /></label>
          <label className="field"><span>Minimum spend (KSh, 0 = none)</span><input type="number" min={0} step={500} value={d.minSpend ?? 0} onChange={(e) => setD({ ...d, minSpend: +e.target.value })} /></label>
          <label className="field"><span>Perks (comma separated)</span><input value={perks} onChange={(e) => setPerks(e.target.value)} placeholder="Private host, City views" /></label>
        </div>
        <label className="field"><span>Description</span><textarea rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></label>
        <div className="field"><span>Colour</span>
          <div className="swatches">{Object.entries(AD_THEMES).map(([k, g]) => (
            <button key={k} type="button" className={d.gradient?.[0] === g[0] ? 'on' : ''} style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }} onClick={() => setD({ ...d, gradient: g })} aria-label={k} />
          ))}</div>
        </div>
        <div className="row-gap wrap">
          <label className="field check"><input type="checkbox" checked={!!d.multiParty} onChange={(e) => setD({ ...d, multiParty: e.target.checked })} /><span>Several groups can book the same time (e.g. bar counter)</span></label>
          <label className="field check"><input type="checkbox" checked={d.active !== false} onChange={(e) => setD({ ...d, active: e.target.checked })} /><span>Bookable (visible to guests)</span></label>
        </div>
        <div className="row-gap">
          {id && <button className="btn btn-ghost danger" onClick={remove}>Delete</button>}
          <button className="btn btn-ghost grow" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary grow" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save space'}</button>
        </div>
      </div>
    </div>
  );
}
