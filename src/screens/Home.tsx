import { useMemo, useState } from 'react';
import type { Nav } from '../router';
import { CATEGORIES, MENU } from '../data/menu';
import { SPACES } from '../data/spaces';
import { actions, cartCount, useStore } from '../store/store';
import { Art } from '../components/Art';
import { Icon } from '../components/Icon';
import { Chip } from '../components/Layout';
import { BAR, money } from '../config';

export function Home({ nav }: { nav: Nav }) {
  const user = useStore((s) => s.user);
  const cart = useStore((s) => s.cart);
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
    filter === 'popular' ? m.popular : filter === 'favorites' ? favorites.includes(m.id) : m.category === 'mocktail');

  return (
    <div className="screen">
      <div className="home-head">
        <div>
          <p className="muted small">Hey {user?.name.split(' ')[0]} 👋</p>
          <h1 className="display">What's your <span className="accent">vibe</span><br />tonight?</h1>
        </div>
        <button className="icon-btn badge-wrap" onClick={() => nav.go({ name: 'cart' })} aria-label="Cart">
          <Icon name="bag" />
          {cartCount(cart) > 0 && <span className="badge">{cartCount(cart)}</span>}
        </button>
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
              <Art emoji={m.emoji} gradient={m.gradient} size="sm" />
              <div className="row-body"><strong>{m.name}</strong><span className="muted small clamp1">{m.description}</span></div>
              <span className="price">{money(m.price)}</span>
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
                  <Art emoji={m.emoji} gradient={m.gradient} size="lg" />
                  <button className={`fav ${favorites.includes(m.id) ? 'fav-on' : ''}`} aria-label="Favourite"
                    onClick={(e) => { e.stopPropagation(); actions.toggleFavorite(m.id); }}>
                    <Icon name="heart" size={18} fill={favorites.includes(m.id)} />
                  </button>
                  <div className="feature-info">
                    <strong>{m.name}</strong>
                    <div className="feature-meta"><span className="small muted">{m.tags?.[0] ?? CATEGORIES.find(c => c.id === m.category)?.label}</span><span className="price">{money(m.price)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <SectionHead title="Browse menu" action="See all" onAction={() => nav.go({ name: 'menu' })} />
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <button key={c.id} className="cat-tile" onClick={() => nav.go({ name: 'menu', category: c.id })}>
                <span>{c.emoji}</span><small>{c.label}</small>
              </button>
            ))}
          </div>

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
