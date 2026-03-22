import { Metadata } from 'next';
import { getSettingsAsync, DEFAULT_HEADLINES } from '@/lib/settings';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  let headlines = DEFAULT_HEADLINES;
  try {
    const settings = await getSettingsAsync();
    if (settings.headlines) headlines = settings.headlines;
  } catch {
    // fall back to defaults
  }

  // Page title/description from admin headlines
  const pageTitle = `Loftie AI - ${headlines.mainHeadline}`;
  const pageDescription = `${headlines.subtitle1} ${headlines.subtitle2}`.trim() ||
    'AI-powered decluttering and home staging. Upload a photo and get a photorealistic transformation with step-by-step guidance.';

  // OG metadata is separate — optimized for link previews, not tied to page headlines
  const ogTitle = 'Loftie AI';
  const ogDescription = 'See your room decluttered before you start. Snap a photo, get a personalized plan.';

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: 'https://www.loftie.ai',
      siteName: 'Loftie AI',
      type: 'website',
      locale: 'en_US',
      images: [
        {
          url: 'https://www.loftie.ai/og-image.png',
          width: 1200,
          height: 630,
          alt: 'A beautifully organized living room styled by Loftie AI',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: ['https://www.loftie.ai/og-image.png'],
    },
  };
}

export default function Page() {
  return <HomeClient />;
}
