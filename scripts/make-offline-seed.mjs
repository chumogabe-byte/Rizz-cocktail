/**
 * Snapshot the server's starting content (menu, offers, events, happy hours, spaces, branding) into
 * src/data/offline-seed.json, so the app shows everything even before it reaches a server.
 * Runs automatically before every build (npm run build / build:admin).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rizz-seed-'));
const port = 3900 + Math.floor(Math.random() * 90);
const srv = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, PORT: String(port), DATA_FILE: path.join(dir, 'db.json'), MPESA_ENV: 'mock', ADMIN_PIN: 'seed-pin', STAFF_PIN: 'seed-staff' },
  stdio: 'ignore',
});
const stop = () => { try { srv.kill(); } catch { /* ignore */ } fs.rmSync(dir, { recursive: true, force: true }); };

try {
  let state = null;
  for (let i = 0; i < 50 && !state; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try { state = await (await fetch(`http://127.0.0.1:${port}/api/state?customerId=offline-seed`)).json(); } catch { /* not up yet */ }
  }
  if (!state) throw new Error('server did not start');
  // Use the staff view so prices are the base prices (no happy hour that happens to be running right now)
  const { token } = await (await fetch(`http://127.0.0.1:${port}/api/staff/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: 'seed-pin' }) })).json();
  const raw = await (await fetch(`http://127.0.0.1:${port}/api/state?token=${token}`)).json();
  const seed = {
    generatedAt: new Date().toISOString(),
    menu: raw.menu.map(({ happyHour, hhPrice, ...m }) => m),
    ads: raw.ads.filter((a) => a.active),
    events: raw.events.filter((e) => e.published),
    happyHours: [], // live happy-hour banners only come from the server
    spaces: raw.spaces.filter((x) => x.active !== false),
    content: raw.content,
    settings: { rewardThreshold: raw.settings.rewardThreshold, rewardValue: raw.settings.rewardValue, pointsPerUnit: raw.settings.pointsPerUnit,
      walletBonusPercent: raw.settings.walletBonusPercent, walletBonusMin: raw.settings.walletBonusMin },
  };
  fs.writeFileSync('src/data/offline-seed.json', JSON.stringify(seed));
  console.log(`offline seed: ${seed.menu.length} menu items, ${seed.ads.length} offers, ${seed.events.length} events, ${seed.spaces.length} spaces`);
} finally { stop(); }
