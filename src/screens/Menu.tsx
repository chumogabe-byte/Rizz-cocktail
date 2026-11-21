import { useEffect, useRef, useState } from 'react';
import type { Nav } from '../router';
import type { Category } from '../types';
import { CATEGORIES, MENU } from '../data/menu';
import { actions, cartCount, cartSubtotal, useStore } from '../store/store';
import { Art } from '../components/Art';
import { Icon } from '../components/Icon';
import { Chip, TopBar } from '../components/Layout';
import { money } from '../config';

export function Menu({ nav, initial }: { nav: Nav; initial?: Category }) {
  const [cat, setCat] = useState<Category>(initial ?? 'signature');
  const cart = useStore((s) => s.cart);
  const chipsRef = useRef<HTMLDivElement>(null);
  const items = MENU.filter((m) => m.category === cat);

  useEffect(() => {
    chipsRef.current?.querySelector('.chip-active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [cat]);

  return (
    <div className="screen">
      <TopBar title="Menu" right={
        <button className="icon-btn badge-wrap" onClick={() => nav.go({ name: 'cart' })} aria-label="Cart">
          <Icon name="bag" />{cartCount(cart) > 0 && <span className="badge">{cartCount(cart)}</span>}
        </button>} />
      <div className="chips-row sticky" ref={chipsRef}>
        {CATEGORIES.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.emoji} {c.label}</Chip>)}
      </div>
      <div className="list">
        {items.map((m) => (
          <div key={m.id} className="menu-row" onClick={() => nav.go({ name: 'item', id: m.id })} role="button" tabIndex={0}>
            <Art emoji={m.emoji} gradient={m.gradient} size="md" />
            <div className="row-body">
              <div className="menu-row-title"><strong>{m.name}</strong>{m.popular && <span className="tag tag-lime">Hot</span>}</div>
              <span className="muted small clamp2">{m.description}</span>
              <div className="menu-row-foot">
                <span className="price">{money(m.price)}</span>
                {m.abv && <span className="tiny muted">{m.abv} ABV</span>}
                {m.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
              </div>
            </div>
            <button className="add-btn" aria-label={`Add ${m.name}`}
              onClick={(e) => {
                e.stopPropagation();
                if (m.options?.length) return nav.go({ name: 'item', id: m.id });
                actions.addToCart({ itemId: m.id, name: m.name, unitPrice: m.price, qty: 1, choices: [] });
              }}>
              <Icon name="plus" size={18} />
            </button>
          </div>
        ))}
      </div>
      {cart.length > 0 && <CartBar count={cartCount(cart)} total={cartSubtotal(cart)} onClick={() => nav.go({ name: 'cart' })} />}
    </div>
  );
}

export function CartBar({ count, total, onClick }: { count: number; total: number; onClick: () => void }) {
  return (
    <button className="cart-bar" onClick={onClick}>
      <span className="cart-bar-count">{count}</span>
      <span>View order</span>
      <strong>{money(total)}</strong>
    </button>
  );
}
