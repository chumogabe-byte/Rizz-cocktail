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
- **Events & Offers page** (bottom bar → Events): a hero carousel of featured events and offers, then events and offers stacked as **square 1:1 cards in two columns**. Event cards show a date badge and "From $X / Free / Sold out"; offer cards open the right menu section or save a promo code. Filter by All, Events or Offers.
- **Event tickets**: each event can have several ticket types (Early bird, Regular, VIP table, Free RSVP…), each with its own price and limited quantity. Guests pick quantities and get **one QR-code ticket per person** under My tickets. Paid tickets are reserved and paid at the door or bar; free RSVPs are confirmed straight away. Paid tickets earn Rizz Rewards points.
- **Book a space**: Bar Counter, Lounge Booth, Rooftop, VIP Room or the full venue. Slots that are already taken are blocked across devices.
- **Moments (socials)**: guests post photos from their night with a caption. Everyone can like them (double-tap works too), with Latest and Top views. Photos are resized on the phone before upload.
- **Rizz Rewards**: every app order is tracked to the guest's account. Each 1 spent on served orders earns 1 point, and each points milestone automatically issues a **personal one-time reward code**. A wallet shows the guest's codes, points and stats.
- **Ad spaces**: offer cards inside the home page, the menu list and the Moments feed.

### Motion & interactions
- **Scroll effects**: cards and rows glide in with a stagger as they enter the screen. Hero art and event or item photos move with a parallax depth effect. The Home headline drifts and fades as you scroll. Headers turn frosted glass after scrolling. A gradient progress bar runs along the top of long pages.
- **Touch and pointer**: event tiles, hero slides, offer and reward cards tilt in 3D with a moving glare under the finger or mouse. Buttons ripple when tapped.
- **Delight**: added drinks **fly into the cart** and the cart bounces. **Confetti** marks a successful M-Pesa payment, buying tickets, an order coming out (ready or served) and a new reward code. Points and totals count up. Offer prices glow, and hero slides have a light sweep and timed progress dots.
- **Navigation**: pages slide in and out like a native app, and a glowing pill springs between bottom-bar tabs. Cocktail bubbles rise and a floating mosaic moves on the welcome screen.
- **Accessibility**: everything switches off automatically when the phone's *Reduce motion* setting is on.

### One app, two logins
The **Rizz** app is used by everyone:
- **Guests** tap *Get Started* and use the app as normal.
- **Staff and admins** tap **🔐 Staff & admin login** on the welcome screen (or *Profile → Staff & admin*) and enter their PIN. On the web this is also at `https://<server>/admin`.
- While logged in as admin, **👀 Preview as guest** shows the guest app exactly as customers see it, so you can check your edits. A pill at the top takes you back to admin.
- An optional **admin-only APK** can still be built (Actions → Build Android apps → Run workflow → `admin-only`).

**Two access levels** (set on the server):
- **`ADMIN_PIN`** (owner / manager) gets full control: menu & prices, item photos, offers & hero slides, promo codes & rewards, events, spaces, customers, and **App & Branding**.
- **`STAFF_PIN`** (bartenders / door staff) covers operations only: orders, bookings, event sales & door check-in, and moderating Moments. The server rejects any staff attempt to change prices or content.

**What the admin can change without touching code** (every change is live on all guest phones instantly):
- **Menu & Prices**: add, edit or delete items; **quick-edit prices right in the list** (type and press Enter); offer prices, photos, options, sold out; category-wide offers; **scheduled happy hours**.
- **Spaces**: bookable areas with photo, description, min/max guests, minimum spend, perks, "several groups per slot", and show/hide.
- **App & Branding**: bar name, tagline, address, opening hours, phone, service charge %, the home-screen headline, photos for the "Order" and "Book" buttons, and the welcome screen title, subtitle and up to 6 background photos.
- **Offers & Hero slides**, **Events & Tickets**, **Promo codes & Rewards**, **Moments**, **Customers**, **Dashboard**.

### Staff console sections (Rizz Admin)
- **Orders**: New → Preparing → Ready board with sound alerts. Tickets show any promo code used.
- **Bookings**: confirm, decline, check in.
- **Events & Tickets**: create and edit events with a square photo or flyer, tagline, start and end time, location, description, ticket types (name, price, how many available), ★ featured (leads the hero carousel), and published or hidden. Each event has a sales list (mark paid, check in, cancel to free places) and a capacity bar. **Door check-in** works by typing or scanning a ticket code; it warns about unpaid tickets and blocks codes that have already been used. Totals show ticket revenue paid and still to collect.
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

Open `http://localhost:3001` for the guest app and `http://localhost:3001/admin` for the admin app. Other devices on the same Wi-Fi can use `http://<this-computer's-IP>:3001`.

