import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eloarf.collegelifeos',
  appName: 'College Life OS',
  webDir: 'dist',
  server: {
    // Uses local WebView scheme to serve dist files locally without internet
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    // Smooth scrolling & touch handling on mobile
    backgroundColor: '#FBF1E4',
  },
};

export default config;
