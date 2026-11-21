import { Fragment, useEffect, useRef, useState } from 'react';
import type { Nav } from '../router';
import type { Category, Section } from '../types';
import { CATEGORIES, SECTIONS, sectionOf, unitPrice } from '../data/menu';
import { ItemArt, Price } from '../components/ItemBits';
import { actions, cartCount, cartSubtotal, useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { Chip, TopBar } from '../components/Layout';
import { AdBanner, HeroSlider } from '../components/Promo';
import { money } from '../config';

export function Menu({ nav, initial }: { nav: Nav; initial?: Category }) {
  const [section, setSection] = useState<Section>(initial ? sectionOf(initial) : 'alcoholic');
  const [cat, setCat] = useState<Category>(initial ?? 'cocktails');
  const cart = useStore((s) => s.cart);
  const MENU = useStore((s) => s.menu);
  const chipsRef = useRef<HTMLDivElement>(null);
  const cats = CATEGORIES.filter((c) => c.section === section);
  const items = MENU.filter((m) => m.category === cat);

  useEffect(() => {
    chipsRef.current?.querySelector('.chip-active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [cat]);

  const pickSection = (s: Section) => {
    setSection(s);
    setCat(CATEGORIES.find((c) => c.section === s)!.id);
  };

  return (
    <div className="screen">
      <TopBar title="Menu" right={
        <button className="icon-btn badge-wrap" onClick={() => nav.go({ name: 'cart' })} aria-label="Cart">
          <Icon name="bag" />{cartCount(cart) > 0 && <span className="badge">{cartCount(cart)}</span>}
        </button>} />

      <HeroSlider placement="menu" nav={nav} />

      <div className="seg">
        {SECTIONS.map((s) => (
          <button key={s.id} className={section === s.id ? 'on' : ''} onClick={() => pickSection(s.id)}>{s.emoji} {s.label}</button>
        ))}
      </div>

      <div className="chips-row sticky" ref={chipsRef}>
        {cats.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.emoji} {c.label}</Chip>)}
      </div>

      {section === 'alcoholic' && <p className="tiny muted">🔞 Alcohol is served to guests aged 18+ only. Please drink responsibly.</p>}

      <div className="list">
        {items.map((m, i) => (
          <Fragment key={m.id}>
            <div className={`menu-row ${m.available === false ? 'is-soldout' : ''}`} onClick={() => nav.go({ name: 'item', id: m.id })} role="button" tabIndex={0}>
              <ItemArt item={m} size="md" />
              <div className="row-body">
                <div className="menu-row-title"><strong>{m.name}</strong>{m.popular && <span className="tag tag-lime">Hot</span>}</div>
                <span className="muted small clamp2">{m.description}</span>
                <div className="menu-row-foot">
                  <Price item={m} />
                  {m.options?.[0]?.choices.some((c) => c.name.startsWith('Single')) && <span className="tiny muted">per single</span>}
                  {m.abv && <span className="tiny muted">{m.abv} ABV</span>}
                  {m.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>
              <button className="add-btn" aria-label={`Add ${m.name}`} disabled={m.available === false}
                onClick={(e) => {
                  e.stopPropagation();
                  if (m.options?.length) return nav.go({ name: 'item', id: m.id });
                  actions.addToCart({ itemId: m.id, name: m.name, unitPrice: unitPrice(m, []), qty: 1, choices: [] });
                }}>
                <Icon name="plus" size={18} />
              </button>
            </div>
            {i === 2 && <AdBanner placement="menu" nav={nav} index={i} />}
          </Fragment>
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
