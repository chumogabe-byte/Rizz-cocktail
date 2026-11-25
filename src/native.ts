/**
 * Native (Android / iOS) integration:
 *  - Android hardware back button drives the app: close an open sheet/menu → go back a screen →
 *    return to the home tab → "press back again to exit".
 *  - Status bar styled for the dark theme.
 * Web builds skip all of this (the browser's own back button already works via history).
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { showToast } from './store/store';

type BackHandler = () => boolean; // return true when the press was handled
let routeHandler: BackHandler | null = null;

/** The current screen registers how "back" should move (latest registration wins). */
export function setRouteBackHandler(fn: BackHandler | null) { routeHandler = fn; }

let lastPress = 0;
/** One back press. Exported so it can also be tested in the browser. */
export function handleBack(): 'closed' | 'navigated' | 'confirm-exit' | 'exit' {
  // 1) Close the top-most overlay: bottom sheets / editors / composer, then the admin slide-out menu
  const sheets = document.querySelectorAll<HTMLElement>('.sheet-backdrop');
  if (sheets.length) { sheets[sheets.length - 1].click(); return 'closed'; }
  const scrim = document.querySelector<HTMLElement>('.admin-scrim');
  if (scrim) { scrim.click(); return 'closed'; }
  // 2) Let the screen go back (previous screen, then home tab)
  if (routeHandler?.()) return 'navigated';
  // 3) At the start: press twice to leave
  const now = Date.now();
  if (now - lastPress < 2000) {
    if (Capacitor.isNativePlatform()) App.exitApp();
    return 'exit';
  }
  lastPress = now;
  showToast('Press back again to exit');
  return 'confirm-exit';
}

let started = false;
export function initNative() {
  if (started) return;
  started = true;
  (window as unknown as { __rizzBack?: typeof handleBack }).__rizzBack = handleBack; // for tests / debugging
  if (!Capacitor.isNativePlatform()) return;
  App.addListener('backButton', () => { handleBack(); });
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {}); // light text on the dark UI
  if (Capacitor.getPlatform() === 'android') StatusBar.setBackgroundColor({ color: '#0e0b1a' }).catch(() => {});
}
