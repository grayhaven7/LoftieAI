import { NextResponse } from 'next/server';
import { getSettingsAsync, DEFAULT_SECTION_ORDER } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getSettingsAsync();
    return NextResponse.json({
      sectionOrder: settings.sectionOrder || DEFAULT_SECTION_ORDER,
    });
  } catch {
    return NextResponse.json({
      sectionOrder: DEFAULT_SECTION_ORDER,
    });
  }
}
