import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Two native apps from one codebase:
 *   default         → "Rizz" guest app        (android/,       web build in dist/)
 *   RIZZ_APP=admin  → "Rizz Admin" management (android-admin/, web build in dist-admin/)
 */
const admin = process.env.RIZZ_APP === 'admin';

const config: CapacitorConfig = {
  appId: admin ? 'com.rizz.cocktailbar.admin' : 'com.rizz.cocktailbar',
  appName: admin ? 'Rizz Admin' : 'Rizz',
  webDir: admin ? 'dist-admin' : 'dist',
  backgroundColor: '#0e0b1a',
  android: admin ? { path: 'android-admin' } : undefined,
  server: {
    // http scheme + cleartext lets the app talk to a server on the bar's Wi-Fi (http://192.168.x.x:3001)
    // as well as a hosted https server.
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