For development with hot reload, run these in two terminals:

```bash
npm run dev:server  # API on :3001
npm run dev         # web app on :5173 (proxies /api to :3001)
```

Server settings (environment variables):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `ADMIN_PIN` | `0000` | Owner/manager PIN: full control. **Change this.** |
| `STAFF_PIN` | `1234` | Staff PIN: operations only. **Change this.** |
| `DATA_FILE` | `server/data/db.json` | Where data is saved. Photos go in an `uploads/` folder next to it. |

## Rizz Wallet

Guests can **load money** into a Rizz Wallet and pay for **orders and event tickets in one tap**.

- **Top up**: with M-Pesa (quick amounts KSh 500 to 10,000, or any amount from KSh 50), or with **cash at the bar** (staff add it in Rizz Admin → Wallets).
- **Pay**: the wallet is the default payment whenever it covers the total. Unpaid orders and tickets can also be paid from the wallet later. Payment is instant, and the order goes straight in as **Paid**.
- **Refunds**: if staff cancel a wallet-paid order or ticket, the money goes back to the wallet automatically.
- **Top-up bonus promo**: in Rizz Admin → Wallets, set "X% extra on top-ups of at least KSh Y". It applies to M-Pesa and cash top-ups, and guests see the offer on their wallet screen.
- **History**: guests see every top-up, bonus, payment and refund with a running balance.
- **Admin → Wallets**: totals held in wallets, top-ups, net wallet spend and bonuses given; find any guest; record **cash top-ups** (staff); **adjust** balances (admin only), for example moving a balance to a guest's new phone; recent activity log.
- **Rules on the server**: balances can never go negative, payments are deducted at the moment an order is created, and every change is recorded.

> A wallet belongs to the guest's Rizz account on their phone. If someone changes phones, an admin can move the balance with an adjustment.

## Current promotions (loaded automatically)
These ship as a **content pack** (`server/content-pack.js`). It's added to new and existing servers once on start. After that you own it: edit or delete anything in Rizz Admin and it won't come back.

| Promo | How it works in the app |
|---|---|
| **Happy Hour: 3 cocktails for KSh 1,000** (2–5 PM daily) | Ad + *Happy Hour Trio* (pick any 3 classics). It can only be ordered 2–5 PM Kenya time; the server enforces this |
| **Shisha Happy Hour** (2–5 PM daily) | New *Shisha* menu (shisha, shisha + 2 cocktails, + bucket of beers, + prosecco) with a scheduled 20% happy hour, plus an ad |
| **Karaoke Sundays** | Event that repeats every Sunday 7 PM (free RSVP + reserved table with priority songs), plus an ad |
| **Rizz XP × Homeboys** | Featured event with KSh 1,000 tickets, plus an ad (set the real date in Admin → Events) |
| **Chinese Platter + select bottle** | Bundle at KSh 6,900 (normally 8,500) with a bottle choice and upgrades, plus an ad |
| **Tattoo Saturdays** | Weekly Saturday event + ad + *Small Tattoo* for KSh 500, orderable only on Saturdays **with a bottle in the same order** |

Reusable building blocks behind these, all editable in Rizz Admin:
- **Menu items available only at certain times** (Menu & Prices → item → "Only available at certain times").
- **"Counts as a bottle" / "Only with a bottle in the same order"** item rules.
- **Weekly repeating events** (Events → "Repeats every week"). Tickets are for the next occurrence, and sales are counted per week.
- **Ads that open an event or a specific menu item.**

## Happy hours (automatic)
In Rizz Admin → Menu & Prices → **Happy hours**, schedule a discount: name, menu section (or the whole menu), % off, days and a time window (Kenya time; windows can run past midnight). While it runs:
- guests see a **🍹 Happy hour is ON** banner on Home, plus a "Happy hour" badge and the reduced price on each item
- the **server charges the happy-hour price**, and prices switch back automatically when it ends
- an item's own offer price is used instead if it's even lower

Switch any happy hour on or off with one tap.

## Live alerts
Guests get a pop-up and a vibration whichever screen they're on when their order is being prepared, is **ready**, or is cancelled (with the refund noted), and when a booking is **confirmed** or declined.

