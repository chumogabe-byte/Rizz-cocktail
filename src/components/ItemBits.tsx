import type { MenuItem } from '../types';
import { Art } from './Art';
import { mediaUrl } from '../api';
import { money } from '../config';

/** Price with offer styling: offer price in lime + original struck through. */
export function Price({ item }: { item: MenuItem }) {
  if (item.offerPrice != null && item.offerPrice < item.price) {
    return <span className="price-wrap"><span className="price">{money(item.offerPrice)}</span><s className="price-was">{money(item.price)}</s></span>;
  }
  return <span className="price">{money(item.price)}</span>;
}

export function ItemArt({ item, size }: { item: MenuItem; size: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <div className="item-art">
      <Art emoji={item.emoji} gradient={item.gradient} size={size} img={item.image ? mediaUrl(item.image) : undefined} />
      {item.available === false && <span className="soldout">Sold out</span>}
      {item.available !== false && item.offerPrice != null && item.offerPrice < item.price && <span className="offer-badge">Offer</span>}
    </div>
  );
}
