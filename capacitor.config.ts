import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wexo.social',
  appName: 'Wexo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://wexo-steel.vercel.app',
    allowNavigation: ['wexo-steel.vercel.app']
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;
