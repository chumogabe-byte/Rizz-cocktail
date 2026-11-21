import type { Category, MenuItem, Section } from '../types';
import { getState } from '../store/store';

export const SECTIONS: { id: Section; label: string; emoji: string }[] = [
  { id: 'alcoholic', label: 'Alcoholic', emoji: '🍸' },
  { id: 'soft', label: 'Soft drinks', emoji: '🥤' },
  { id: 'food', label: 'Food', emoji: '🍔' },
];

export const CATEGORIES: { id: Category; label: string; emoji: string; section: Section }[] = [
  { id: 'cocktails', label: 'Cocktails', emoji: '🍸', section: 'alcoholic' },
  { id: 'vodka', label: 'Vodka', emoji: '🧊', section: 'alcoholic' },
  { id: 'gin', label: 'Gin', emoji: '🌿', section: 'alcoholic' },
  { id: 'whiskey', label: 'Whiskey', emoji: '🥃', section: 'alcoholic' },
  { id: 'rum', label: 'Rum', emoji: '🏴‍☠️', section: 'alcoholic' },
  { id: 'tequila', label: 'Tequila', emoji: '🌵', section: 'alcoholic' },
  { id: 'wine', label: 'Wine', emoji: '🍷', section: 'alcoholic' },
  { id: 'champagne', label: 'Champagne', emoji: '🍾', section: 'alcoholic' },
  { id: 'beer', label: 'Beer & Cider', emoji: '🍺', section: 'alcoholic' },
  { id: 'liqueurs', label: 'Liqueurs', emoji: '🍯', section: 'alcoholic' },
  { id: 'shots', label: 'Shots', emoji: '💥', section: 'alcoholic' },
  { id: 'mocktails', label: 'Mocktails', emoji: '🍹', section: 'soft' },
  { id: 'soft', label: 'Sodas & Juices', emoji: '🥤', section: 'soft' },
  { id: 'small-plates', label: 'Small Plates', emoji: '🍢', section: 'food' },
  { id: 'mains', label: 'Mains', emoji: '🍔', section: 'food' },
  { id: 'desserts', label: 'Desserts', emoji: '🍫', section: 'food' },
];

export const sectionOf = (c: Category) => CATEGORIES.find((x) => x.id === c)!.section;

// ---- option presets ----
const tot = (bottle: number) => ({
  label: 'Serve',
  choices: [{ name: 'Single (25ml)', price: 0 }, { name: 'Double (50ml)', price: 0 }, { name: 'Bottle (750ml)', price: bottle }],
});
const mixer = {
  label: 'How',
  choices: [{ name: 'Neat', price: 0 }, { name: 'On the rocks', price: 0 }, { name: 'With mixer', price: 2 }],
};
const spirit = {
  label: 'Spirit upgrade',
  choices: [{ name: 'House', price: 0 }, { name: 'Premium', price: 4 }, { name: 'Top shelf', price: 8 }],
};
const glassBottle = (bottle: number) => ({ label: 'Pour', choices: [{ name: 'Glass', price: 0 }, { name: 'Bottle', price: bottle }] });

// The menu itself lives on the server (editable by staff). This seed is the starting menu and the
// offline fallback — see server/seed-menu.json.
import seed from '../../server/seed-menu.json';
export const SEED_MENU = seed as MenuItem[];

/** Option presets used by the staff menu editor. */
export const OPTION_PRESETS = {
  spirit: (bottle: number) => [tot(bottle), mixer],
  upgrade: () => [spirit],
  pour: (bottle: number) => [glassBottle(bottle)],
};

/** Unit price for an item + selected choice indexes ("Double" doubles a spirit tot). */
export function unitPrice(item: MenuItem, sel: number[]) {
  const basePrice = item.offerPrice ?? item.price;
  let base = basePrice;
  let extra = 0;
  item.options?.forEach((o, i) => {
    const c = o.choices[sel[i] ?? 0];
    if (!c) return;
    if (c.name.startsWith('Double')) base = basePrice * 2;
    else if (c.name.startsWith('Bottle (')) base = 0; // bottle price replaces the tot price
    extra += c.price;
  });
  return base + extra;
}

export const getItem = (id: string) => getState().menu.find((m) => m.id === id);
