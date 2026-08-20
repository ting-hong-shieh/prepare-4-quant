import type { MetadataRoute } from 'next';

// Makes the phone treat it as an installed app rather than a browser tab:
// home-screen icon, no address bar, black status bar to match the 3b frame.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quant Drill',
    short_name: 'Quant',
    description: '刷完一本 quant 面試題庫',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
