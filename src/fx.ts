/**
 * Motion & interaction effects for Rizz.
 *  - Scroll: --sy CSS variable (parallax), frosted header after scrolling, top progress bar
 *  - Reveal-on-scroll with stagger for cards/rows (auto-applied to common selectors)
 *  - 3D tilt + glare on cards under the pointer/finger
 *  - Ripple on button press
 *  - flyToCart() and confetti() helpers
 * Everything is skipped when the user prefers reduced motion.
 */

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const REVEAL_SELECTORS = [
  '.menu-row', '.row-card', '.tile-grid .tile', '.feature-card', '.offer-card', '.post', '.cart-line', '.voucher',
  '.ticket-type', '.ticket-order', '.cat-tile', '.moment-tile', '.space-card', '.quick-actions .qa', '.rewards-card',
  '.ad-banner', '.share-cta', '.info-card', '.card', '.stats-grid > div', '.date-pill', '.tile-sm', '.loyalty',
  '.kpi', '.event-admin', '.menu-admin-row', '.mod-card', '.ad-admin',
].join(',');

const TILT_SELECTORS = '.tile, .feature-card, .offer-card, .hero-slide, .qa, .rewards-card, .loyalty, .ad-banner, .space-card';

let started = false;

export function initFx() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const root = document.documentElement;

  // ---- progress bar element ----
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);

  // ---- scroll-linked variables ----
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      root.style.setProperty('--sy', String(y));
      root.style.setProperty('--sp', (y / max).toFixed(4));
      document.body.classList.toggle('scrolled', y > 8);
      bar.style.transform = `scaleX(${y / max})`;
      bar.style.opacity = max > 200 && y > 4 ? '1' : '0';
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // ---- ripple on press ----
  document.addEventListener('pointerdown', (e) => {
    const btn = (e.target as HTMLElement).closest('.btn, .chip, .add-btn, .seg button, .bottom-nav button, .icon-btn') as HTMLElement | null;
    if (!btn || reducedMotion() || btn.hasAttribute('disabled')) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(span);
    setTimeout(() => span.remove(), 650);
  });

  if (reducedMotion()) return;

  // ---- reveal on scroll ----
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

  const tag = (el: Element) => {
    if ((el as HTMLElement).dataset.rv) return;
    (el as HTMLElement).dataset.rv = '1';
    // stagger siblings that appear together
    const idx = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    (el as HTMLElement).style.setProperty('--rv-delay', `${Math.min(idx, 8) * 55}ms`);
    el.classList.add('rv');
    io.observe(el);
  };
  const scan = (node: ParentNode) => node.querySelectorAll?.(REVEAL_SELECTORS).forEach(tag);
  scan(document);
  new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      const el = n as Element;
      if (el.matches?.(REVEAL_SELECTORS)) tag(el);
      scan(el);
    });
  }).observe(document.body, { childList: true, subtree: true });

  // ---- 3D tilt + glare ----
  let tiltEl: HTMLElement | null = null;
  const reset = (el: HTMLElement) => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.classList.remove('tilting'); };
  document.addEventListener('pointermove', (e) => {
    const el = (e.target as HTMLElement).closest(TILT_SELECTORS) as HTMLElement | null;
    if (tiltEl && tiltEl !== el) reset(tiltEl);
    tiltEl = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    const max = el.classList.contains('hero-slide') ? 4 : 9;
    el.classList.add('tilting');
    el.style.setProperty('--rx', `${(-py * max).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(px * max).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
  }, { passive: true });
  const end = () => { if (tiltEl) reset(tiltEl); tiltEl = null; };
  document.addEventListener('pointerleave', end);
  document.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') end(); });
  document.addEventListener('pointercancel', end);
}

/** Fly a little emoji from `from` to the cart icon / cart bar, then bump the cart. */
export function flyToCart(from: Element | null, emoji: string) {
  const target = document.querySelector('.cart-bar, .topbar .badge-wrap, .home-head .badge-wrap') as HTMLElement | null;
  const bump = () => target?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
    { duration: 380, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  if (!from || !target || reducedMotion()) { bump(); return; }
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fly-item';
  el.textContent = emoji;
  el.style.left = `${a.left + a.width / 2}px`;
  el.style.top = `${a.top + a.height / 2}px`;
  document.body.appendChild(el);
  const dx = b.left + Math.min(b.width, 60) / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  el.animate([
    { transform: 'translate(-50%,-50%) scale(1) rotate(0)', opacity: 1 },
    { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 120}px)) scale(1.4) rotate(-20deg)`, opacity: 1, offset: 0.45 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.35) rotate(30deg)`, opacity: 0.4 },
  ], { duration: 720, easing: 'cubic-bezier(.45,.05,.4,1)' }).onfinish = () => { el.remove(); bump(); };
}

/** Burst of confetti + cocktail emojis. */
export function confetti({ x = window.innerWidth / 2, y = window.innerHeight / 3, count = 70, emojis = ['🍸', '🥂', '✨', '🎉'] } = {}) {
  if (reducedMotion()) return;
  const colors = ['#7c5cff', '#d4ff5a', '#f472b6', '#38bdf8', '#fbbf24', '#ffffff'];
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  document.body.appendChild(layer);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    const isEmoji = i % 9 === 0;
    p.className = isEmoji ? 'confetti-emoji' : 'confetti-bit';
    if (isEmoji) p.textContent = emojis[i % emojis.length];
    else p.style.background = colors[i % colors.length];
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    layer.appendChild(p);
    const angle = Math.random() * Math.PI * 2;
    const speed = 160 + Math.random() * 260;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 180;
    p.animate([
      { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 420}px)) rotate(${(Math.random() - 0.5) * 900}deg)`, opacity: 0 },
    ], { duration: 1300 + Math.random() * 900, easing: 'cubic-bezier(.15,.6,.4,1)', fill: 'forwards' });
  }
  setTimeout(() => layer.remove(), 2400);
}
