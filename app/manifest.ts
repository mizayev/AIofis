import type { MetadataRoute } from 'next';

/**
 * AI OFFICE — PWA settings.
 * Lets the CEO add the app to the iPhone Home Screen and open it full-screen.
 * Checked by tests/pwa.test.ts.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'AI OFFICE',
    short_name: 'AI OFFICE',
    description: "Instagram uchun kontent tayyorlaydigan 6 ta AI agentdan iborat marketing ofisi. Faqat CEO tasdiqlaydi.",
    lang: 'uz',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
