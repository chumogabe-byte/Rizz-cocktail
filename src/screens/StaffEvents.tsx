import { useRef, useState } from 'react';
import type { BarEvent, TicketType } from '../types';
import { actions, run, showToast, useStore } from '../store/store';
import { resizeImage } from '../image';
import { mediaUrl } from '../api';
import { AD_THEMES } from '../components/Promo';
import { money } from '../config';
import { eventBg, fmtWhen } from './Events';
import { PayBadge } from '../components/MpesaPay';

const toLocal = (t?: number) => {
  if (!t) return '';
  const d = new Date(t); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(v).getTime() : undefined);

type Draft = Partial<BarEvent> & { image?: string; removeImage?: boolean };

export function EventsPanel() {
  const events = useStore((s) => s.events);
  const tickets = useStore((s) => s.tickets);
  const isAdmin = useStore((s) => s.staffRole) === 'admin';
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const sorted = [...events].sort((a, b) => a.startsAt - b.startsAt);
  const live = tickets.filter((t) => t.status !== 'cancelled');
  const paidRevenue = live.filter((t) => t.status !== 'reserved').reduce((s, t) => s + t.total, 0);
  const owed = live.filter((t) => t.status === 'reserved').reduce((s, t) => s + t.total, 0);

  const checkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      const r = await actions.checkIn(code.trim());
      setResult({ ok: true, msg: `✅ ${r.unit.code} — ${r.ticket.customer} · ${r.unit.typeName} · ${r.ticket.eventTitle}${r.unpaid ? ` · ⚠ UNPAID: collect ${money(r.ticket.total)} then mark paid` : ''}` });
    } catch (x) { setResult({ ok: false, msg: `❌ ${(x as Error).message}` }); }
    setCode('');
  };

  const blank = (): Draft => {
    const start = new Date(); start.setDate(start.getDate() + 7); start.setHours(21, 0, 0, 0);
    return { title: '', subtitle: '', description: '', location: 'Main Bar', emoji: '🎉', theme: 'purple', startsAt: start.getTime(),
      endsAt: start.getTime() + 5 * 3600e3, featured: false, published: true,
      ticketTypes: [{ id: '', name: 'Regular', price: 20, capacity: 100 }] };
  };

  return (
    <div className="stack">
      <div className="overview">
        <div className="kpi"><small>Upcoming events</small><strong>{events.filter((e) => (e.endsAt || e.startsAt) > Date.now()).length}</strong></div>
        <div className="kpi"><small>Tickets sold</small><strong>{live.reduce((n, t) => n + t.units.length, 0)}</strong></div>
        <div className="kpi"><small>Ticket revenue (paid)</small><strong>{money(paidRevenue)}</strong></div>
        <div className="kpi"><small>Reserved, to collect</small><strong>{money(owed)}</strong></div>
      </div>

      <form className="card row-gap wrap" onSubmit={checkIn}>
        <strong>🚪 Door check-in</strong>
        <input className="grow" style={{ minWidth: 200 }} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Type or scan ticket code, e.g. TK-3FA9C1" />
        <button className="btn btn-primary sm" type="submit">Check in</button>
        {result && <p className={`small ${result.ok ? '' : 'error'}`} style={{ flexBasis: '100%' }}>{result.msg}</p>}
      </form>

      <div className="row-gap">
        <p className="small muted grow">Events appear on the guest Events page as square cards; ★ featured events also lead the hero carousel.</p>
        {isAdmin && <button className="btn btn-primary sm" onClick={() => setEditing({ draft: blank() })}>+ New event</button>}
      </div>

      {sorted.map((e) => {
        const evTickets = tickets.filter((t) => t.eventId === e.id);
        const sold = e.ticketTypes.reduce((n, t) => n + (e.sold[t.id] || 0), 0);
        const cap = e.ticketTypes.reduce((n, t) => n + t.capacity, 0);
        const past = (e.endsAt || e.startsAt) < Date.now();
        return (
          <article key={e.id} className={`event-admin ${e.published ? '' : 'off'} ${past ? 'past' : ''}`}>
            <div className="event-admin-row">
              <div className="event-thumb" style={{ background: eventBg(e, false) }}>{!e.image && e.emoji}</div>
              <div className="row-body">
                <strong>{e.title} {e.featured && <span className="tag tag-lime">★ Featured</span>} {!e.published && <span className="tag">Hidden</span>} {past && <span className="tag">Past</span>}</strong>
                <span className="small muted">{fmtWhen(e.startsAt)} · {e.location}</span>
                <span className="tiny">{e.ticketTypes.map((t) => `${t.name}: ${e.sold[t.id] || 0}/${t.capacity} @ ${t.price ? money(t.price) : 'free'}`).join(' · ')}</span>
                <div className="cap-bar"><span style={{ width: `${cap ? (sold / cap) * 100 : 0}%` }} /></div>
              </div>
              <div className="row-gap wrap">
                <button className="btn btn-ghost sm" onClick={() => setOpen(open === e.id ? null : e.id)}>Sales ({evTickets.filter((t) => t.status !== 'cancelled').length})</button>
                {isAdmin && <button className="btn btn-ghost sm" onClick={() => setEditing({ id: e.id, draft: { ...e, image: undefined } })}>Edit</button>}
              </div>
            </div>
            {open === e.id && (
              <div className="table sales">
                <div className="tr th"><span>Guest</span><span>Tickets</span><span>Total</span><span>Status</span><span /></div>
                {evTickets.length === 0 && <p className="muted pad small">No tickets yet.</p>}
                {evTickets.map((t) => (
                  <div key={t.id} className="tr">
                    <span><b>{t.customer}</b><br /><span className="tiny muted">{t.phone || '—'} · {t.code}</span></span>
                    <span className="small">{t.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}<br /><span className="tiny muted">{t.units.map((u) => u.code + (u.checkedInAt ? '✓' : '')).join(' ')}</span></span>
                    <span>{t.total ? money(t.total) : 'Free'}<br /><PayBadge payment={t.payment} total={t.total} /></span>
                    <span className={`status status-${t.status === 'reserved' ? 'pending' : t.status === 'paid' ? 'confirmed' : t.status}`}>{t.status === 'reserved' ? 'Unpaid' : t.status}</span>
                    <span className="row-gap wrap">
                      {t.status === 'reserved' && <button className="btn btn-lime sm" onClick={() => run(actions.setTicketStatus(t.id, 'paid'))}>Mark paid</button>}
                      {(t.status === 'reserved' || t.status === 'paid') && <button className="btn btn-ghost sm" onClick={() => run(actions.setTicketStatus(t.id, 'checked-in'))}>Check in all</button>}
                      {t.status !== 'cancelled' && t.status !== 'checked-in' && <button className="btn btn-ghost sm danger" onClick={() => { if (confirm('Cancel these tickets and free the places?')) run(actions.setTicketStatus(t.id, 'cancelled')); }}>Cancel</button>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>
        );
      })}

      {editing && <EventEditor id={editing.id} initial={editing.draft} existingImage={events.find((x) => x.id === editing.id)?.image} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EventEditor({ id, initial, existingImage, onClose }: { id?: string; initial: Draft; existingImage?: string; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const spaces = useStore((s) => s.spaces);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const img = d.image ?? (d.removeImage ? undefined : existingImage);
  const types = d.ticketTypes ?? [];
  const setTypes = (t: TicketType[]) => setD({ ...d, ticketTypes: t });

  const save = async () => {
    if (!d.title?.trim()) return showToast('Add a title');
    if (!d.startsAt) return showToast('Set a start time');
    setBusy(true);
    try { await actions.saveEvent(d, id); showToast(id ? '✅ Event updated' : '🎉 Event published'); onClose(); }
    catch (e) { showToast((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!id || !confirm(`Delete "${d.title}"?`)) return;
    try { await actions.deleteEvent(id); onClose(); } catch (e) { showToast((e as Error).message); }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet wide" onClick={(e) => e.stopPropagation()}>
        <h3>{id ? 'Edit event' : 'New event'}</h3>
        <div className="row-gap">
          <div className="event-thumb lg" style={{ background: img?.startsWith('data:') ? `center/cover url("${img}")` : img ? `center/cover url("${mediaUrl(img)}")` : eventBg({ theme: d.theme || 'purple' }, false) }}>{!img && d.emoji}</div>
          <div className="stack" style={{ gap: 6 }}>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setD({ ...d, image: await resizeImage(f, 1200), removeImage: false }); }} />
            <button type="button" className="btn btn-ghost sm" onClick={() => fileRef.current?.click()}>📷 {img ? 'Change' : 'Add'} square photo / flyer</button>
            {img && <button type="button" className="btn btn-ghost sm danger" onClick={() => setD({ ...d, image: undefined, removeImage: true })}>Remove photo</button>}
            <span className="tiny muted">Shown 1:1 — square images look best.</span>
          </div>
        </div>
        <div className="two-col">
          <label className="field"><span>Title</span><input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Amapiano Fridays" /></label>
          <label className="field"><span>Tagline</span><input value={d.subtitle} onChange={(e) => setD({ ...d, subtitle: e.target.value })} placeholder="DJ line-up, specials…" /></label>
          <label className="field"><span>Starts</span><input type="datetime-local" value={toLocal(d.startsAt)} onChange={(e) => setD({ ...d, startsAt: fromLocal(e.target.value) })} /></label>
          <label className="field"><span>Ends</span><input type="datetime-local" value={toLocal(d.endsAt)} onChange={(e) => setD({ ...d, endsAt: fromLocal(e.target.value) })} /></label>
          <label className="field"><span>Location</span>
            <input list="rizz-locations" value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} />
            <datalist id="rizz-locations"><option value="Main Bar" />{spaces.map((s) => <option key={s.id} value={s.name} />)}</datalist>
          </label>
          <label className="field"><span>Emoji (if no photo)</span><input maxLength={4} value={d.emoji} onChange={(e) => setD({ ...d, emoji: e.target.value })} /></label>
        </div>
        <div className="field"><span>Colour</span>
          <div className="swatches">{Object.entries(AD_THEMES).map(([k, [a, b]]) => (
            <button key={k} type="button" className={d.theme === k ? 'on' : ''} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} onClick={() => setD({ ...d, theme: k })} aria-label={k} />
          ))}</div>
        </div>
        <label className="field"><span>Description</span><textarea rows={3} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></label>

        <div className="field"><span>Ticket types (price 0 = free RSVP)</span>
          {types.map((t, i) => (
            <div key={i} className="row-gap">
              <input className="grow" value={t.name} onChange={(e) => setTypes(types.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Regular / VIP / Early bird" />
              <input type="number" min={0} style={{ maxWidth: 100 }} value={t.price} onChange={(e) => setTypes(types.map((x, j) => j === i ? { ...x, price: +e.target.value } : x))} title="Price" />
              <input type="number" min={1} style={{ maxWidth: 100 }} value={t.capacity} onChange={(e) => setTypes(types.map((x, j) => j === i ? { ...x, capacity: +e.target.value } : x))} title="How many available" />
              <button type="button" className="icon-btn sm-icon" onClick={() => setTypes(types.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
            </div>
          ))}
          <div className="row-gap wrap">
            <button type="button" className="link small" onClick={() => setTypes([...types, { id: '', name: 'VIP', price: 50, capacity: 20 }])}>+ Add ticket type</button>
            <span className="tiny muted">Columns: name · price · quantity available</span>
          </div>
        </div>
        <div className="row-gap wrap">
          <label className="field check"><input type="checkbox" checked={!!d.featured} onChange={(e) => setD({ ...d, featured: e.target.checked })} /><span>★ Feature in hero carousel</span></label>
          <label className="field check"><input type="checkbox" checked={d.published !== false} onChange={(e) => setD({ ...d, published: e.target.checked })} /><span>Published (visible to guests)</span></label>
        </div>
        <div className="row-gap">
          {id && <button className="btn btn-ghost danger" onClick={remove}>Delete</button>}
          <button className="btn btn-ghost grow" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary grow" onClick={save} disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Publish event'}</button>
        </div>
      </div>
    </div>
  );
}
