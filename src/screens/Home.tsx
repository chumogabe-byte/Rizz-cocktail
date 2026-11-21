import { useMemo, useState } from 'react';
import type { Nav } from '../router';
import { CATEGORIES, sectionOf } from '../data/menu';
import { ItemArt, Price } from '../components/ItemBits';
import { AdBanner, HeroSlider } from '../components/Promo';
import { mediaUrl } from '../api';
import { eventBg, fmtDay, priceFrom, upcoming } from './Events';
import { SPACES } from '../data/spaces';
import { actions, cartCount, useStore } from '../store/store';
import { Art } from '../components/Art';
import { Icon } from '../components/Icon';
import { Chip } from '../components/Layout';
import { BAR, money } from '../config';

export function Home({ nav }: { nav: Nav }) {
  const user = useStore((s) => s.user);
  const cart = useStore((s) => s.cart);
  const MENU = useStore((s) => s.menu);
  const offers = MENU.filter((m) => m.available !== false && m.offerPrice != null && m.offerPrice < m.price);
  const favorites = useStore((s) => s.favorites);
  const activeOrder = useStore((s) => s.orders.find((o) => o.customerId === s.customerId && ['new', 'preparing', 'ready'].includes(o.status)));
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'popular' | 'favorites' | 'zero'>('popular');

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return MENU.filter((m) => `${m.name} ${m.description} ${m.tags?.join(' ')}`.toLowerCase().includes(t)).slice(0, 8);
  }, [q]);

  const featured = MENU.filter((m) =>
    filter === 'popular' ? m.popular : filter === 'favorites' ? favorites.includes(m.id) : sectionOf(m.category) === 'soft');

  return (
    <div className="screen">
      <div className="home-head">
        <div>
          <p className="muted small">Hey {user?.name.split(' ')[0]} 👋</p>
          <h1 className="display">What's your <span className="accent">vibe</span><br />tonight?</h1>
        </div>
        <div className="row-gap">
          <button className="icon-btn badge-wrap" onClick={() => nav.go({ name: 'cart' })} aria-label="Cart">
            <Icon name="bag" />
            {cartCount(cart) > 0 && <span className="badge">{cartCount(cart)}</span>}
          </button>
          <button className="avatar-btn" onClick={() => nav.go({ name: 'profile' })} aria-label="Profile">{user?.name.slice(0, 1).toUpperCase()}</button>
        </div>
      </div>

      <div className="search">
        <Icon name="search" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cocktails, food…" />
        {q && <button className="search-clear" onClick={() => setQ('')} aria-label="Clear"><Icon name="x" size={16} /></button>}
      </div>

      {q ? (
        <div className="list">
          {results.length === 0 && <p className="muted center pad">No matches for “{q}”.</p>}
          {results.map((m) => (
            <button key={m.id} className="row-card" onClick={() => nav.go({ name: 'item', id: m.id })}>
              <ItemArt item={m} size="sm" />
              <div className="row-body"><strong>{m.name}</strong><span className="muted small clamp1">{m.description}</span></div>
              <Price item={m} />
            </button>
          ))}
        </div>
      ) : (
        <>
          {activeOrder && (
            <button className="live-banner" onClick={() => nav.go({ name: 'order', id: activeOrder.id })}>
              <span className="pulse" />
              <div><strong>Order {activeOrder.code}</strong><span className="small">{statusLabel(activeOrder.status)}</span></div>
              <span className="small">Track →</span>
            </button>
          )}

          <HeroSlider placement="home" nav={nav} />

          <div className="quick-actions">
            <button className="qa qa-purple" onClick={() => nav.go({ name: 'menu' })}>
              <span className="qa-emoji">🍸</span><strong>Order Drinks & Food</strong><span className="small">To your table or pickup</span>
            </button>
            <button className="qa qa-lime" onClick={() => nav.go({ name: 'book' })}>
              <span className="qa-emoji">📅</span><strong>Book a Space</strong><span className="small">Booths, rooftop, VIP</span>
            </button>
          </div>

          <div className="chips-row">
            <Chip active={filter === 'popular'} onClick={() => setFilter('popular')}>🔥 Popular</Chip>
            <Chip active={filter === 'favorites'} onClick={() => setFilter('favorites')}>♥ Favourites</Chip>
            <Chip active={filter === 'zero'} onClick={() => setFilter('zero')}>🍹 Zero-proof</Chip>
          </div>

          {featured.length === 0 ? (
            <p className="muted pad">Tap the ♥ on any drink to save it here.</p>
          ) : (
            <div className="h-scroll">
              {featured.map((m) => (
                <div key={m.id} className="feature-card" onClick={() => nav.go({ name: 'item', id: m.id })} role="button" tabIndex={0}>
                  <ItemArt item={m} size="lg" />
                  <button className={`fav ${favorites.includes(m.id) ? 'fav-on' : ''}`} aria-label="Favourite"
                    onClick={(e) => { e.stopPropagation(); actions.toggleFavorite(m.id); }}>
                    <Icon name="heart" size={18} fill={favorites.includes(m.id)} />
                  </button>
                  <div className="feature-info">
                    <strong>{m.name}</strong>
                    <div className="feature-meta"><span className="small muted">{m.tags?.[0] ?? CATEGORIES.find(c => c.id === m.category)?.label}</span><Price item={m} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {offers.length > 0 && (
            <>
              <SectionHead title="🔥 Today's offers" action="Menu" onAction={() => nav.go({ name: 'menu' })} />
              <div className="h-scroll">
                {offers.map((m) => (
                  <button key={m.id} className="offer-card" onClick={() => nav.go({ name: 'item', id: m.id })}>
                    <ItemArt item={m} size="md" />
                    <strong className="clamp1">{m.name}</strong>
                    <Price item={m} />
                  </button>
                ))}
              </div>
            </>
          )}

          <EventsStrip nav={nav} />

          <RewardsCard nav={nav} />

          <SectionHead title="Browse menu" action="See all" onAction={() => nav.go({ name: 'menu' })} />
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <button key={c.id} className="cat-tile" onClick={() => nav.go({ name: 'menu', category: c.id })}>
                <span>{c.emoji}</span><small>{c.label}</small>
              </button>
            ))}
          </div>

          <AdBanner placement="home" nav={nav} index={1} />

          <SocialStrip nav={nav} />

          <SectionHead title="Reserve a space" action="Book" onAction={() => nav.go({ name: 'book' })} />
          <div className="list">
            {SPACES.slice(0, 3).map((s) => (
              <button key={s.id} className="row-card" onClick={() => nav.go({ name: 'book', spaceId: s.id })}>
                <Art emoji={s.emoji} gradient={s.gradient} size="sm" />
                <div className="row-body">
                  <strong>{s.name}</strong>
                  <span className="muted small"><Icon name="users" size={13} /> {s.capacity[0]}–{s.capacity[1]} guests · {s.minSpend ? `Min ${money(s.minSpend)}` : 'No minimum'}</span>
                </div>
                <span className="pill">Book</span>
              </button>
            ))}
          </div>

          <div className="info-card">
            <div><Icon name="pin" size={16} /> {BAR.address}</div>
            <div><Icon name="clock" size={16} /> Open daily {BAR.hours}</div>
          </div>
        </>
      )}
    </div>
  );
}

function EventsStrip({ nav }: { nav: Nav }) {
  const events = upcoming(useStore((s) => s.events)).slice(0, 8);
  if (!events.length) return null;
  return (
    <>
      <SectionHead title="🎉 Upcoming events" action="All events" onAction={() => nav.go({ name: 'events' })} />
      <div className="h-scroll">
        {events.map((e) => (
          <button key={e.id} className="tile tile-sm" style={{ background: eventBg(e) }} onClick={() => nav.go({ name: 'event', id: e.id })}>
            {!e.image && <span className="tile-emoji">{e.emoji}</span>}
            <span className="tile-date"><small>{fmtDay(e.startsAt).dow}</small><b>{fmtDay(e.startsAt).day}</b></span>
            <span className="tile-copy"><strong>{e.title}</strong><small>{priceFrom(e)}</small></span>
          </button>
        ))}
      </div>
    </>
  );
}

function RewardsCard({ nav }: { nav: Nav }) {
  const me = useStore((s) => s.me);
  const settings = useStore((s) => s.settings);
  const codes = useStore((s) => s.vouchers).filter((v) => v.source === 'reward' && v.active && v.redemptions.length === 0);
  const pts = me?.points ?? 0;
  const t = settings.rewardThreshold || 100;
  return (
    <button className="rewards-card" onClick={() => nav.go({ name: 'rewards' })}>
      <div className="row-body">
        <small>Rizz Rewards</small>
        <strong>{pts} pts {codes.length > 0 && <span className="tag tag-lime">{codes.length} code{codes.length > 1 ? 's' : ''} ready</span>}</strong>
        <span className="tiny">{t - (pts % t)} pts to your next {money(settings.rewardValue)} reward</span>
        <div className="loyalty-bar"><span style={{ width: `${((pts % t) / t) * 100}%` }} /></div>
      </div>
      <span className="rewards-gift">🎁</span>
    </button>
  );
}

function SocialStrip({ nav }: { nav: Nav }) {
  const posts = useStore((s) => s.posts).filter((p) => !p.hidden).slice(0, 8);
  return (
    <>
      <SectionHead title="Moments at Rizz" action="Open feed" onAction={() => nav.go({ name: 'social' })} />
      <div className="h-scroll">
        <button className="moment-tile moment-add" onClick={() => nav.go({ name: 'social' })}><span>📸</span><small>Share yours</small></button>
        {posts.map((p) => (
          <button key={p.id} className="moment-tile" onClick={() => nav.go({ name: 'social' })} style={{ backgroundImage: `url("${mediaUrl(p.image)}")` }}>
            <small>{p.author.split(' ')[0]} · ♥ {p.likes.length}</small>
          </button>
        ))}
      </div>
    </>
  );
}

export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action && <button className="link" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function statusLabel(s: string) {
  return ({ new: 'Order received', preparing: 'Being prepared', ready: 'Ready!', served: 'Served', cancelled: 'Cancelled' } as Record<string, string>)[s] ?? s;
}
