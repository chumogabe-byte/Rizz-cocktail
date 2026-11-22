/**
 * Content packs: promos, events and menu items added to the live database once.
 * Each entry has a fixed id; it is inserted if missing and remembered in db.seeded, so if the admin later
 * edits or deletes it, it is never re-added. Fresh installs and existing servers both get it on start.
 */

const nextDow = (dow, hh, mm = 0) => {
  const d = new Date();
  // compute in Nairobi (UTC+3, no DST) — build the date in UTC then shift
  const nowEAT = new Date(d.getTime() + 3 * 3600e3);
  let add = (dow - nowEAT.getUTCDay() + 7) % 7;
  const t = Date.UTC(nowEAT.getUTCFullYear(), nowEAT.getUTCMonth(), nowEAT.getUTCDate() + add, hh - 3, mm);
  return t < Date.now() ? t + 7 * 864e5 : t;
};

// Rizz XP × Homeboys: Saturday 12 December 2026, 9 PM Kenya time (18:00 UTC)
const RIZZ_XP_START = Date.UTC(2026, 11, 12, 18, 0);

const classicCocktails = ['Mojito', 'Margarita', 'Negroni', 'Old Fashioned', 'Espresso Martini', 'Cosmopolitan', 'Daiquiri', 'Whiskey Sour'];
const cocktailChoice = (n) => ({ label: `Cocktail ${n}`, choices: classicCocktails.map((name) => ({ name, price: 0 })) });
const selectBottles = {
  label: 'Choose your bottle',
  choices: [
    { name: 'Smirnoff Vodka 750ml', price: 0 },
    { name: "Gordon's Gin 750ml", price: 0 },
    { name: 'Captain Morgan 750ml', price: 0 },
    { name: 'Jameson 750ml', price: 1000 },
    { name: "Jack Daniel's 750ml", price: 1500 },
    { name: 'Johnnie Walker Black 750ml', price: 2500 },
  ],
};
const shishaFlavour = {
  label: 'Shisha flavour',
  choices: ['Double Apple', 'Mint', 'Grape Mint', 'Watermelon', 'Blueberry', 'Lemon Mint', 'Rizz House Mix'].map((name) => ({ name, price: 0 })),
};

