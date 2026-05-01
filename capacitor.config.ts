import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wexo.app',
  appName: 'Wexo',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
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
