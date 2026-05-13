import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wexo.social',
  appName: 'Wexo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost'
  },
  ios: {
    contentInset: 'always'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_launcher",
      iconColor: "#488AFF",
    },
  }
};

export default config;
