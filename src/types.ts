export type Category =
  | 'cocktails' | 'vodka' | 'gin' | 'whiskey' | 'rum' | 'tequila' | 'wine' | 'beer' | 'champagne' | 'liqueurs' | 'shots'
  | 'soft' | 'mocktails' | 'small-plates' | 'mains' | 'desserts' | 'bundles' | 'shisha';
export type Section = 'alcoholic' | 'soft' | 'food' | 'bundles';

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
  happyHour?: string;  // set while a scheduled happy hour discounts this item
  window?: { days: number[]; start: string; end: string }; // only orderable at these times (Kenya time)
  requiresBottle?: boolean; // must be ordered together with a bottle
  bottle?: boolean;          // this item counts as a bottle purchase
  hhPrice?: number;    // (staff view) the live happy-hour price
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
  image?: string;
  multiParty?: boolean; // several parties can book the same slot (bar counter, rooftop)
  active?: boolean;     // false = hidden from guests
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
export type FulfilmentType = 'table' | 'pickup' | 'find';

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
  locationHint?: string;
  notes?: string;
  status: OrderStatus;
  rating?: number;
  payment?: Payment;
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

export interface Payment {
  method: 'mpesa' | 'cash' | 'free' | 'unpaid' | 'wallet';
  status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  receipt?: string;
  phone?: string;
  amount?: number;
  message?: string;
  paidAt?: number;
  paymentId?: string;
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

export type Placement = 'home' | 'menu' | 'book' | 'social' | 'events' | 'tv';
export interface Ad {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  theme: string;
  image?: string;
  cta: { label: string; type: 'none' | 'menu' | 'item' | 'book' | 'code' | 'social' | 'event'; target: string };
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
  tickets?: number;
  wallet?: number;
}

export interface Settings { rewardThreshold: number; rewardValue: number; pointsPerUnit: number; walletBonusPercent?: number; walletBonusMin?: number }

export interface TicketType { id: string; name: string; price: number; capacity: number }
export interface BarEvent {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  location: string;
  emoji: string;
  theme: string;
  image?: string;
  startsAt: number;
  endsAt?: number;
  ticketTypes: TicketType[];
  sold: Record<string, number>;
  featured: boolean;
  published: boolean;
  repeat?: 'weekly';
  createdAt: number;
}
export type TicketStatus = 'reserved' | 'paid' | 'checked-in' | 'cancelled';
export interface TicketOrder {
  id: string;
  code: string;
  createdAt: number;
  eventId: string;
  eventTitle: string;
  startsAt: number;
  location: string;
  customerId: string;
  customer: string;
  phone?: string;
  lines: { typeId: string; name: string; price: number; qty: number }[];
  total: number;
  units: { code: string; typeId: string; typeName: string; checkedInAt: number | null }[];
  status: TicketStatus;
  payment?: Payment;
}

export interface AppContent {
  bar: { name: string; tagline: string; address: string; hours: string; phone: string; serviceFeeRate: number };
  welcome: { title: string; subtitle: string; images: string[] };
  home: { headline: string; orderImage: string | null; bookImage: string | null };
}
export type StaffRole = 'admin' | 'staff';

export interface WalletTx {
  id: string;
  type: 'topup' | 'cash' | 'bonus' | 'payment' | 'refund' | 'adjust';
  amount: number;
  ref?: string;
  note?: string;
  at: number;
  balanceAfter: number;
  name?: string;
  customerId?: string;
}
export interface Topup { id: string; customerId: string; amount: number; createdAt: number; bonus?: number; payment?: Payment }
export interface Wallet { balance: number; tx: WalletTx[]; topups: Topup[] }

export interface HappyHour { id: string; name: string; category: string; percent: number; days: number[]; start: string; end: string; active: boolean }
export interface HappyHourNow { name: string; category: string; percent: number; end: string }
