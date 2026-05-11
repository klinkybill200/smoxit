import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.smoxit.ios',
  appName: 'Smoxit',
  webDir: 'dist',
  server: {
    url: 'https://336838d0-4e84-4586-abb3-a3f168120072.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