export const CONTENT_PACK = {
  menu: [
    // --- Happy hour trio: 3 classic cocktails for 1,000, 2–5 PM only ---
    { id: 'hh-trio', name: 'Happy Hour Trio — 3 Cocktails', category: 'bundles', price: 1000, popular: true,
      description: 'Any 3 classic cocktails for KSh 1,000. Happy hour only, 2–5 PM daily.', emoji: '🍹', gradient: ['#F472B6', '#5B0F35'],
      tags: ['Happy hour', '3 for 1,000'], options: [cocktailChoice(1), cocktailChoice(2), cocktailChoice(3)],
      window: { days: [0, 1, 2, 3, 4, 5, 6], start: '14:00', end: '17:00' }, available: true },
    // --- Chinese platter + select bottle bundle ---
    { id: 'chinese-platter', name: 'Chinese Sharing Platter', category: 'small-plates', price: 3200,
      description: 'Spring rolls, salt & pepper wings, prawn toast, dim sum and egg-fried rice. Serves 3–4.', emoji: '🥡', gradient: ['#EF4444', '#3F0A0A'], available: true },
    { id: 'chinese-bottle-bundle', name: 'Chinese Platter + Select Bottle', category: 'bundles', price: 8500, offerPrice: 6900, popular: true, bottle: true,
      description: 'Our Chinese Sharing Platter with a bottle of your choice and mixers. Bottle upgrades available.', emoji: '🥢', gradient: ['#FBBF24', '#7F1D1D'],
      tags: ['Bundle', 'Serves 4'], options: [selectBottles], available: true },
    // --- Shisha + drinks bundles (happy hour applies) ---
    { id: 'shisha', name: 'Shisha', category: 'shisha', price: 1500, description: 'Premium shisha, fresh coals all night.', emoji: '💨', gradient: ['#A78BFA', '#2E1065'],
      options: [shishaFlavour], available: true },
    { id: 'shisha-cocktails', name: 'Shisha + 2 Cocktails', category: 'shisha', price: 3800, popular: true,
      description: 'One shisha and any two signature or classic cocktails.', emoji: '💨', gradient: ['#C084FC', '#4A044E'], tags: ['Bundle'], options: [shishaFlavour], available: true },
    { id: 'shisha-beers', name: 'Shisha + Bucket of 5 Beers', category: 'shisha', price: 3900,
      description: 'One shisha with a bucket of five ice-cold beers.', emoji: '🍻', gradient: ['#FBBF24', '#3F2A00'], tags: ['Bundle'], options: [shishaFlavour], available: true },
    { id: 'shisha-prosecco', name: 'Shisha + Bottle of Prosecco', category: 'shisha', price: 4800,
      description: 'One shisha and a bottle of chilled prosecco.', emoji: '🥂', gradient: ['#FDE047', '#4D4307'], tags: ['Bundle'], options: [shishaFlavour], available: true, bottle: true },
    // --- Tattoo Saturdays: KSh 500 tattoo with any bottle, Saturdays only ---
    { id: 'tattoo-saturday', name: 'Tattoo Saturday — Small Tattoo', category: 'bundles', price: 500,
      description: 'Buy any bottle and get a small tattoo from our resident artist for KSh 500. Saturdays only — add it to an order with a bottle.',
      emoji: '🖋️', gradient: ['#111827', '#7C3AED'], tags: ['Saturdays'], requiresBottle: true,
      window: { days: [6], start: '12:00', end: '23:59' }, available: true },
  ],
  happyHours: [
    { id: 'hh-shisha', name: 'Shisha Happy Hour', category: 'shisha', percent: 20, days: [0, 1, 2, 3, 4, 5, 6], start: '14:00', end: '17:00', active: true },
  ],
  events: [
    { id: 'ev-karaoke', title: 'Karaoke Sundays', subtitle: 'Grab the mic · every Sunday from 7 PM', emoji: '🎤', theme: 'pink',
      startsAt: nextDow(0, 19), endsAt: nextDow(0, 19) + 5 * 3600e3, repeat: 'weekly', location: 'Main Bar',
      description: 'Sing your heart out every Sunday! Free entry, song requests at the DJ booth, and karaoke cocktail specials all night. Reserve a table to get your songs bumped up the list.',
      ticketTypes: [{ id: 'tt-karaoke-free', name: 'Free entry (RSVP)', price: 0, capacity: 200 }, { id: 'tt-karaoke-table', name: 'Reserved table for 4 + priority songs', price: 2000, capacity: 12 }],
      featured: true, published: true },
    { id: 'ev-rizz-xp', title: 'Rizz XP × Homeboys', subtitle: 'The Rizz experience — live with the Homeboys', emoji: '🔥', theme: 'orange',
      startsAt: RIZZ_XP_START, endsAt: RIZZ_XP_START + 6 * 3600e3, location: 'Rooftop Terrace',
      description: 'Rizz XP teams up with the Homeboys for a night of live performances, DJ sets and big energy. Tickets KSh 1,000 — limited capacity, get yours early.',
      ticketTypes: [{ id: 'tt-xp-regular', name: 'Regular', price: 1000, capacity: 300 }],
      featured: true, published: true },
    { id: 'ev-tattoo', title: 'Tattoo Saturdays', subtitle: 'Buy a bottle, get a tattoo for KSh 500', emoji: '🖋️', theme: 'purple',
      startsAt: nextDow(6, 14), endsAt: nextDow(6, 14) + 9 * 3600e3, repeat: 'weekly', location: 'Main Bar',
      description: 'Our resident tattoo artist is in every Saturday. Buy any bottle and get a small tattoo for just KSh 500 — add "Tattoo Saturday" to your order with the bottle. Walk-ins welcome; RSVP to save your spot in the queue.',
      ticketTypes: [{ id: 'tt-tattoo-rsvp', name: 'Free RSVP (tattoo queue)', price: 0, capacity: 60 }],
      featured: false, published: true },
  ],
  ads: [
    { id: 'ad-hh-trio', title: 'Happy Hour: 3 cocktails for KSh 1,000', subtitle: 'Every day, 2–5 PM — any 3 classics', emoji: '🍹', theme: 'pink',
      cta: { label: 'Order the trio', type: 'item', target: 'hh-trio' }, placements: ['home', 'menu', 'events', 'tv'], active: true },
    { id: 'ad-shisha-hh', title: 'Shisha Happy Hour — 20% off', subtitle: 'Shisha + drinks bundles, 2–5 PM daily', emoji: '💨', theme: 'purple',
      cta: { label: 'See bundles', type: 'menu', target: 'shisha' }, placements: ['home', 'menu', 'events', 'tv'], active: true },
    { id: 'ad-karaoke', title: 'Karaoke Sundays', subtitle: 'Free entry · every Sunday from 7 PM', emoji: '🎤', theme: 'blue',
      cta: { label: 'RSVP', type: 'event', target: 'ev-karaoke' }, placements: ['home', 'events', 'tv'], active: true },
    { id: 'ad-rizz-xp', title: 'Rizz XP × Homeboys', subtitle: 'Sat 12 Dec · tickets KSh 1,000', emoji: '🔥', theme: 'orange',
      cta: { label: 'Get tickets', type: 'event', target: 'ev-rizz-xp' }, placements: ['home', 'events', 'social', 'tv'], active: true },
    { id: 'ad-chinese', title: 'Chinese Platter + Bottle', subtitle: 'Bundle from KSh 6,900 — save KSh 1,600', emoji: '🥢', theme: 'red',
      cta: { label: 'Order bundle', type: 'item', target: 'chinese-bottle-bundle' }, placements: ['home', 'menu', 'events', 'tv'], active: true },
    { id: 'ad-tattoo', title: 'Tattoo Saturdays', subtitle: 'Buy a bottle, get a tattoo for KSh 500', emoji: '🖋️', theme: 'gold',
      cta: { label: 'Find out more', type: 'event', target: 'ev-tattoo' }, placements: ['home', 'events', 'social', 'tv'], active: true },
  ],
};

