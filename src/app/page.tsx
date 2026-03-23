import { Metadata } from 'next';
import { getSettingsAsync, DEFAULT_HEADLINES, DEFAULT_BIO, DEFAULT_SECTION_ORDER } from '@/lib/settings';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getPageData() {
  try {
    const settings = await getSettingsAsync();
    return {
      headlines: settings.headlines || DEFAULT_HEADLINES,
      sectionOrder: settings.sectionOrder || DEFAULT_SECTION_ORDER,
      bio: settings.bio || DEFAULT_BIO,
    };
  } catch {
    return {
      headlines: DEFAULT_HEADLINES,
      sectionOrder: DEFAULT_SECTION_ORDER as string[],
      bio: DEFAULT_BIO,
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { headlines } = await getPageData();

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
          url: 'https://www.loftie.ai/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Loftie AI - AI room transformation before and after',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://www.loftie.ai/og-image.png'],
    },
  };
}

export default async function Page() {
  const { headlines, sectionOrder, bio } = await getPageData();

  return (
    <HomeClient
      initialHeadlines={headlines}
      initialSectionOrder={sectionOrder as string[]}
      initialBio={bio}
    />
  );
}
