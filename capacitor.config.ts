import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wexo.app',
  appName: 'Wexo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://wexo.netlify.app',
    cleartext: true
  }
};

export default config;
