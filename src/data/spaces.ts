import type { Space } from '../types';

export const SPACES: Space[] = [
  { id: 'bar-counter', name: 'Bar Counter', emoji: '🍸', gradient: ['#7C5CFF', '#1E1442'],
    description: 'Front-row seats to the mixology show. Chat with our bartenders.',
    capacity: [1, 4], minSpend: 0, perks: ['Watch the bartenders', 'Walk-in friendly'] },
  { id: 'lounge-booth', name: 'Velvet Lounge Booth', emoji: '🛋️', gradient: ['#C026D3', '#3B0A45'],
    description: 'Plush semi-private booths with low lighting — perfect for dates and small groups.',
    capacity: [2, 6], minSpend: 8000, perks: ['Dedicated server', 'Mood lighting'] },
  { id: 'rooftop', name: 'Rooftop Terrace', emoji: '🌃', gradient: ['#0EA5E9', '#082F49'],
    description: 'Open-air terrace with city views, heaters and a resident DJ on weekends.',
    capacity: [2, 10], minSpend: 12000, perks: ['City views', 'DJ Fri–Sat', 'Heated'] },
  { id: 'vip-room', name: 'VIP Room', emoji: '👑', gradient: ['#EAB308', '#422006'],
    description: 'Private room with its own sound system, bottle service and host.',
    capacity: [6, 16], minSpend: 40000, perks: ['Bottle service', 'Private host', 'Own playlist'] },
  { id: 'event-hall', name: 'Full Venue / Events', emoji: '🎉', gradient: ['#D4FF5A', '#2C3A05'],
    description: 'Birthdays, launches and corporate nights. Custom menus available.',
    capacity: [20, 120], minSpend: 150000, perks: ['Custom menu', 'AV setup', 'Event planner'] },
];

export const TIME_SLOTS = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00'];
export const OCCASIONS = ['Date night', 'Birthday', 'Drinks with friends', 'Work event', 'Celebration', 'Other'];