## Serving options
At checkout guests choose **🪑 To my seat** (table or seat number), **🙋 Find me** (no seat needed, with an optional hint like "near the DJ booth, red jacket"; staff see the guest's name and hint on the ticket), or **🛎️ Pickup** at the bar.

## M-Pesa payments

Guests can pay for **orders** and **event tickets** with **M-Pesa Express (STK Push)** to the Rizz **Buy Goods Till 1750964**. They choose M-Pesa at checkout, confirm their Safaricom number, and approve the PIN prompt on their phone. The order or ticket switches to **Paid** live, with the M-Pesa receipt number, on the guest's phone and the staff console. Guests can also choose **Pay at the bar / door**, and staff mark those paid (cash or card).

- **Checkout and tickets**: an M-Pesa / Pay at bar choice. The prompt is sent the moment the order or reservation is made.
- **Retries**: failed or cancelled payments show a clear reason (wrong PIN, insufficient balance, cancelled, phone unreachable) and can be retried, including with a different number.
- **Pay later**: unpaid orders and tickets can be paid with M-Pesa at any time from the order page or My tickets.
- **Staff**: every order and ticket shows its payment status (*M-Pesa ✓ receipt*, *prompt sent*, *failed*, *pay at bar*), with **Mark paid (cash/card)** for the rest. The Overview shows M-Pesa collected today and unpaid orders. The header shows the M-Pesa mode (TEST MODE / Sandbox / Live).
- **Safety**: amounts always come from the server (whole shillings). Safaricom's confirmations go to a secret URL and must match the expected amount. Guests can't cancel an order that's paid or mid-payment. Paid tickets earn reward points.

### Modes
| `MPESA_ENV` | What happens |
|---|---|
| `mock` *(default)* | Test mode with no Safaricom account. Payments succeed after about 4 seconds; numbers ending in **000** simulate a failed payment. |
| `sandbox` | Real Daraja sandbox calls using your test app's keys. |
| `production` | Live payments to your Paybill or Till. |

### Going live
1. Create an app at **developer.safaricom.co.ke** with **M-Pesa Express**, and get your consumer key and secret.
2. Apply to Safaricom for **Lipa na M-Pesa Online** on your Paybill or Till to get the **passkey** (sandbox uses shortcode `174379` and the passkey shown on the Daraja simulator page).
3. Host the server on **HTTPS** and set the variables in `.env.example`: `MPESA_ENV=production`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL` (your server's public address). Payments go to the **Buy Goods Till 1750964** by default (`MPESA_TILL`). If Safaricom gave you a separate **Store number** with the passkey, set it as `MPESA_SHORTCODE`; otherwise the till number is used.
4. Restart the server. The staff header should now say **Sandbox** or **Live**.

If Safaricom's confirmation can't reach the server (for example, a server on the bar's local Wi-Fi), the app falls back to asking Daraja for the payment status, so payments still complete. Only the receipt number is missing in that case.

> Prices are in **Kenyan shillings** (set in `src/config.ts`). The starting menu, events and minimum spends were set in KSh. Adjust any price in the staff console (Menu & Offers / Events).

## Backend

`server/index.js` is a small Express server:

- **REST API**: orders, bookings, social posts and likes, ads, vouchers (`/api/vouchers/validate`), reward settings, customer insights, photo uploads (served from `/uploads`), and staff login
- **Realtime**: `GET /api/events` (Server-Sent Events) pushes every change, **filtered per viewer**. Staff see everything. Guests see only their own orders, bookings and reward codes, plus public posts and ads. Other guests' bookings come through only as slot availability (no names or phone numbers). The bar gets a chime when a new order comes in, and guests see their order and booking status update live.
- **Rules enforced on the server**: item prices come from the server's menu (a phone can't send its own prices), sold-out items are refused, totals and discounts are recalculated, table numbers are required for table service, and the same space and time can't be double-booked (bar counter and rooftop take several parties). Guests can only cancel or rate their *own* orders. Moving orders through the kitchen and confirming bookings needs a staff token from the PIN.
- **Storage**: a JSON file with atomic writes, plus uploaded photos in `<data dir>/uploads`, so there is no database to install. For heavy traffic, swap in Postgres or SQLite behind the same endpoints.
- Also serves the built web app, so one process runs everything.

### Hosting
**Step-by-step guide: [DEPLOY.md](DEPLOY.md)** (Render Blueprint via `render.yaml`, Railway, or any Docker VPS).

A `Dockerfile` is included:

```bash
docker build -t rizz .
docker run -p 3001:3001 -e STAFF_PIN=4821 -v rizz-data:/data rizz
```

This works on any Docker host, such as Railway, Fly.io, Render or a VPS. Mount a **persistent volume** at `/data`, or orders will be lost on redeploy.

## Android app (APK)

The `android/` folder is a native Android project (Capacitor) that wraps the same app.

**Get the APK:** every push triggers the **Build Android apps** GitHub Action. Open the repo's **Actions** tab, select the latest run, and download **rizz-app-apk**: one app for guests *and* staff/admin. For an admin-only app as well, use **Run workflow** and pick `admin-only` or `both`. Pushing a tag like `v1.0.0` also attaches the APK to a GitHub Release.

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
