import { Metadata } from 'next';
import { getSettingsAsync, DEFAULT_HEADLINES } from '@/lib/settings';
import HomeClient from './HomeClient';

export async function generateMetadata(): Promise<Metadata> {
  let headlines = DEFAULT_HEADLINES;
  try {
    const settings = await getSettingsAsync();
    if (settings.headlines) headlines = settings.headlines;
  } catch {
    // fall back to defaults
  }

  const title = `Loftie AI - ${headlines.mainHeadline}`;
  const description = `${headlines.subtitle1} ${headlines.subtitle2}`.trim() ||
    'AI-powered decluttering and home staging. Upload a photo and get a photorealistic transformation with step-by-step guidance.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: 'https://www.loftie.ai',
      siteName: 'Loftie AI',
      type: 'website',
      locale: 'en_US',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
          width: 1200,
          height: 630,
          alt: 'Loftie AI - Transform Your Space',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80'],
    },
  };
}

export default function Page() {
  return <HomeClient />;
}
