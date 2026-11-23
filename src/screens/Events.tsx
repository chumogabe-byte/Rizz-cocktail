import { useState } from 'react';
import type { Nav } from '../router';
import type { Ad, BarEvent } from '../types';
import { useStore } from '../store/store';
import { mediaUrl } from '../api';
import { Chip, Empty, TopBar } from '../components/Layout';
import { AD_THEMES, HeroSlider, darkText, useAdAction, type Slide } from '../components/Promo';
import { Icon } from '../components/Icon';
import { money } from '../config';

export const fmtWhen = (t: number) =>
  new Date(t).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
export const fmtDay = (t: number) => {
  const d = new Date(t);
  return { dow: d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'short' }).toUpperCase(), day: Number(d.toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric' })) };
};
export function priceFrom(e: BarEvent) {
  const avail = e.ticketTypes.filter((t) => (e.sold[t.id] || 0) < t.capacity);
  if (!avail.length) return 'Sold out';
  const min = Math.min(...avail.map((t) => t.price));
  return min === 0 ? (avail.every((t) => t.price === 0) ? 'Free' : 'Free entry') : `From ${money(min)}`;
}
export const eventBg = (e: { theme: string; image?: string }, overlay = true) => {
  const [a, b] = AD_THEMES[e.theme] ?? AD_THEMES.purple;
  return e.image
    ? `${overlay ? 'linear-gradient(180deg, rgba(10,8,20,0) 35%, rgba(10,8,20,.9) 100%), ' : ''}center/cover url("${mediaUrl(e.image)}")`
    : `radial-gradient(120% 120% at 30% 15%, ${a} 0%, ${b} 70%, #0b0816 100%)`;
};
/** Weekly events roll forward to their next date (mirrors the server, so built-in data stays current offline too). */
export function rollWeekly(e: BarEvent): BarEvent {
  if (e.repeat !== 'weekly') return e;
  const len = (e.endsAt || e.startsAt + 3 * 3600e3) - e.startsAt;
  let start = e.startsAt;
  while (start + len < Date.now()) start += 7 * 864e5;
  return start === e.startsAt ? e : { ...e, startsAt: start, endsAt: start + len, sold: {} };
}
export const upcoming = (events: BarEvent[]) =>
  events.map(rollWeekly).filter((e) => (e.endsAt || e.startsAt) > Date.now()).sort((a, b) => a.startsAt - b.startsAt);

export function Events({ nav }: { nav: Nav }) {
  const events = upcoming(useStore((s) => s.events));
  // offers grid: skip ads that only point at an event (the event's own card is already shown)
  const ads = useStore((s) => s.ads).filter((a) => a.active && a.cta.type !== 'event');
  const myTickets = useStore((s) => s.tickets).filter((t) => t.status !== 'cancelled' && t.startsAt > Date.now() - 6 * 3600e3).length;
  const [filter, setFilter] = useState<'all' | 'events' | 'offers'>('all');
  const act = useAdAction(nav);

  const featured: Slide[] = events.filter((e) => e.featured).map((e) => ({
    key: e.id, kicker: `${fmtWhen(e.startsAt)} · ${e.location}`, title: e.title, subtitle: e.subtitle,
    cta: priceFrom(e) === 'Sold out' ? 'Sold out' : 'Get tickets', background: eventBg(e).replace('180deg', '90deg'),
    emoji: e.image ? undefined : e.emoji, ink: !e.image && darkText(e.theme), onClick: () => nav.go({ name: 'event', id: e.id }),
  }));

  // Interleave events and offers into one stacked 2-column grid
  type Tile = { kind: 'event'; e: BarEvent } | { kind: 'offer'; a: Ad };
  const ev: Tile[] = filter !== 'offers' ? events.map((e) => ({ kind: 'event', e })) : [];
  const of: Tile[] = filter !== 'events' ? ads.map((a) => ({ kind: 'offer', a })) : [];
  const tiles: Tile[] = [];
  while (ev.length || of.length) { tiles.push(...ev.splice(0, 3)); tiles.push(...of.splice(0, 1)); }

  return (
    <div className="screen">
      <TopBar title="Events & Offers" right={
        <button className="icon-btn badge-wrap" onClick={() => nav.go({ name: 'tickets' })} aria-label="My tickets">
          <Icon name="ticket" />{myTickets > 0 && <span className="badge">{myTickets}</span>}
        </button>} />

      <HeroSlider placement="events" nav={nav} extra={featured} />

      <div className="chips-row">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>✨ All</Chip>
        <Chip active={filter === 'events'} onClick={() => setFilter('events')}>🎉 Events</Chip>
        <Chip active={filter === 'offers'} onClick={() => setFilter('offers')}>🔥 Offers</Chip>
        <Chip onClick={() => nav.go({ name: 'tickets' })}>🎟️ My tickets{myTickets ? ` (${myTickets})` : ''}</Chip>
      </div>

      {tiles.length === 0 && <Empty emoji="🗓️" title="Nothing scheduled yet" text="New events and offers land here first — check back soon." />}
      <div className="tile-grid">
        {tiles.map((t) => t.kind === 'event' ? (
          <button key={t.e.id} className="tile" style={{ background: eventBg(t.e) }} onClick={() => nav.go({ name: 'event', id: t.e.id })}>
            {!t.e.image && <span className="tile-emoji">{t.e.emoji}</span>}
            <span className="tile-date"><small>{fmtDay(t.e.startsAt).dow}</small><b>{fmtDay(t.e.startsAt).day}</b></span>
            <span className={`tile-price ${priceFrom(t.e) === 'Sold out' ? 'out' : ''}`}>{priceFrom(t.e)}</span>
            {t.e.repeat === 'weekly' && <span className="tile-repeat">↻ Every {new Date(t.e.startsAt).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long' })}</span>}
            <span className="tile-copy"><strong>{t.e.title}</strong><small>{new Date(t.e.startsAt).toLocaleTimeString('en-GB', { timeZone: 'Africa/Nairobi', hour: 'numeric', minute: '2-digit', hour12: true })} · {t.e.location}</small></span>
          </button>
        ) : (
          <button key={t.a.id} className={`tile tile-offer ${!t.a.image && darkText(t.a.theme) ? 'ink' : ''}`} style={{ background: eventBg(t.a) }} onClick={() => act(t.a)}>
            {!t.a.image && <span className="tile-emoji">{t.a.emoji}</span>}
            <span className="tile-price offer">Offer</span>
            <span className="tile-copy"><strong>{t.a.title}</strong>{t.a.subtitle && <small>{t.a.subtitle}</small>}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
