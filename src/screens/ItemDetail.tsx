import { useState } from 'react';
import type { Nav } from '../router';
import { CATEGORIES, unitPrice } from '../data/menu';
import { ItemArt, Price } from '../components/ItemBits';
import { actions, useStore } from '../store/store';
import { Icon } from '../components/Icon';
import { Stepper } from '../components/Layout';
import { money } from '../config';
import { flyToCart } from '../fx';
import { inWindow, windowLabel } from '../time';

export function ItemDetail({ nav, id }: { nav: Nav; id: string }) {
  const item = useStore((s) => s.menu.find((m) => m.id === id));
  const fav = useStore((s) => s.favorites.includes(id));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [sel, setSel] = useState<number[]>(() => item?.options?.map(() => 0) ?? []);
  const [added, setAdded] = useState(false);
  if (!item) return null;

  const unit = unitPrice(item, sel);

  const add = (e: React.MouseEvent<HTMLButtonElement>) => {
    flyToCart(e.currentTarget, item.emoji);
    const choices = item.options?.map((o, i) => o.choices[sel[i]].name) ?? [];
    actions.addToCart({ itemId: item.id, name: item.name, unitPrice: unit, qty, choices, note: note.trim() || undefined });
    setAdded(true);
    setTimeout(() => nav.back(), 450);
  };

  return (
    <div className="screen detail">
      <div className="detail-hero">
        <ItemArt item={item} size="xl" />
        <div className="detail-hero-bar">
          <button className="icon-btn glass" onClick={nav.back} aria-label="Back"><Icon name="back" /></button>
          <button className={`icon-btn glass ${fav ? 'fav-on' : ''}`} onClick={() => actions.toggleFavorite(id)} aria-label="Favourite">
            <Icon name="heart" fill={fav} />
          </button>
        </div>
      </div>
      <div className="detail-body">
        <span className="tag tag-purple">{CATEGORIES.find((c) => c.id === item.category)?.label}</span>
        <h1 className="display-sm">{item.name}</h1>
        <div className="meta-row">
          {item.abv && <span><Icon name="sparkle" size={14} /> {item.abv} ABV</span>}
          {item.popular && <span><Icon name="star" size={14} fill /> Crowd favourite</span>}
          {item.tags?.map((t) => <span key={t}>{t}</span>)}
        </div>
        <Price item={item} />
        {item.window && <p className={`small ${inWindow(item.window) ? 'plus' : 'note'}`}>🕑 Available {windowLabel(item.window)} (Kenya time){inWindow(item.window) ? ' — on now!' : ' — not available right now'}</p>}
        {item.requiresBottle && <p className="small note">🍾 Order together with any bottle (e.g. a spirit "Bottle" option, champagne bottle or bottle bundle).</p>}
        <p className="muted">{item.description}</p>

        {item.options?.map((o, oi) => (
          <div key={o.label} className="opt-group">
            <h3>{o.label}</h3>
            <div className="opt-list">
              {o.choices.map((c, ci) => (
                <button key={c.name} className={`opt ${sel[oi] === ci ? 'opt-on' : ''}`}
                  onClick={() => setSel(sel.map((v, i) => (i === oi ? ci : v)))}>
                  <span>{c.name}</span>{c.name.startsWith('Double') ? <span className="small">{money(item.price * 2)}</span> : c.name.startsWith('Bottle (') ? <span className="small">{money(c.price)}</span> : c.price > 0 && <span className="small">+{money(c.price)}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="opt-group">
          <h3>Special requests</h3>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Less ice, no garnish, allergies…" rows={2} />
        </div>
      </div>
      <div className="sticky-cta">
        <Stepper value={qty} onChange={setQty} min={1} />
        <button className="btn btn-primary grow" onClick={add} disabled={added || item.available === false || !inWindow(item.window)}>
          {item.available === false ? 'Sold out' : !inWindow(item.window) ? 'Not available right now' : added ? <><Icon name="check" size={18} /> Added</> : <>Add · {money(unit * qty)}</>}
        </button>
      </div>
    </div>
  );
}