/** Inserts pack entries that were never seeded before. Returns how many were added. */
export function applyContentPack(db) {
  db.seeded ||= [];
  let added = 0;
  const now = Date.now();
  const put = (list, item, front = false) => {
    const key = `${list}:${item.id}`;
    if (db.seeded.includes(key)) return;
    db.seeded.push(key);
    db[list] ||= [];
    if (db[list].some((x) => x.id === item.id)) return;
    const row = { createdAt: now, ...item };
    if (front) db[list].unshift(row); else db[list].push(row);
    added++;
  };
  CONTENT_PACK.menu.forEach((m) => put('menu', m, true));
  CONTENT_PACK.happyHours.forEach((h) => put('happyHours', h));
  CONTENT_PACK.events.forEach((e) => put('events', e, true));
  CONTENT_PACK.ads.forEach((a) => put('ads', a, true));
  // One-time date update for Rizz XP × Homeboys (Sat 12 Dec 2026, 9 PM) on servers that already had it
  if (!db.seeded.includes('patch:rizz-xp-2026-12-12')) {
    db.seeded.push('patch:rizz-xp-2026-12-12');
    const ev = db.events?.find((e) => e.id === 'ev-rizz-xp');
    if (ev) { ev.startsAt = RIZZ_XP_START; ev.endsAt = RIZZ_XP_START + 6 * 3600e3; added++; }
    const ad = db.ads?.find((a) => a.id === 'ad-rizz-xp');
    if (ad) { ad.subtitle = 'Sat 12 Dec · tickets KSh 1,000'; added++; }
  }
  // The old "2-for-1, 4–7 PM" sample ad conflicts with the new 2–5 PM happy hour — switch it off once.
  if (!db.seeded.includes('retire:ad-happy')) {
    db.seeded.push('retire:ad-happy');
    const old = db.ads?.find((a) => a.id === 'ad-happy' && /2-for-1/.test(a.title));
    if (old) { old.active = false; added++; }
  }
  return added;
}
