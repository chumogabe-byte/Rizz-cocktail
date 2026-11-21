import type { Category, MenuItem, Section } from '../types';

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

/** Spirits are priced per single; "Double" doubles it — handled by the price helper below. */
const S = (id: string, name: string, category: Category, price: number, bottle: number, description: string,
  emoji: string, gradient: [string, string], extra: Partial<MenuItem> = {}): MenuItem => ({
  id, name, category, price, description, emoji, gradient, options: [tot(bottle), mixer], ...extra,
});

export const MENU: MenuItem[] = [
  // ---------- Cocktails ----------
  { id: 'rizz-royale', name: 'Rizz Royale', category: 'cocktails', price: 16, popular: true, abv: '18%',
    description: 'Butterfly-pea gin that blushes violet, elderflower, lemon, topped with prosecco.',
    emoji: '🍸', gradient: ['#7C5CFF', '#2A1B6B'], tags: ['Signature', 'Floral'], options: [spirit] },
  { id: 'smooth-operator', name: 'Smooth Operator', category: 'cocktails', price: 17, popular: true, abv: '24%',
    description: 'Brown-butter bourbon, maple, smoked cherry bitters over a clear rock.',
    emoji: '🥃', gradient: ['#FF8A3D', '#5A1E0E'], tags: ['Signature', 'Smoky'], options: [spirit] },
  { id: 'pickup-line', name: 'Pick-Up Line', category: 'cocktails', price: 15, abv: '14%',
    description: 'Tequila, passion fruit, lime, chilli agave, tajín rim.',
    emoji: '🍹', gradient: ['#FFB300', '#7A2E00'], tags: ['Signature', 'Spicy'], options: [spirit] },
  { id: 'lime-light', name: 'Lime Light', category: 'cocktails', price: 15, abv: '12%',
    description: 'Vodka, green apple, basil, lime cordial, soda.',
    emoji: '🍏', gradient: ['#B8F04A', '#2C4A0A'], tags: ['Signature', 'Fresh'], options: [spirit] },
  { id: 'espresso-martini', name: 'Espresso Martini', category: 'cocktails', price: 15, popular: true, abv: '18%',
    description: 'Vodka, fresh espresso, coffee liqueur, three-bean garnish.', emoji: '☕', gradient: ['#6B4A32', '#1A0F08'], options: [spirit] },
  { id: 'negroni', name: 'Negroni', category: 'cocktails', price: 14, abv: '24%',
    description: 'Gin, Campari, sweet vermouth. Equal parts, perfectly balanced.', emoji: '🍷', gradient: ['#E2304A', '#4A0812'], options: [spirit] },
  { id: 'old-fashioned', name: 'Old Fashioned', category: 'cocktails', price: 14, abv: '30%',
    description: 'Rye, demerara, Angostura & orange bitters.', emoji: '🥃', gradient: ['#C77B30', '#3D1F08'], options: [spirit] },
  { id: 'mojito', name: 'Mojito', category: 'cocktails', price: 12, abv: '10%',
    description: 'White rum, mint, lime, sugar, soda.', emoji: '🌿', gradient: ['#4ADE80', '#0B3B1E'], options: [spirit] },
  { id: 'margarita', name: 'Margarita', category: 'cocktails', price: 13, abv: '16%',
    description: 'Blanco tequila, triple sec, lime, half salt rim.', emoji: '🍋', gradient: ['#E6F25A', '#4A5208'], options: [spirit] },

  // ---------- Vodka ----------
  S('smirnoff', 'Smirnoff No. 21', 'vodka', 6, 55, 'Clean, smooth house pour.', '🧊', ['#60A5FA', '#0B2347']),
  S('absolut', 'Absolut', 'vodka', 7, 65, 'Swedish winter wheat, rich and full.', '🧊', ['#93C5FD', '#13294B']),
  S('ketel-one', 'Ketel One', 'vodka', 8, 75, 'Crisp and lively with a citrus finish.', '🧊', ['#7DD3FC', '#082F49']),
  S('grey-goose', 'Grey Goose', 'vodka', 12, 120, 'French soft-winter wheat, silky smooth.', '🪿', ['#CBD5E1', '#1E293B'], { popular: true }),
  S('belvedere', 'Belvedere', 'vodka', 12, 125, 'Polish rye, velvety with vanilla notes.', '🧊', ['#E2E8F0', '#1F2937']),
  S('ciroc', 'Cîroc', 'vodka', 11, 110, 'Distilled from grapes — fresh and fruity.', '🍇', ['#C4B5FD', '#2E1065']),

  // ---------- Gin ----------
  S('gordons', "Gordon's", 'gin', 6, 50, 'The classic London dry, juniper-forward.', '🌿', ['#4ADE80', '#052E16']),
  S('beefeater', 'Beefeater', 'gin', 7, 60, 'Bold juniper, bright citrus peel.', '🌿', ['#F87171', '#450A0A']),
  S('tanqueray', 'Tanqueray', 'gin', 8, 70, 'Four botanicals, crisp and dry.', '🌿', ['#34D399', '#022C22']),
  S('bombay', 'Bombay Sapphire', 'gin', 8, 72, 'Ten vapour-infused botanicals.', '💎', ['#38BDF8', '#0C2A4A'], { popular: true }),
  S('hendricks', "Hendrick's", 'gin', 10, 95, 'Cucumber and rose — served with a cucumber slice.', '🥒', ['#A7F3D0', '#064E3B']),
  S('malfy-rosa', 'Malfy Rosa', 'gin', 9, 85, 'Sicilian pink grapefruit gin.', '🍊', ['#FDA4AF', '#4C0519']),

  // ---------- Whiskey ----------
  S('jameson', 'Jameson', 'whiskey', 7, 65, 'Irish, triple-distilled, smooth & sweet.', '🥃', ['#4ADE80', '#14321C']),
  S('jack-daniels', "Jack Daniel's", 'whiskey', 8, 70, 'Tennessee charcoal-mellowed classic.', '🥃', ['#A3A3A3', '#171717'], { popular: true }),
  S('jw-black', 'Johnnie Walker Black', 'whiskey', 9, 85, '12-year blended Scotch, smoky and rich.', '🥃', ['#FBBF24', '#1C1917']),
  S('glenfiddich-12', 'Glenfiddich 12', 'whiskey', 11, 110, 'Speyside single malt, pear and oak.', '🦌', ['#86EFAC', '#14532D']),
  S('macallan-12', 'Macallan 12 Double Cask', 'whiskey', 16, 165, 'Sherry-seasoned oak, dried fruit, spice.', '🥃', ['#D97706', '#291500']),
  S('makers-mark', "Maker's Mark", 'whiskey', 9, 85, 'Wheated bourbon, caramel and vanilla.', '🔴', ['#EF4444', '#3F0A0A']),
  S('jw-blue', 'Johnnie Walker Blue Label', 'whiskey', 35, 320, 'Exceptionally rare blend. For the big night.', '💙', ['#3B82F6', '#0B1739']),

  // ---------- Rum ----------
  S('bacardi', 'Bacardí Carta Blanca', 'rum', 6, 50, 'Light, crisp white rum.', '🦇', ['#F5F5F4', '#292524']),
  S('captain-morgan', 'Captain Morgan Spiced', 'rum', 6, 55, 'Vanilla and warm spice.', '🏴‍☠️', ['#FB923C', '#431407']),
  S('kraken', 'Kraken Black Spiced', 'rum', 8, 70, 'Dark, rich, clove & cinnamon.', '🐙', ['#57534E', '#0C0A09']),
  S('diplomatico', 'Diplomático Reserva', 'rum', 11, 105, 'Venezuelan sipping rum — toffee, cocoa.', '🥃', ['#B45309', '#1C0F02'], { popular: true }),
  S('malibu', 'Malibu', 'rum', 6, 45, 'Coconut rum, best with pineapple.', '🥥', ['#FEF3C7', '#78350F']),

  // ---------- Tequila ----------
  S('jose-cuervo', 'José Cuervo Especial', 'tequila', 6, 55, 'Gold tequila, a party classic.', '🌵', ['#FCD34D', '#451A03']),
  S('patron-silver', 'Patrón Silver', 'tequila', 11, 110, '100% agave, citrus and pepper.', '🐝', ['#D9F99D', '#1A2E05'], { popular: true }),
  S('don-julio-1942', 'Don Julio 1942', 'tequila', 25, 260, 'Añejo — caramel, chocolate, warm oak.', '🌵', ['#F59E0B', '#2A1600']),
  S('casamigos', 'Casamigos Reposado', 'tequila', 13, 130, 'Soft caramel and cocoa notes.', '🌵', ['#FDBA74', '#3B1405']),

  // ---------- Wine ----------
  { id: 'house-red', name: 'House Red — Merlot', category: 'wine', price: 8, description: 'Soft plum and cherry.', emoji: '🍷', gradient: ['#9F1239', '#2B0410'], options: [glassBottle(22)] },
  { id: 'malbec', name: 'Malbec, Mendoza', category: 'wine', price: 11, popular: true, description: 'Blackberry, violet, smooth tannins.', emoji: '🍷', gradient: ['#881337', '#1F030C'], options: [glassBottle(32)] },
  { id: 'cab-sauv', name: 'Cabernet Sauvignon', category: 'wine', price: 12, description: 'Full-bodied, blackcurrant and cedar.', emoji: '🍷', gradient: ['#7F1D1D', '#1A0505'], options: [glassBottle(36)] },
  { id: 'house-white', name: 'House White — Chenin Blanc', category: 'wine', price: 8, description: 'Crisp apple and honey.', emoji: '🥂', gradient: ['#FEF08A', '#3F3A06'], options: [glassBottle(22)] },
  { id: 'sauv-blanc', name: 'Sauvignon Blanc, Marlborough', category: 'wine', price: 11, description: 'Zesty passion fruit and lime.', emoji: '🥂', gradient: ['#D9F99D', '#1A2E05'], options: [glassBottle(32)] },
  { id: 'rose', name: 'Provence Rosé', category: 'wine', price: 11, description: 'Dry, strawberry and peach.', emoji: '🌸', gradient: ['#FBCFE8', '#500724'], options: [glassBottle(32)] },

  // ---------- Champagne & sparkling ----------
  { id: 'prosecco', name: 'Prosecco DOC', category: 'champagne', price: 10, description: 'Fine bubbles, green apple.', emoji: '🥂', gradient: ['#FDE047', '#4D4307'], options: [glassBottle(28)] },
  { id: 'moet', name: 'Moët & Chandon Brut', category: 'champagne', price: 18, popular: true, description: 'Bright fruit, elegant maturity.', emoji: '🍾', gradient: ['#FDE68A', '#3D2E05'], options: [glassBottle(77)] },
  { id: 'veuve', name: 'Veuve Clicquot Yellow Label', category: 'champagne', price: 20, description: 'Toasty brioche, crisp pear.', emoji: '🍾', gradient: ['#FACC15', '#3A2D02'], options: [glassBottle(90)] },
  { id: 'moet-rose', name: 'Moët Rosé Impérial', category: 'champagne', price: 105, description: 'Bottle. Wild strawberry and rose petals.', emoji: '🌹', gradient: ['#F9A8D4', '#4A0627'] },
  { id: 'dom-perignon', name: 'Dom Pérignon Vintage', category: 'champagne', price: 320, description: 'Bottle. The icon — with sparkler service.', emoji: '✨', gradient: ['#E5E7EB', '#111827'] },
  { id: 'ace-of-spades', name: 'Armand de Brignac Brut Gold', category: 'champagne', price: 450, description: 'Bottle. Gold-plated, VIP sparkler parade.', emoji: '♠️', gradient: ['#FCD34D', '#1C1400'] },

  // ---------- Beer & cider ----------
  { id: 'house-lager', name: 'House Lager (draught)', category: 'beer', price: 6, description: 'Crisp and cold, 500ml.', emoji: '🍺', gradient: ['#FBBF24', '#5C3A00'],
    options: [{ label: 'Size', choices: [{ name: 'Pint', price: 0 }, { name: 'Pitcher', price: 16 }] }] },
  { id: 'heineken', name: 'Heineken', category: 'beer', price: 6, description: 'Bottle, 330ml.', emoji: '🍺', gradient: ['#22C55E', '#052E16'],
    options: [{ label: 'Quantity', choices: [{ name: 'Single', price: 0 }, { name: 'Bucket of 5', price: 22 }] }] },
  { id: 'corona', name: 'Corona Extra', category: 'beer', price: 6, popular: true, description: 'Bottle with lime, 355ml.', emoji: '🍋', gradient: ['#FDE047', '#3F3A06'],
    options: [{ label: 'Quantity', choices: [{ name: 'Single', price: 0 }, { name: 'Bucket of 5', price: 22 }] }] },
  { id: 'guinness', name: 'Guinness Draught', category: 'beer', price: 7, description: 'Creamy Irish stout, pint.', emoji: '🍺', gradient: ['#44403C', '#0C0A09'] },
  { id: 'hazy-ipa', name: 'Hazy IPA', category: 'beer', price: 8, description: 'Juicy, tropical, softly bitter.', emoji: '🍺', gradient: ['#F59E0B', '#4A2A00'] },
  { id: 'savanna', name: 'Savanna Dry Cider', category: 'beer', price: 6, description: 'Crisp apple cider, bottle.', emoji: '🍏', gradient: ['#BEF264', '#1A2E05'] },

  // ---------- Liqueurs ----------
  { id: 'baileys', name: "Baileys Irish Cream", category: 'liqueurs', price: 7, description: 'Over ice, creamy and sweet.', emoji: '🍫', gradient: ['#D6B38A', '#3B2614'], options: [tot(60)] },
  { id: 'amarula', name: 'Amarula', category: 'liqueurs', price: 7, description: 'Marula fruit cream liqueur.', emoji: '🐘', gradient: ['#E7C9A0', '#3D2A12'], options: [tot(55)] },
  { id: 'kahlua', name: 'Kahlúa', category: 'liqueurs', price: 7, description: 'Rich coffee liqueur.', emoji: '☕', gradient: ['#7C4A2D', '#1A0D06'], options: [tot(55)] },
  { id: 'cointreau', name: 'Cointreau', category: 'liqueurs', price: 8, description: 'Bitter & sweet orange peel.', emoji: '🍊', gradient: ['#FB923C', '#431407'], options: [tot(65)] },
  { id: 'aperol', name: 'Aperol Spritz', category: 'liqueurs', price: 12, popular: true, description: 'Aperol, prosecco, soda, orange.', emoji: '🍊', gradient: ['#F97316', '#431407'] },
  { id: 'jager', name: 'Jägermeister', category: 'liqueurs', price: 6, description: '56 herbs — ice cold.', emoji: '🦌', gradient: ['#4D7C0F', '#0F1A03'], options: [tot(55)] },
  { id: 'disaronno', name: 'Disaronno Amaretto', category: 'liqueurs', price: 7, description: 'Sweet almond, on the rocks.', emoji: '🌰', gradient: ['#C2410C', '#2A0D02'], options: [tot(60)] },

  // ---------- Shots ----------
  { id: 'tequila-shot', name: 'Tequila Shot', category: 'shots', price: 6, popular: true, description: 'Salt, lime, go.', emoji: '🌵', gradient: ['#FDE047', '#3F3A06'],
    options: [{ label: 'Round', choices: [{ name: '1 shot', price: 0 }, { name: '5 shots', price: 18 }, { name: '10 shots', price: 42 }] }] },
  { id: 'jager-bomb', name: 'Jäger Bomb', category: 'shots', price: 9, description: 'Jägermeister dropped into energy drink.', emoji: '💣', gradient: ['#65A30D', '#0F1A03'],
    options: [{ label: 'Round', choices: [{ name: '1', price: 0 }, { name: '5', price: 32 }] }] },
  { id: 'b52', name: 'B-52', category: 'shots', price: 8, description: 'Kahlúa, Baileys, Grand Marnier — layered.', emoji: '🎯', gradient: ['#B45309', '#1C0F02'] },
  { id: 'kamikaze', name: 'Kamikaze', category: 'shots', price: 7, description: 'Vodka, triple sec, lime.', emoji: '✈️', gradient: ['#A3E635', '#1A2E05'] },
  { id: 'lemon-drop', name: 'Lemon Drop', category: 'shots', price: 7, description: 'Citrus vodka, lemon, sugar rim.', emoji: '🍋', gradient: ['#FEF08A', '#3F3A06'] },
  { id: 'rizz-roulette', name: 'Rizz Roulette (6)', category: 'shots', price: 36, description: 'Six mystery shots — one of them is chilli.', emoji: '🎲', gradient: ['#7C5CFF', '#1E1442'] },

  // ---------- Mocktails ----------
  { id: 'no-cap', name: 'No Cap', category: 'mocktails', price: 9, description: 'Seedlip Garden, cucumber, mint, elderflower tonic.', emoji: '🥒', gradient: ['#5EEAD4', '#0B3B37'], tags: ['0%'] },
  { id: 'main-character', name: 'Main Character', category: 'mocktails', price: 9, popular: true, description: 'Hibiscus, raspberry, lemon, vanilla soda.', emoji: '🌺', gradient: ['#F472B6', '#5B0F35'], tags: ['0%'] },
  { id: 'virgin-mojito', name: 'Virgin Mojito', category: 'mocktails', price: 8, description: 'Mint, lime, sugar, soda.', emoji: '🌿', gradient: ['#4ADE80', '#0B3B1E'], tags: ['0%'] },
  { id: 'virgin-colada', name: 'Virgin Colada', category: 'mocktails', price: 8, description: 'Pineapple, coconut cream, lime.', emoji: '🍍', gradient: ['#FDE68A', '#6B4E06'], tags: ['0%'] },
  { id: 'passion-fizz', name: 'Passion Fizz', category: 'mocktails', price: 8, description: 'Passion fruit, ginger, soda.', emoji: '🥭', gradient: ['#FBBF24', '#4A2A00'], tags: ['0%'] },

  // ---------- Soft drinks ----------
  { id: 'coke', name: 'Coca-Cola', category: 'soft', price: 3, description: 'Classic, Zero or Diet.', emoji: '🥤', gradient: ['#EF4444', '#3F0A0A'],
    options: [{ label: 'Type', choices: [{ name: 'Classic', price: 0 }, { name: 'Zero', price: 0 }, { name: 'Diet', price: 0 }] }] },
  { id: 'sprite', name: 'Sprite / Fanta', category: 'soft', price: 3, description: 'Lemon-lime or orange.', emoji: '🥤', gradient: ['#4ADE80', '#052E16'],
    options: [{ label: 'Flavour', choices: [{ name: 'Sprite', price: 0 }, { name: 'Fanta Orange', price: 0 }] }] },
  { id: 'tonic', name: 'Tonic / Soda / Ginger Ale', category: 'soft', price: 3, description: 'Premium mixers.', emoji: '🫧', gradient: ['#BAE6FD', '#0C2A4A'] },
  { id: 'red-bull', name: 'Red Bull', category: 'soft', price: 5, description: 'Energy drink, 250ml.', emoji: '⚡', gradient: ['#3B82F6', '#0B1739'] },
  { id: 'juice', name: 'Fresh Juice', category: 'soft', price: 5, description: 'Orange, pineapple, watermelon or passion.', emoji: '🧃', gradient: ['#FB923C', '#431407'],
    options: [{ label: 'Flavour', choices: [{ name: 'Orange', price: 0 }, { name: 'Pineapple', price: 0 }, { name: 'Watermelon', price: 0 }, { name: 'Passion', price: 0 }] }] },
  { id: 'water', name: 'Mineral Water', category: 'soft', price: 2, description: 'Still or sparkling, 500ml.', emoji: '💧', gradient: ['#7DD3FC', '#082F49'],
    options: [{ label: 'Type', choices: [{ name: 'Still', price: 0 }, { name: 'Sparkling', price: 1 }] }] },
  { id: 'coffee', name: 'Coffee', category: 'soft', price: 4, description: 'Espresso, americano, latte or cappuccino.', emoji: '☕', gradient: ['#78350F', '#1C0A00'],
    options: [{ label: 'Style', choices: [{ name: 'Espresso', price: 0 }, { name: 'Americano', price: 0 }, { name: 'Latte', price: 1 }, { name: 'Cappuccino', price: 1 }] }] },

  // ---------- Food ----------
  { id: 'truffle-fries', name: 'Truffle Parm Fries', category: 'small-plates', price: 9, popular: true, description: 'Hand-cut fries, truffle oil, parmesan, aioli.', emoji: '🍟', gradient: ['#FCD34D', '#5C3D00'], tags: ['V'] },
  { id: 'wings', name: 'Hot Honey Wings', category: 'small-plates', price: 12, description: 'Crispy wings, chilli-honey glaze, blue-cheese dip.', emoji: '🍗', gradient: ['#F97316', '#4A1A00'],
    options: [{ label: 'Portion', choices: [{ name: '6 pcs', price: 0 }, { name: '12 pcs', price: 10 }] }] },
  { id: 'tacos', name: 'Birria Tacos', category: 'small-plates', price: 13, description: 'Three slow-braised beef tacos with consommé.', emoji: '🌮', gradient: ['#EF4444', '#450A0A'] },
  { id: 'sliders', name: 'Smash Sliders', category: 'small-plates', price: 14, description: 'Three mini smash burgers, cheese, pickles, Rizz sauce.', emoji: '🍔', gradient: ['#D97706', '#3F2000'] },
  { id: 'calamari', name: 'Crispy Calamari', category: 'small-plates', price: 12, description: 'Lemon, chilli mayo.', emoji: '🦑', gradient: ['#FB7185', '#4C0519'] },
  { id: 'nachos', name: 'Loaded Nachos', category: 'small-plates', price: 11, description: 'Cheese, jalapeños, salsa, guac, sour cream.', emoji: '🧀', gradient: ['#FACC15', '#3A2D02'], tags: ['V'] },
  { id: 'platter', name: 'Rizz Sharing Platter', category: 'small-plates', price: 38, popular: true, description: 'Wings, sliders, calamari, fries & dips. Serves 4.', emoji: '🍱', gradient: ['#F59E0B', '#2A1600'] },
  { id: 'steak-frites', name: 'Steak Frites', category: 'mains', price: 28, description: '250g sirloin, peppercorn sauce, fries.', emoji: '🥩', gradient: ['#B91C1C', '#2B0505'],
    options: [{ label: 'Cooked', choices: [{ name: 'Medium rare', price: 0 }, { name: 'Medium', price: 0 }, { name: 'Well done', price: 0 }] }] },
  { id: 'burger', name: 'The Rizz Burger', category: 'mains', price: 19, popular: true, description: 'Double patty, cheddar, bacon jam, brioche, fries.', emoji: '🍔', gradient: ['#EA580C', '#431407'] },
  { id: 'pasta', name: 'Spicy Vodka Rigatoni', category: 'mains', price: 18, description: 'Creamy tomato-vodka sauce, chilli, basil.', emoji: '🍝', gradient: ['#F43F5E', '#4C0519'], tags: ['V'] },
  { id: 'salmon-bowl', name: 'Miso Salmon Bowl', category: 'mains', price: 22, description: 'Sticky rice, miso salmon, edamame, pickled ginger.', emoji: '🍣', gradient: ['#FB923C', '#431407'] },
  { id: 'nyama-choma', name: 'Grilled Chicken & Fries', category: 'mains', price: 17, description: 'Half chicken, peri-peri glaze, kachumbari, fries.', emoji: '🍗', gradient: ['#DC2626', '#2A0505'] },
  { id: 'churros', name: 'Churros & Chocolate', category: 'desserts', price: 9, description: 'Cinnamon sugar, dark chocolate dip.', emoji: '🍩', gradient: ['#A16207', '#2A1500'], tags: ['V'] },
  { id: 'lava-cake', name: 'Molten Lava Cake', category: 'desserts', price: 10, description: 'Warm chocolate cake, vanilla ice cream.', emoji: '🍫', gradient: ['#78350F', '#1C0A00'], tags: ['V'] },
];

export const getItem = (id: string) => MENU.find((m) => m.id === id);

/** Unit price for an item + selected choice indexes ("Double" doubles a spirit tot). */
export function unitPrice(item: MenuItem, sel: number[]) {
  let base = item.price;
  let extra = 0;
  item.options?.forEach((o, i) => {
    const c = o.choices[sel[i] ?? 0];
    if (c.name.startsWith('Double')) base = item.price * 2;
    else if (c.name.startsWith('Bottle (')) base = 0; // bottle price replaces the tot price
    extra += c.price;
  });
  return base + extra;
}
