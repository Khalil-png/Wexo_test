import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wexo.app',
  appName: 'Wexo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://wexo-test.vercel.app',
    cleartext: true
  }
};

export default config;
