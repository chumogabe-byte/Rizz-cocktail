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
- Default PIN: **1234**. Set `STAFF_PIN` on the server to change it.

> Every guest phone, bar tablet and staff screen talks to the **Rizz server**, so orders and bookings sync **live across devices**.

## Getting started

```bash
npm install
npm start          # builds the app and runs the server on http://localhost:3001
```

Open `http://localhost:3001` for the guest app and `http://localhost:3001/#staff` for the staff console. Other devices on the same Wi-Fi can use `http://<this-computer's-IP>:3001`.

For development with hot reload, run these in two terminals:

```bash
npm run dev:server  # API on :3001
npm run dev         # web app on :5173 (proxies /api to :3001)
```

Server settings (environment variables):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `STAFF_PIN` | `1234` | Staff console PIN. **Change this.** |
| `DATA_FILE` | `server/data/db.json` | Where orders and bookings are saved |

## Backend

`server/index.js` is a small Express server:

- **REST API**: `POST /api/orders`, `PATCH /api/orders/:id`, `POST /api/bookings`, `PATCH /api/bookings/:id`, `GET /api/state`, `POST /api/staff/login`
- **Realtime**: `GET /api/events` (Server-Sent Events) pushes every change to every connected device. The bar gets a chime when a new order comes in, and guests see their order and booking status update live.
- **Rules enforced on the server**: prices and totals are recalculated, table numbers are required for table service, and the same space and time can't be double-booked (bar counter and rooftop take several parties). Guests can only cancel or rate their *own* orders. Moving orders through the kitchen and confirming bookings needs a staff token from the PIN.
- **Storage**: a JSON file with atomic writes, so there is no database to install. For heavy traffic, swap in Postgres or SQLite behind the same endpoints.
- Also serves the built web app, so one process runs everything.

### Hosting
A `Dockerfile` is included:

```bash
docker build -t rizz .
docker run -p 3001:3001 -e STAFF_PIN=4821 -v rizz-data:/data rizz
```

This works on any Docker host, such as Railway, Fly.io, Render or a VPS. Mount a **persistent volume** at `/data`, or orders will be lost on redeploy.

## Android app (APK)

The `android/` folder is a native Android project (Capacitor) that wraps the same app.

**Get the APK:** every push triggers the **Build Android app** GitHub Action. Open the repo's **Actions** tab, select the latest run, and download the **rizz-cocktail-bar-apk** artifact. Pushing a tag like `v1.0.0` also attaches the APK to a GitHub Release.

**Install:** copy `rizz-cocktail-bar.apk` to an Android phone, open it, and allow "install unknown apps". On first launch it asks for the **bar server address**, for example `https://rizz.example.com` or `192.168.1.20:3001` on the bar's Wi-Fi. This can be changed later under Profile → Server.

**Bake in the server address:** run the workflow manually (Actions → Build Android app → Run workflow) and fill in `api_url`, or set a repository variable `RIZZ_API_URL`. Guests then never see the server prompt.

**Build locally** (requires Android Studio / Android SDK and JDK 17):

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug   # → app/build/outputs/apk/debug/app-debug.apk
```

The APK is a debug-signed build, fine for installing directly on phones and tablets. To publish on Google Play, create a signing key and run `./gradlew bundleRelease`.

## Customising
- **Bar details, currency, service fee, staff PIN**: `src/config.ts`
- **Menu**: `src/data/menu.ts`
- **Bookable spaces, time slots, occasions**: `src/data/spaces.ts`
- **Photos**: the `<Art>` component takes an `img` prop. Swap the gradient placeholders for real photography.
- **Theme colours**: CSS variables at the top of `src/styles.css`

## Architecture

```
server/index.js      backend: REST API, realtime events, JSON storage
android/             native Android project (Capacitor)
src/
  App.tsx            screen router, bottom nav, staff gate
  config.ts          bar settings
  types.ts           Order, Booking, MenuItem, Space…
  data/              menu + spaces
  api.ts             server address, fetch helper, live event stream
  store/store.ts     app state + actions (orders/bookings via API; cart on device)
  components/        Icon, Art, TopBar, Chip, Stepper…
  screens/           Welcome, Home, Menu, ItemDetail, Cart, OrderTracking,
                     Book, BookingDetail, Activity, Profile, Staff
```

Built with React 18, TypeScript and Vite on the front end, Node and Express on the back end, and Capacitor for Android.

### Production checklist
1. Set a strong `STAFF_PIN` and serve over HTTPS.
2. Use a persistent volume for `DATA_FILE`, or move to Postgres for multiple server instances.
3. Add payments (Stripe, M-Pesa, etc.) at checkout and SMS/WhatsApp booking confirmations.
