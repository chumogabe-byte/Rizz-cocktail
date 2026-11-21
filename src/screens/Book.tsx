import { useMemo, useState } from 'react';
import type { Nav } from '../router';
import { OCCASIONS, SPACES, TIME_SLOTS } from '../data/spaces';
import { actions, useStore } from '../store/store';
import { Art } from '../components/Art';
import { Icon } from '../components/Icon';
import { Chip, Stepper, TopBar } from '../components/Layout';
import { money } from '../config';

function nextDays(n: number) {
  const out: { iso: string; dow: string; day: number }[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    const iso = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    out.push({ iso, dow: i === 0 ? 'Today' : x.toLocaleDateString(undefined, { weekday: 'short' }), day: x.getDate() });
  }
  return out;
}

export function Book({ nav, spaceId }: { nav: Nav; spaceId?: string }) {
  const user = useStore((s) => s.user);
  const bookings = useStore((s) => s.bookings);
  const days = useMemo(() => nextDays(14), []);
  const [space, setSpace] = useState(spaceId ?? SPACES[1].id);
  const [date, setDate] = useState(days[0].iso);
  const [time, setTime] = useState('20:00');
  const [duration, setDuration] = useState(2);
  const sp = SPACES.find((s) => s.id === space)!;
  const [guests, setGuests] = useState(Math.max(2, sp.capacity[0]));
  const [occasion, setOccasion] = useState('');
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // A slot is "taken" if a confirmed/pending booking exists for the same space/date/time.
  // Bar counter & rooftop allow several parties at once.
  const multi = space === 'bar-counter' || space === 'rooftop';
  const taken = (t: string) => !multi && bookings.some((b) => b.spaceId === space && b.date === date && b.time === t && ['pending', 'confirmed', 'checked-in'].includes(b.status));
  const isPast = (t: string) => {
    if (date !== days[0].iso) return false;
    const h = +t.slice(0, 2);
    if (h < 4) return false; // after-midnight slots belong to tonight
    return h <= new Date().getHours();
  };

  const pickSpace = (id: string) => {
    setSpace(id);
    const s = SPACES.find((x) => x.id === id)!;
    setGuests((g) => Math.min(s.capacity[1], Math.max(s.capacity[0], g)));
  };

  const submit = async () => {
    if (!name.trim() || !phone.trim()) return setErr('Please add your name and phone so we can confirm.');
    if (guests < sp.capacity[0] || guests > sp.capacity[1]) return setErr(`${sp.name} fits ${sp.capacity[0]}–${sp.capacity[1]} guests.`);
    if (taken(time) || isPast(time)) return setErr('That time is not available — pick another slot.');
    setBusy(true); setErr('');
    try {
      const b = await actions.createBooking({ spaceId: sp.id, spaceName: sp.name, date, time, durationHrs: duration, guests,
        customer: name.trim(), phone: phone.trim(), occasion: occasion || undefined, notes: notes.trim() || undefined });
      nav.go({ name: 'booking', id: b.id });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen with-cta">
      <TopBar title="Book a space" onBack={nav.back} />

      <div className="h-scroll spaces">
        {SPACES.map((s) => (
          <button key={s.id} className={`space-card ${space === s.id ? 'on' : ''}`} onClick={() => pickSpace(s.id)}>
            <Art emoji={s.emoji} gradient={s.gradient} size="md" />
            <strong>{s.name}</strong>
            <span className="tiny muted">{s.capacity[0]}–{s.capacity[1]} guests</span>
          </button>
        ))}
      </div>

      <div className="card space-info">
        <p className="muted small">{sp.description}</p>
        <div className="chips-wrap">{sp.perks.map((p) => <span key={p} className="tag tag-purple">{p}</span>)}</div>
        <p className="small">{sp.minSpend ? <>Minimum spend <b>{money(sp.minSpend)}</b> — redeemable on drinks & food</> : <>No minimum spend</>}</p>
      </div>

      <h3 className="label">Date</h3>
      <div className="h-scroll dates">
        {days.map((d) => (
          <button key={d.iso} className={`date-pill ${date === d.iso ? 'on' : ''}`} onClick={() => setDate(d.iso)}>
            <small>{d.dow}</small><strong>{d.day}</strong>
          </button>
        ))}
      </div>

      <h3 className="label">Arrival time</h3>
      <div className="slot-grid">
        {TIME_SLOTS.map((t) => {
          const off = taken(t) || isPast(t);
          return <button key={t} disabled={off} className={`slot ${time === t ? 'on' : ''}`} onClick={() => setTime(t)}>{t}{taken(t) && <small>Booked</small>}</button>;
        })}
      </div>

      <div className="card two-col">
        <div><h3 className="label"><Icon name="users" size={14} /> Guests</h3><Stepper value={guests} onChange={(n) => setGuests(Math.min(sp.capacity[1], n))} min={sp.capacity[0]} /></div>
        <div><h3 className="label"><Icon name="clock" size={14} /> Hours</h3><Stepper value={duration} onChange={(n) => setDuration(Math.min(8, n))} min={1} /></div>
      </div>

      <h3 className="label">Occasion</h3>
      <div className="chips-wrap">
        {OCCASIONS.map((o) => <Chip key={o} active={occasion === o} onClick={() => setOccasion(occasion === o ? '' : o)}>{o}</Chip>)}
      </div>

      <div className="card stack">
        <label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></label>
        <label className="field"><span>Requests (optional)</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Birthday cake, decorations, accessibility…" /></label>
      </div>

      {err && <p className="error">{err}</p>}
      <div className="sticky-cta">
        <button className="btn btn-lime grow" onClick={submit} disabled={busy}>{busy ? 'Sending…' : <>Request booking · {time}</>}</button>
      </div>
    </div>
  );
}
