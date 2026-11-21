# Rizz Cocktail Bar 🍸

A mobile-first web app for **Rizz Cocktail Bar & Lounge**. Guests order drinks and food to their table, book spaces at the bar, and track everything live. Staff get a console where they **receive orders** and **manage bookings** in real time.

The design takes cues from modern nightlife apps: a dark UI with electric purple and lime accents, rounded cards, chip filters and a floating bottom nav.

## Features

### Guests
- **Onboarding**: quick sign-in with a name and phone number.
- **Home**: search, popular / favourite / zero-proof carousels, category shortcuts, space previews, and a live banner for your active order.
- **Menu**: 7 categories (Signatures, Classics, Zero-Proof, Beer & Wine, Small Plates, Mains, Desserts), quick-add buttons, and a sticky cart bar.
- **Item detail**: spirit upgrades, sizes and cooking options with prices, special requests, quantity, and favourites.
- **Checkout**: served to your table (by table number) or picked up at the bar, notes, tip presets, and a service fee.
- **Live order tracking**: Received → Mixing → Ready → Served. You can cancel while the order is still new, rate it with emoji feedback once it's served, and order again with one tap.
- **Book a space**: choose from Bar Counter, Velvet Lounge Booth, Rooftop Terrace, VIP Room or the Full Venue. Pick a date (next 14 days) and a time slot (taken or past slots are blocked), set guests (limited by each space's capacity) and duration, and add an occasion and requests. Each booking gets a ticket with a booking code.
- **Activity & profile**: order and booking history, Rizz Rewards points, and a call-the-bar link.

### Staff console (`Profile → Staff console`, or open `/#staff`)
- **Orders**: a board with New, Preparing and Ready columns. Staff can accept or reject orders and mark them ready or served. Each ticket shows elapsed time with late warnings, plus item options and allergy notes. A **sound alert** plays when a new order comes in.
- **Bookings**: Upcoming, Pending and All filters. Staff can confirm, decline or check guests in.
- **Overview**: today's revenue, order count, average order, bookings, top sellers and guest ratings.
- Demo PIN: **1234** (set in `src/config.ts`).

> Customer and staff views sync **live across browser tabs**. Open the app in one tab and `/#staff` in another, place an order, and watch it arrive.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview
```

## Customising
- **Bar details, currency, service fee, staff PIN**: `src/config.ts`
- **Menu**: `src/data/menu.ts`
- **Bookable spaces, time slots, occasions**: `src/data/spaces.ts`
- **Photos**: the `<Art>` component takes an `img` prop. Swap the gradient placeholders for real photography.
- **Theme colours**: CSS variables at the top of `src/styles.css`

## Architecture

```
src/
  App.tsx            screen router, bottom nav, staff gate
  config.ts          bar settings
  types.ts           Order, Booking, MenuItem, Space…
  data/              menu + spaces
  store/store.ts     persisted state + actions (orders, bookings, cart)
  components/        Icon, Art, TopBar, Chip, Stepper…
  screens/           Welcome, Home, Menu, ItemDetail, Cart, OrderTracking,
                     Book, BookingDetail, Activity, Profile, Staff
```

Built with React 18, TypeScript and Vite. There are no UI dependencies.

### Going to production
State currently lives in `localStorage`, which is ideal for demos and a single-device setup (for example, a bar tablet and a guest's phone *won't* share data yet). To run it for real:
1. Put the `actions` in `src/store/store.ts` behind an API (Supabase, Firebase, or a small Node/Express + Postgres service).
2. Replace the `storage` event sync with websockets or realtime subscriptions so staff devices receive orders instantly.
3. Replace the demo PIN with proper staff authentication.
4. Add payments (Stripe, M-Pesa, etc.) at checkout and SMS/WhatsApp booking confirmations.
