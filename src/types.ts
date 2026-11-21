export type Category = 'signature' | 'classic' | 'mocktail' | 'beer-wine' | 'small-plates' | 'mains' | 'desserts';

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
  customer: string;
  phone?: string;
  lines: CartLine[];
  subtotal: number;
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
}

export interface User {
  name: string;
  phone: string;
}
