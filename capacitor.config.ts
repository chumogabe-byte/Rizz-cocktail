import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rizz.cocktailbar',
  appName: 'Rizz',
  webDir: 'dist',
  backgroundColor: '#0e0b1a',
  server: {
    // http scheme + cleartext lets the app talk to a server on the bar's Wi-Fi (http://192.168.x.x:3001)
    // as well as a hosted https server.
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
