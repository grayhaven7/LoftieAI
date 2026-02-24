import { NextResponse } from 'next/server';
import { getSettingsAsync, DEFAULT_HEADLINES } from '@/lib/settings';

export async function GET() {
  try {
    const settings = await getSettingsAsync();
    return NextResponse.json({
      headlines: settings.headlines || DEFAULT_HEADLINES,
    });
  } catch {
    return NextResponse.json({
      headlines: DEFAULT_HEADLINES,
    });
  }
}
