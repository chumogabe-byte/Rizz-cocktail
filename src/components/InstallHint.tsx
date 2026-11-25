import { useState } from 'react';
import { Capacitor } from '@capacitor/core';

const KEY = 'rizz-install-hint-dismissed';

/** On iPhone/iPad Safari (not yet installed), explain how to put Rizz on the home screen. */
export function InstallHint() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } });
  if (!isIOS || standalone || Capacitor.isNativePlatform() || hidden) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } };
  return (
    <div className="install-hint" role="note">
      <span className="install-icon">📲</span>
      <div className="row-body">
        <strong>Install Rizz on your iPhone</strong>
        <span className="small">Tap <b>Share</b> <span aria-label="share icon">⬆︎</span> below, then <b>Add to Home Screen</b>. It opens full-screen like an app.</span>
      </div>
      <button className="link small" onClick={dismiss} aria-label="Dismiss">Got it</button>
    </div>
  );
}
