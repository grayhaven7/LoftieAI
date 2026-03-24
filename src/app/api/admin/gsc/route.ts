import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const GSC_SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:loftie.ai';

async function getGSCAuth() {
  const keyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyB64) return null;
  try {
    const key = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf-8'));
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    return auth.getClient();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get('days') || '28');

  const auth = await getGSCAuth();
  if (!auth) {
    return NextResponse.json({ error: 'GSC not configured — add GOOGLE_SERVICE_ACCOUNT_KEY env var' }, { status: 503 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sc = google.searchconsole({ version: 'v1', auth: auth as any });
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];

  try {
    const [queryData, pageData, summaryData] = await Promise.all([
      // Top search queries
      sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 20,
          dataState: 'all',
        },
      }),
      // Top pages in search
      sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 10,
          dataState: 'all',
        },
      }),
      // Overall summary (no dimensions)
      sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['date'],
          dataState: 'all',
        },
      }),
    ]);

    const summaryRows = summaryData.data.rows || [];
    const totalClicks = summaryRows.reduce((sum: number, r: any) => sum + (r.clicks || 0), 0);
    const totalImpressions = summaryRows.reduce((sum: number, r: any) => sum + (r.impressions || 0), 0);
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPosition = summaryRows.length > 0
      ? summaryRows.reduce((sum: number, r: any) => sum + (r.position || 0), 0) / summaryRows.length
      : 0;

    return NextResponse.json({
      summary: { clicks: totalClicks, impressions: totalImpressions, ctr: avgCtr, position: avgPosition },
      queries: queryData.data.rows || [],
      pages: pageData.data.rows || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'GSC fetch failed' }, { status: 500 });
  }
}
