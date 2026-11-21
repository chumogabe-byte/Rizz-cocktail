import type { Category } from './types';

export type Route =
  | { name: 'home' }
  | { name: 'menu'; category?: Category }
  | { name: 'item'; id: string }
  | { name: 'cart' }
  | { name: 'order'; id: string }
  | { name: 'book'; spaceId?: string }
  | { name: 'booking'; id: string }
  | { name: 'activity'; tab?: 'orders' | 'bookings' }
  | { name: 'profile' }
  | { name: 'social' }
  | { name: 'rewards' }
  | { name: 'tv' }
  | { name: 'events' }
  | { name: 'event'; id: string }
  | { name: 'tickets' }
  | { name: 'staff' };

export type Nav = { go: (r: Route) => void; back: () => void };
