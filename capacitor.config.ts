/**
 * Konfigurasi Capacitor untuk integrasi Android Studio (Tahap 3-6).
 * Saat menyiapkan project Android native:
 *   npm install @capacitor/core @capacitor/cli @capacitor/android
 *   npx cap add android
 *   npx cap sync android
 */
const config = {
  appId: 'com.unoarena.game',
  appName: 'UNO Arena',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
