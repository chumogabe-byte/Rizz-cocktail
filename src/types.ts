export type Category =
  | 'cocktails' | 'vodka' | 'gin' | 'whiskey' | 'rum' | 'tequila' | 'wine' | 'beer' | 'champagne' | 'liqueurs' | 'shots'
  | 'soft' | 'mocktails' | 'small-plates' | 'mains' | 'desserts';
export type Section = 'alcoholic' | 'soft' | 'food';

export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  price: number;
  description: string;
  emoji: string;
  gradient: [string, string];
  tags?: string[];
  abv?: string;
  popular?: boolean;
  offerPrice?: number; // special price shown as an offer
  available?: boolean; // false = sold out
  image?: string;
  options?: { label: string; choices: { name: string; price: number }[] }[];
}

export interface Space {
  id: string;
  name: string;
  description: string;
  capacity: [number, number];
  minSpend: number;
  emoji: string;
  gradient: [string, string];
  perks: string[];
}

export interface CartLine {
  key: string;
  itemId: string;
  name: string;
  unitPrice: number;
  qty: number;
  choices: string[];
  note?: string;
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type FulfilmentType = 'table' | 'pickup';

export interface Order {
  id: string;
  code: string;
  createdAt: number;
  updatedAt: number;
  customerId?: string;
  customer: string;
  phone?: string;
  lines: CartLine[];
  subtotal: number;
  discount?: number;
  voucherCode?: string;
  serviceFee: number;
  tip: number;
  total: number;
  fulfilment: FulfilmentType;
  table?: string;
  notes?: string;
  status: OrderStatus;
  rating?: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'checked-in' | 'cancelled';

export interface Booking {
  id: string;
  code: string;
  createdAt: number;
  customerId?: string;
  spaceId: string;
  spaceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationHrs: number;
  guests: number;
  customer: string;
  phone: string;
  occasion?: string;
  notes?: string;
  status: BookingStatus;
  anon?: boolean; // other guests' bookings: only slot info is shared
}

export interface User {
  // stored on the device only
  name: string;
  phone: string;
}

export interface Post {
  id: string;
  createdAt: number;
  customerId: string;
  author: string;
  caption: string;
  image: string;
  likes: string[];
  hidden?: boolean;
  featured?: boolean;
  removed?: boolean;
}

export type Placement = 'home' | 'menu' | 'book' | 'social' | 'tv';
export interface Ad {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  theme: string;
  image?: string;
  cta: { label: string; type: 'none' | 'menu' | 'item' | 'book' | 'code' | 'social'; target: string };
  placements: Placement[];
  active: boolean;
  createdAt: number;
}

export interface Voucher {
  id: string;
  code: string;
  description: string;
  kind: 'percent' | 'fixed';
  value: number;
  minSpend: number;
  perCustomer?: number;
  maxUses?: number;
  firstOrderOnly?: boolean;
  expiresAt?: number;
  customerId?: string;
  active: boolean;
  source: 'promo' | 'reward';
  redemptions: { customerId?: string; orderId: string; at: number }[];
  createdAt: number;
}

export interface CustomerStats {
  customerId: string;
  name: string;
  phone?: string;
  orders: number;
  totalOrders: number;
  spent: number;
  points: number;
  lastVisit: number | null;
  posts: number;
  redeemed: number;
}

export interface Settings { rewardThreshold: number; rewardValue: number; pointsPerUnit: number }
