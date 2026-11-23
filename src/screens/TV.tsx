import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useStore } from '../store/store';
import { mediaUrl, getServerUrl } from '../api';
import { adBackground } from '../components/Promo';
import { useBar } from '../config';

/**
 * Big-screen mode for the bar's TVs: open /#tv on a smart TV / laptop plugged into a screen.
 * Rotates the offers placed on "TV", shows guests' latest moments and a QR code to get the app.
 * Optional: /#tv?app=https://link-to-your-app  (defaults to this server's address)
 */
export function TV() {
  const bar = useBar();
  const ads = useStore((s) => s.ads).filter((a) => a.active && a.placements.includes('tv'));
  const posts = useStore((s) => s.posts).filter((p) => !p.hidden);
  const online = useStore((s) => s.online);
  const [i, setI] = useState(0);
  const [p, setP] = useState(0);
  const [qr, setQr] = useState('');
  const [clock, setClock] = useState(new Date());

  const appUrl = new URLSearchParams(location.hash.split('?')[1] || '').get('app') || getServerUrl() || location.origin;

  useEffect(() => { QRCode.toDataURL(appUrl, { margin: 1, width: 360, color: { dark: '#0e0b1a', light: '#ffffff' } }).then(setQr); }, [appUrl]);
  useEffect(() => { const t = setInterval(() => setI((x) => x + 1), 8000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setP((x) => x + 1), 5000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 30000); return () => clearInterval(t); }, []);

  const ad = ads.length ? ads[i % ads.length] : null;
  const featured = [...posts.filter((x) => x.featured), ...posts.filter((x) => !x.featured)].slice(0, 12);
  const shown = featured.length ? [0, 1, 2].map((k) => featured[(p + k) % featured.length]).filter((x, k, a) => a.indexOf(x) === k) : [];

  return (
    <div className="tv">
      <header className="tv-head">
        <div className="brand-mark">RIZZ<span>.</span> <small>{bar.tagline}</small></div>
        <div className="tv-clock">{clock.toLocaleTimeString('en-GB', { timeZone: 'Africa/Nairobi', hour: 'numeric', minute: '2-digit', hour12: true })}{!online && ' · offline'}</div>
      </header>

      <main className="tv-main">
        <section className="tv-ad" key={ad?.id} style={ad ? { background: adBackground(ad) } : undefined}>
          {ad ? (
            <>
              <span className="tv-kicker">Tonight at Rizz</span>
              <h1>{ad.title}</h1>
              {ad.subtitle && <p>{ad.subtitle}</p>}
              {ad.cta.type === 'code' && <div className="tv-code">Code: <b>{ad.cta.target}</b></div>}
              {!ad.image && <span className="tv-emoji">{ad.emoji}</span>}
              <div className="tv-dots">{ads.map((a, k) => <span key={a.id} className={k === i % ads.length ? 'on' : ''} />)}</div>
            </>
          ) : <h1>Welcome to Rizz 🍸</h1>}
        </section>

        <aside className="tv-side">
          <div className="tv-moments">
            <h3>📸 Moments at Rizz</h3>
            {shown.length === 0 && <p className="muted">Post your photo in the app — it'll show up here!</p>}
            <div className="tv-photos">
              {shown.map((x) => (
                <figure key={x.id + p} className="tv-photo">
                  <img src={mediaUrl(x.image)} alt="" />
                  <figcaption><b>{x.author.split(' ')[0]}</b> {x.caption.slice(0, 60)} <span>♥ {x.likes.length}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
          <div className="tv-qr">
            {qr && <img src={qr} alt="Scan to open the Rizz app" />}
            <div>
              <strong>Order from your seat</strong>
              <span>Scan to open the Rizz app · earn rewards · share your moments</span>
              <span className="tv-welcome">First order? Use <b>WELCOME10</b></span>
            </div>
          </div>
        </aside>
      </main>

      <footer className="tv-ticker">
        <div className="tv-ticker-track">
          {[...ads, ...ads].map((a, k) => <span key={k}>✦ {a.title}{a.subtitle ? ` — ${a.subtitle}` : ''}</span>)}
        </div>
      </footer>
    </div>
  );
}
