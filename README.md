# Rizz Cocktail Bar 🍸

A mobile-first web app for **Rizz Cocktail Bar & Lounge**. Guests order drinks and food to their table, book spaces at the bar, and track everything live. Staff get a console where they **receive orders** and **manage bookings** in real time.

The design takes cues from modern nightlife apps: a dark UI with electric purple and lime accents, rounded cards, chip filters and a floating bottom nav.

## Features

### Guests
- **Hero slides on every main page**: rotating, swipeable offer banners on Home, Menu, Book and Moments. Tapping one opens the right menu section, starts a booking, or saves a promo code.
- **Full drinks & food menu**: three sections:
  - **Alcoholic**: Cocktails, Vodka, Gin, Whiskey, Rum, Tequila, Wine, Champagne, Beer & Cider, Liqueurs, Shots. Spirits are priced per single, with Double and Bottle options and neat, on the rocks or with a mixer.
  - **Soft drinks**: Mocktails, Sodas & Juices, Red Bull, water, coffee.
  - **Food**: Small Plates, Mains, Desserts.
- **Ordering**: item options, special requests, table or pickup, tips, and **promo / reward codes at checkout** (checked by the server).
- **Live order tracking**: Received → Mixing → Ready → Served, plus feedback and order-again.
- **Book a space**: Bar Counter, Lounge Booth, Rooftop, VIP Room or the full venue. Slots that are already taken are blocked across devices.
- **Moments (socials)**: guests post photos from their night with a caption. Everyone can like them (double-tap works too), with Latest and Top views. Photos are resized on the phone before upload.
- **Rizz Rewards**: every app order is tracked to the guest's account. Each 1 spent on served orders earns 1 point, and each points milestone automatically issues a **personal one-time reward code**. A wallet shows the guest's codes, points and stats.
- **Ad spaces**: offer cards inside the home page, the menu list and the Moments feed.

### Staff console (`/#staff`, default PIN `1234`)
- **Orders**: New → Preparing → Ready board with sound alerts. Tickets show any promo code used.
- **Bookings**: confirm, decline, check in.
- **Menu & Offers**: add, edit and delete menu items, including name, category, price, **offer price**, description, photo or emoji and colour, tags, ABV, a "Hot" flag, and option groups. Presets cover spirit single/double/bottle, glass/bottle and spirit upgrades, or build custom groups. One tap marks an item **sold out**. **Quick category offer** puts a whole section (or the whole menu) at X% off and clears it again later. Offers show with the old price crossed out, an "Offer" badge, and a "Today's offers" row on the home screen. Changes go live on every device instantly.
- **Promo codes & Rewards**: create promo codes (percent or amount off, minimum spend, uses per guest, total uses, expiry, first-order-only) and pause or resume them. Each code's redemptions are tracked. The loyalty rules (points per reward, reward value) can be edited.
- **Ads & Slides**: create ads with a headline, sub-text, colour or photo, and a button (open a menu section, book, give a promo code, open Moments). Choose where each ad shows (Home, Menu, Book, Moments, bar TVs). Changes go live on every device instantly.
- **Moments**: feature great photos (they lead on the TVs), hide or delete inappropriate ones.
- **Customers**: every app user with served orders, spend, points, codes used, posts and last order. There's a top-spender leaderboard, search, and a **CSV export** for running promos (for example, texting codes to guests who haven't been in lately).
- **Overview**: revenue, orders, average order, discounts given, promo orders, moments, bookings, top sellers, ratings.

### Bar TV screens (`/#tv`)
Open `/#tv` on a smart TV or a laptop connected to a screen. It shows full-screen rotating offers (ads placed on "Bar TVs"), guests' latest photos with featured ones first, a scrolling ticker, a clock, and a **QR code to open the app** with the WELCOME10 offer. Use `/#tv?app=https://your-app-link` to point the QR code somewhere else, such as an app download page.

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
| `DATA_FILE` | `server/data/db.json` | Where data is saved. Photos go in an `uploads/` folder next to it. |

## Backend

`server/index.js` is a small Express server:

- **REST API**: orders, bookings, social posts and likes, ads, vouchers (`/api/vouchers/validate`), reward settings, customer insights, photo uploads (served from `/uploads`), and staff login
- **Realtime**: `GET /api/events` (Server-Sent Events) pushes every change, **filtered per viewer**. Staff see everything. Guests see only their own orders, bookings and reward codes, plus public posts and ads. Other guests' bookings come through only as slot availability (no names or phone numbers). The bar gets a chime when a new order comes in, and guests see their order and booking status update live.
- **Rules enforced on the server**: item prices come from the server's menu (a phone can't send its own prices), sold-out items are refused, totals and discounts are recalculated, table numbers are required for table service, and the same space and time can't be double-booked (bar counter and rooftop take several parties). Guests can only cancel or rate their *own* orders. Moving orders through the kitchen and confirming bookings needs a staff token from the PIN.
- **Storage**: a JSON file with atomic writes, plus uploaded photos in `<data dir>/uploads`, so there is no database to install. For heavy traffic, swap in Postgres or SQLite behind the same endpoints.
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
- **Menu**: edit it live in the staff console (Menu & Offers). The starting menu is `server/seed-menu.json`, and categories live in `src/data/menu.ts`.
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
