import { useEffect, useRef, useState } from 'react';
import type { Ad, Category, Placement } from '../types';
import type { Nav } from '../router';
import { actions, showToast, useStore } from '../store/store';
import { mediaUrl } from '../api';
import { CATEGORIES } from '../data/menu';

export const AD_THEMES: Record<string, [string, string]> = {
  purple: ['#8B6CFF', '#2A1B6B'],
  lime: ['#D4FF5A', '#3B4F0A'],
  blue: ['#38BDF8', '#0B2347'],
  orange: ['#FB923C', '#4A1A00'],
  pink: ['#F472B6', '#4C0527'],
  gold: ['#FCD34D', '#3A2700'],
  red: ['#F43F5E', '#3F0613'],
};
export const darkText = (theme: string) => theme === 'lime' || theme === 'gold';

export function adBackground(ad: { theme: string; image?: string }) {
  const [a, b] = AD_THEMES[ad.theme] ?? AD_THEMES.purple;
  return ad.image
    ? `linear-gradient(90deg, rgba(10,8,20,.85) 0%, rgba(10,8,20,.35) 60%, rgba(10,8,20,.1) 100%), center/cover url("${mediaUrl(ad.image)}")`
    : `radial-gradient(120% 140% at 85% 30%, ${a} 0%, ${b} 75%)`;
}

/** Runs an ad's call-to-action. */
export function useAdAction(nav: Nav) {
  return (ad: Ad) => {
    const { type, target } = ad.cta;
    if (type === 'menu') nav.go({ name: 'menu', category: CATEGORIES.some((c) => c.id === target) ? (target as Category) : undefined });
    else if (type === 'item') nav.go({ name: 'item', id: target });
    else if (type === 'book') nav.go({ name: 'book', spaceId: target || undefined });
    else if (type === 'social') nav.go({ name: 'social' });
    else if (type === 'code' && target) {
      actions.applyCode(target);
      showToast(`🎟️ Code ${target} saved — it'll be applied at checkout.`);
    }
  };
}

export interface Slide {
  key: string;
  kicker: string;
  title: string;
  subtitle?: string;
  cta?: string;
  background: string;
  emoji?: string;
  ink?: boolean;
  onClick: () => void;
}

/** Auto-advancing, swipeable hero carousel. */
export function Carousel({ slides }: { slides: Slide[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % slides.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, 4500);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  if (!slides.length) return null;
  return (
    <div className="hero" onPointerDown={() => setPaused(true)} onPointerUp={() => setTimeout(() => setPaused(false), 4000)}>
      <div className="hero-track" ref={ref} onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {slides.map((sl) => (
          <div key={sl.key} className="hero-slide-wrap" onClick={sl.onClick} role="button" tabIndex={0}>
            <div className={`hero-slide ${sl.ink ? 'ink' : ''}`} style={{ background: sl.background }}>
              <div className="hero-copy">
                <span className="hero-kicker">{sl.kicker}</span>
                <h2>{sl.title}</h2>
                {sl.subtitle && <p>{sl.subtitle}</p>}
                {sl.cta && <span className="hero-cta">{sl.cta} →</span>}
              </div>
              {sl.emoji && <span className="hero-emoji">{sl.emoji}</span>}
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && <div className="hero-dots">{slides.map((sl, i) => <span key={sl.key} className={i === idx ? 'on' : ''} />)}</div>}
    </div>
  );
}

export const adSlide = (ad: Ad, act: (ad: Ad) => void): Slide => ({
  key: ad.id, kicker: 'Latest offer', title: ad.title, subtitle: ad.subtitle, background: adBackground(ad),
  cta: ad.cta.type !== 'none' ? ad.cta.label || 'View' : undefined, emoji: ad.image ? undefined : ad.emoji,
  ink: darkText(ad.theme) && !ad.image, onClick: () => act(ad),
});

/** Hero carousel fed by the ads placed on this page. */
export function HeroSlider({ placement, nav, extra = [] }: { placement: Placement; nav: Nav; extra?: Slide[] }) {
  const ads = useStore((s) => s.ads).filter((a) => a.active && a.placements.includes(placement));
  const act = useAdAction(nav);
  return <Carousel slides={[...extra, ...ads.map((a) => adSlide(a, act))]} />;
}

/** Compact in-feed ad card. `index` picks which ad to show so multiple banners on a page rotate. */
export function AdBanner({ placement, nav, index = 0 }: { placement: Placement; nav: Nav; index?: number }) {
  const ads = useStore((s) => s.ads).filter((a) => a.active && a.placements.includes(placement));
  const act = useAdAction(nav);
  if (!ads.length) return null;
  const ad = ads[(index + 1) % ads.length];
  return (
    <button className={`ad-banner ${darkText(ad.theme) && !ad.image ? 'ink' : ''}`} style={{ background: adBackground(ad) }} onClick={() => act(ad)}>
      <span className="ad-tag">AD</span>
      {!ad.image && <span className="ad-emoji">{ad.emoji}</span>}
      <span className="ad-copy"><strong>{ad.title}</strong>{ad.subtitle && <small>{ad.subtitle}</small>}</span>
      {ad.cta.type !== 'none' && <span className="ad-cta">{ad.cta.label || 'View'}</span>}
    </button>
  );
}
