import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Loftie AI',
    short_name: 'Loftie',
    description: 'Transform your cluttered space with AI. Upload a photo and get a clean, organized vision with step-by-step guidance.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f0f',
    theme_color: '#5a8a6a',
    icons: [
      {
        src: '/loftie-logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/loftie-logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
