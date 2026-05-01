import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wexo.app',
  appName: 'Wexo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://wexo-test.vercel.app',
    cleartext: true,
    allowNavigation: [
      'wexo-test.vercel.app',
      '*.vercel.app'
    ]
  },
  plugins: {
    BackgroundRunner: {
      label: 'com.wexo.app.background',
      src: 'background.js',
      event: 'checkStatus',
      repeat: true,
      interval: 15,
      autoStart: true,
    },
  },
};

export default config;
