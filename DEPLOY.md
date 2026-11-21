# Deploying the Rizz server

The server is one Docker service. It runs the API, live updates, M-Pesa and the web app, and keeps orders and photos on a disk. Below is the recommended route: **Render**, about US$7/month plus about $0.25/month for a 1 GB disk.

> Don't use a free tier. Free instances lose all data on every restart and sleep after 15 minutes, which breaks live orders.

## 1. Create the service on Render (about 10 minutes)

1. Go to **render.com**, sign up **with GitHub**, and give Render access to the `Rizz-cocktail` repository.
2. In the Render dashboard click **New → Blueprint**.
3. Pick the `Rizz-cocktail` repo and the branch **`claude/rizz-bar-app-y9l8ld`** (or `main`, if you merge into it).
   Render reads `render.yaml` and shows **rizz-cocktail-bar** (web service, Starter plan, 1 GB disk at `/data`, Frankfurt region).
4. Fill in the values it asks for:
   - **STAFF_PIN**: the PIN your staff will use for the console. Don't use 1234.
   - Leave the `MPESA_*` keys blank for now. M-Pesa stays in safe test mode.
5. Click **Apply** and add a payment card when asked. The first build takes about 3 to 5 minutes.
6. When the status is **Live**, your address is shown at the top, for example `https://rizz-cocktail-bar.onrender.com`.

**Check it:**
- `https://<your-address>/`: the guest app
- `https://<your-address>/#staff`: the staff console (enter your PIN)
- `https://<your-address>/#tv`: the bar TV screen
- `https://<your-address>/api/health` should show `{"ok":true}`

Every push to the branch redeploys automatically. Data on the disk is kept, and Render takes daily disk snapshots.

## 2. Point the Android app at your server

So guests are never asked for a server address:

1. In GitHub open the repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**.
2. Name: `RIZZ_API_URL`. Value: your Render address, e.g. `https://rizz-cocktail-bar.onrender.com` (no trailing slash).
3. Go to **Actions → Build Android app → Run workflow**. The new APK in the run's **Artifacts** has the address built in.

(The web app needs nothing. It is served by the same server, so guests can also just open the URL in a browser.)

## 3. Use your own domain (optional)

In Render: **rizz-cocktail-bar → Settings → Custom Domains → Add**, e.g. `app.rizzbar.co.ke`. Add the CNAME record Render shows at your domain registrar. HTTPS is set up automatically. Then update `RIZZ_API_URL` and rebuild the APK.

## 4. Turn on real M-Pesa payments

When Safaricom has given you the Daraja keys and the Lipa na M-Pesa Online **passkey** for **Till 1750964**:

1. In Render open **rizz-cocktail-bar → Environment** and set:
   - `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`
   - `MPESA_SHORTCODE`: only if Safaricom gave you a separate **Store number** for the till.
   - `MPESA_ENV`: first `sandbox` with sandbox keys to try it, then `production`.
2. Save. Render restarts the service. The staff console header changes from **M-Pesa: TEST MODE** to **Sandbox** or **Live**.

The payment confirmation address (callback) is set automatically from your Render URL. If you use a custom domain, set `MPESA_CALLBACK_URL=https://app.rizzbar.co.ke` so Safaricom uses that.

## Other hosts

- **Railway**: New Project → Deploy from GitHub repo (it uses the Dockerfile). Add a **Volume** mounted at `/data`, set `STAFF_PIN`, and generate a public domain. The public URL is detected automatically.
- **Any VPS (e.g. a Nairobi or EU cloud server)** with Docker:
  ```bash
  docker build -t rizz .
  docker run -d --restart unless-stopped -p 80:3001 -v rizz-data:/data \
    -e STAFF_PIN=4821 -e MPESA_CALLBACK_URL=https://your-domain rizz
  ```
  Put it behind HTTPS (e.g. Caddy or Cloudflare). M-Pesa requires HTTPS for callbacks.

## Settings reference
All settings are listed in `.env.example`. The important ones are `STAFF_PIN`, `DATA_FILE` (default `/data/db.json`), the `MPESA_*` keys, and `MPESA_CALLBACK_URL` / `PUBLIC_URL`, which are only needed if your host doesn't provide its address.
