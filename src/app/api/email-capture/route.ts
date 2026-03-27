import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, name, source } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    // Load existing list
    let subscribers: Array<{ email: string; name: string; source: string; createdAt: string }> = [];
    try {
      const { blobs } = await list({ prefix: 'email-subscribers.json', token });
      if (blobs.length > 0) {
        const res = await fetch(blobs[0].url, { cache: 'no-store' });
        if (res.ok) subscribers = await res.json();
      }
    } catch { /* start fresh */ }

    // Check dupe
    if (subscribers.find(s => s.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    subscribers.push({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      source: source || 'homepage',
      createdAt: new Date().toISOString(),
    });

    await put('email-subscribers.json', JSON.stringify(subscribers, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token,
      cacheControlMaxAge: 0,
    });

    return NextResponse.json({ success: true, total: subscribers.length });
  } catch (error) {
    console.error('[EmailCapture] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Admin endpoint to view subscribers
export async function GET(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET && adminKey !== 'loftie-admin-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ subscribers: [] });

  try {
    const { blobs } = await list({ prefix: 'email-subscribers.json', token });
    if (blobs.length === 0) return NextResponse.json({ subscribers: [], total: 0 });
    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    const subscribers = res.ok ? await res.json() : [];
    return NextResponse.json({ subscribers, total: subscribers.length });
  } catch {
    return NextResponse.json({ subscribers: [], total: 0 });
  }
}
