import type { Category, MenuItem } from '../types';

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'signature', label: 'Signatures', emoji: '✨' },
  { id: 'classic', label: 'Classics', emoji: '🍸' },
  { id: 'mocktail', label: 'Zero-Proof', emoji: '🍹' },
  { id: 'beer-wine', label: 'Beer & Wine', emoji: '🍷' },
  { id: 'small-plates', label: 'Small Plates', emoji: '🍢' },
  { id: 'mains', label: 'Mains', emoji: '🍔' },
  { id: 'desserts', label: 'Desserts', emoji: '🍫' },
];

const size = { label: 'Size', choices: [{ name: 'Regular', price: 0 }, { name: 'Double', price: 5 }] };
const spirit = {
  label: 'Spirit upgrade',
  choices: [{ name: 'House', price: 0 }, { name: 'Premium', price: 4 }, { name: 'Top shelf', price: 8 }],
};

export const MENU: MenuItem[] = [
  // Signatures
  { id: 'rizz-royale', name: 'Rizz Royale', category: 'signature', price: 16, popular: true, abv: '18%',
    description: 'Butterfly-pea gin that blushes violet, elderflower, lemon, topped with prosecco.',
    emoji: '🍸', gradient: ['#7C5CFF', '#2A1B6B'], tags: ['Floral', 'Sparkling'], options: [spirit] },
  { id: 'smooth-operator', name: 'Smooth Operator', category: 'signature', price: 17, popular: true, abv: '24%',
    description: 'Bourbon, brown-butter washed, maple, smoked cherry bitters. Served over a clear rock.',
    emoji: '🥃', gradient: ['#FF8A3D', '#5A1E0E'], tags: ['Smoky', 'Spirit-forward'], options: [spirit] },
  { id: 'pickup-line', name: 'Pick-Up Line', category: 'signature', price: 15, abv: '14%',
    description: 'Tequila, passion fruit, lime, chilli agave, tajín rim. Flirty with a kick.',
    emoji: '🍹', gradient: ['#FFB300', '#7A2E00'], tags: ['Spicy', 'Tropical'], options: [spirit] },
  { id: 'midnight-text', name: 'Midnight Text', category: 'signature', price: 16, abv: '20%',
    description: 'Dark rum, cold-brew, coconut cream, black cardamom. Dangerous after 12.',
    emoji: '☕', gradient: ['#3B2B5C', '#0F0A1F'], tags: ['Rich', 'Coffee'], options: [spirit] },
  { id: 'lime-light', name: 'Lime Light', category: 'signature', price: 15, popular: true, abv: '12%',
    description: 'Vodka, green apple, basil, lime cordial, soda. Bright, crisp, electric green.',
    emoji: '🍏', gradient: ['#B8F04A', '#2C4A0A'], tags: ['Fresh', 'Herbal'], options: [spirit] },

  // Classics
  { id: 'old-fashioned', name: 'Old Fashioned', category: 'classic', price: 14, abv: '30%',
    description: 'Rye, demerara, Angostura & orange bitters, expressed orange peel.',
    emoji: '🥃', gradient: ['#C77B30', '#3D1F08'], options: [spirit, size] },
  { id: 'negroni', name: 'Negroni', category: 'classic', price: 14, abv: '24%',
    description: 'Gin, Campari, sweet vermouth. Equal parts, perfectly balanced.',
    emoji: '🍷', gradient: ['#E2304A', '#4A0812'], options: [spirit, size] },
  { id: 'espresso-martini', name: 'Espresso Martini', category: 'classic', price: 15, popular: true, abv: '18%',
    description: 'Vodka, fresh espresso, coffee liqueur, three-bean garnish.',
    emoji: '🍸', gradient: ['#6B4A32', '#1A0F08'], options: [spirit, size] },
  { id: 'margarita', name: 'Margarita', category: 'classic', price: 13, abv: '16%',
    description: 'Blanco tequila, triple sec, lime, half salt rim.',
    emoji: '🍋', gradient: ['#E6F25A', '#4A5208'], options: [spirit, size] },
  { id: 'mojito', name: 'Mojito', category: 'classic', price: 12, abv: '10%',
    description: 'White rum, mint, lime, sugar, soda over crushed ice.',
    emoji: '🌿', gradient: ['#4ADE80', '#0B3B1E'], options: [spirit, size] },

  // Mocktails
  { id: 'no-cap', name: 'No Cap', category: 'mocktail', price: 9,
    description: 'Seedlip Garden, cucumber, mint, elderflower tonic. All vibe, no booze.',
    emoji: '🥒', gradient: ['#5EEAD4', '#0B3B37'], tags: ['0%'] },
  { id: 'main-character', name: 'Main Character', category: 'mocktail', price: 9, popular: true,
    description: 'Hibiscus, raspberry, lemon, vanilla soda. Pink and photogenic.',
    emoji: '🌺', gradient: ['#F472B6', '#5B0F35'], tags: ['0%'] },
  { id: 'virgin-colada', name: 'Virgin Colada', category: 'mocktail', price: 8,
    description: 'Pineapple, coconut cream, lime, blended smooth.',
    emoji: '🍍', gradient: ['#FDE68A', '#6B4E06'], tags: ['0%'] },

  // Beer & wine
  { id: 'craft-lager', name: 'House Craft Lager', category: 'beer-wine', price: 7,
    description: 'Crisp local lager on draught, 500ml.', emoji: '🍺', gradient: ['#FBBF24', '#5C3A00'],
    options: [{ label: 'Size', choices: [{ name: 'Pint', price: 0 }, { name: 'Pitcher', price: 18 }] }] },
  { id: 'ipa', name: 'Hazy IPA', category: 'beer-wine', price: 8,
    description: 'Juicy, tropical, softly bitter.', emoji: '🍺', gradient: ['#F59E0B', '#4A2A00'] },
  { id: 'red-wine', name: 'Malbec', category: 'beer-wine', price: 11,
    description: 'Plum, violet, soft tannins.', emoji: '🍷', gradient: ['#9F1239', '#2B0410'],
    options: [{ label: 'Pour', choices: [{ name: 'Glass', price: 0 }, { name: 'Bottle', price: 34 }] }] },
  { id: 'prosecco', name: 'Prosecco', category: 'beer-wine', price: 10,
    description: 'Dry, fine bubbles, green apple.', emoji: '🥂', gradient: ['#FDE047', '#4D4307'],
    options: [{ label: 'Pour', choices: [{ name: 'Glass', price: 0 }, { name: 'Bottle', price: 30 }] }] },

  // Small plates
  { id: 'truffle-fries', name: 'Truffle Parm Fries', category: 'small-plates', price: 9, popular: true,
    description: 'Hand-cut fries, truffle oil, parmesan, garlic aioli.', emoji: '🍟', gradient: ['#FCD34D', '#5C3D00'], tags: ['V'] },
  { id: 'wings', name: 'Hot Honey Wings', category: 'small-plates', price: 12,
    description: 'Crispy wings tossed in chilli-honey glaze, blue-cheese dip.', emoji: '🍗', gradient: ['#F97316', '#4A1A00'],
    options: [{ label: 'Portion', choices: [{ name: '6 pcs', price: 0 }, { name: '12 pcs', price: 10 }] }] },
  { id: 'tacos', name: 'Birria Tacos', category: 'small-plates', price: 13,
    description: 'Three slow-braised beef tacos with consommé for dipping.', emoji: '🌮', gradient: ['#EF4444', '#450A0A'] },
  { id: 'sliders', name: 'Smash Sliders', category: 'small-plates', price: 14,
    description: 'Three mini smash burgers, American cheese, pickles, Rizz sauce.', emoji: '🍔', gradient: ['#D97706', '#3F2000'] },
  { id: 'calamari', name: 'Crispy Calamari', category: 'small-plates', price: 12,
    description: 'Lightly fried squid, lemon, chilli mayo.', emoji: '🦑', gradient: ['#FB7185', '#4C0519'] },

  // Mains
  { id: 'steak-frites', name: 'Steak Frites', category: 'mains', price: 28,
    description: '250g sirloin, peppercorn sauce, fries, dressed greens.', emoji: '🥩', gradient: ['#B91C1C', '#2B0505'],
    options: [{ label: 'Cooked', choices: [{ name: 'Medium rare', price: 0 }, { name: 'Medium', price: 0 }, { name: 'Well done', price: 0 }] }] },
  { id: 'burger', name: 'The Rizz Burger', category: 'mains', price: 19, popular: true,
    description: 'Double patty, aged cheddar, bacon jam, brioche, fries.', emoji: '🍔', gradient: ['#EA580C', '#431407'] },
  { id: 'pasta', name: 'Spicy Vodka Rigatoni', category: 'mains', price: 18,
    description: 'Creamy tomato-vodka sauce, chilli, basil, parmesan.', emoji: '🍝', gradient: ['#F43F5E', '#4C0519'], tags: ['V'] },
  { id: 'bowl', name: 'Miso Glazed Salmon Bowl', category: 'mains', price: 22,
    description: 'Sticky rice, miso salmon, edamame, pickled ginger, sesame.', emoji: '🍣', gradient: ['#FB923C', '#431407'] },

  // Desserts
  { id: 'churros', name: 'Churros & Chocolate', category: 'desserts', price: 9,
    description: 'Cinnamon sugar churros, dark chocolate dip.', emoji: '🍩', gradient: ['#A16207', '#2A1500'], tags: ['V'] },
  { id: 'lava-cake', name: 'Molten Lava Cake', category: 'desserts', price: 10,
    description: 'Warm chocolate cake, vanilla ice cream.', emoji: '🍫', gradient: ['#78350F', '#1C0A00'], tags: ['V'] },
];

export const getItem = (id: string) => MENU.find((m) => m.id === id);
