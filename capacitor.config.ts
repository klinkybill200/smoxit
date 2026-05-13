import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.smoxit.ios',
  appName: 'Smoxit',
  webDir: 'dist',
  server: {
    allowNavigation: ['ipapi.co', 'buy.stripe.com'],
  },
};

export default config;
