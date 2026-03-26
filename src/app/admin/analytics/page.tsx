'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const UMAMI_BASE = 'https://analytics.bizwebfix.com';
const WEBSITE_ID = 'fab2dee5-5a11-4129-9ac6-46c4a6f30603';
const UMAMI_USER = 'admin';
const UMAMI_PASS = 'AirDuct2026!Umami';

async function getUmamiToken(): Promise<string | null> {
  try {
    const res = await fetch(`${UMAMI_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: UMAMI_USER, password: UMAMI_PASS }),
    });
    const data = await res.json();
    return data.token || null;
  } catch {
    return null;
  }
}

async function fetchUmami(path: string, token: string) {
  try {
    const res = await fetch(`${UMAMI_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch {
    return null;
  }
}

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0s';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e8ede5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#4a7c3f', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#9aab8e', marginTop: 4, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#b0bfaa', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Table({ title, cols, rows, empty }: { title: string; cols: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ede5', marginBottom: 24, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #e8ede5' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#2d3a28', margin: 0 }}>{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '24px', color: '#9aab8e', fontSize: 14, textAlign: 'center' }}>{empty}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8faf7' }}>
                {cols.map((c, i) => (
                  <th key={i} style={{ padding: '10px 20px', textAlign: i === 0 ? 'left' : 'right', fontSize: 11, color: '#9aab8e', fontWeight: 600, whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f0f4ee' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '11px 20px', textAlign: j === 0 ? 'left' : 'right', fontSize: 13, color: j === 0 ? '#3d5236' : '#4a7c3f', fontWeight: j === 0 ? 400 : 600, fontFamily: j === 0 ? 'monospace' : 'inherit', wordBreak: 'break-all', maxWidth: j === 0 ? 300 : 'auto' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [umamiData, setUmamiData] = useState<any>(null);
  const [gscData, setGscData] = useState<any>(null);
  const [loadingUmami, setLoadingUmami] = useState(true);
  const [loadingGsc, setLoadingGsc] = useState(true);

  useEffect(() => {
    async function loadUmami() {
      setLoadingUmami(true);
      const token = await getUmamiToken();
      if (!token) { setUmamiData(null); setLoadingUmami(false); return; }
      const now = Date.now();
      const startAt = now - days * 24 * 60 * 60 * 1000;
      const params = `startAt=${startAt}&endAt=${now}`;
      const [stats, pages, refs] = await Promise.all([
        fetchUmami(`/api/websites/${WEBSITE_ID}/stats?${params}`, token),
        fetchUmami(`/api/websites/${WEBSITE_ID}/metrics?${params}&type=url&limit=10`, token),
        fetchUmami(`/api/websites/${WEBSITE_ID}/metrics?${params}&type=referrer&limit=10`, token),
      ]);
      setUmamiData({ stats, pages: Array.isArray(pages) ? pages : [], refs: Array.isArray(refs) ? refs : [] });
      setLoadingUmami(false);
    }
    loadUmami();
  }, [days]);

  useEffect(() => {
    async function loadGsc() {
      setLoadingGsc(true);
      try {
        const res = await fetch(`/api/admin/gsc?days=${days}`);
        const data = await res.json();
        setGscData(data);
      } catch {
        setGscData({ error: 'Failed to fetch' });
      }
      setLoadingGsc(false);
    }
    loadGsc();
  }, [days]);

  const stats = umamiData?.stats;
  // Umami API returns flat numbers (e.g. { visitors: 18 }) not nested { visitors: { value: 18 } }
  const visitors = stats?.visitors ?? 0;
  const pageviews = stats?.pageviews ?? 0;
  const bounceRate = stats?.bounces && stats?.visits
    ? Math.round((stats.bounces / stats.visits) * 100) + '%'
    : 'N/A';
  const avgDuration = stats?.totaltime && stats?.visits
    ? formatDuration((stats.totaltime / stats.visits) * 1000)
    : 'N/A';

  const gscSummary = gscData?.summary;
  const gscQueries: any[] = gscData?.queries || [];
  const gscPages: any[] = gscData?.pages || [];

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf7', fontFamily: 'var(--font-roboto, sans-serif)' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e8ede5', padding: '16px 24px' }}>
        <nav style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7a9166', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            ← Back to Dashboard
          </Link>
          <div style={{ display: 'flex', gap: 8 }}>
            {[7, 28, 90].map(d => (
              <button key={d} onClick={() => setDays(d)} style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid #d4e0cc', background: days === d ? '#4a7c3f' : '#fff', color: days === d ? '#fff' : '#7a9166', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {d}d
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2d3a28', marginBottom: 4 }}>📊 Loftie Analytics</h1>
        <p style={{ color: '#7a9166', fontSize: 13, marginBottom: 32 }}>Last {days} days — traffic + search performance</p>

        {/* TRAFFIC SECTION */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#9aab8e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Site Traffic</h2>
        {loadingUmami ? (
          <div style={{ color: '#9aab8e', fontSize: 14, marginBottom: 32 }}>Loading traffic data...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
              <StatCard icon="👥" label="Unique Visitors" value={visitors.toLocaleString()} />
              <StatCard icon="👁️" label="Pageviews" value={pageviews.toLocaleString()} />
              <StatCard icon="↩️" label="Bounce Rate" value={bounceRate} />
              <StatCard icon="⏱️" label="Avg. Duration" value={avgDuration} />
            </div>
            <Table
              title="Top Pages"
              cols={['Page', 'Views']}
              rows={(umamiData?.pages || []).map((p: any) => [p.x || '/', (p.y || 0).toLocaleString()])}
              empty="No page data yet — check back after a few visitors"
            />
            <Table
              title="Top Referrers"
              cols={['Source', 'Visitors']}
              rows={(umamiData?.refs || []).map((r: any) => [r.x || 'Direct', (r.y || 0).toLocaleString()])}
              empty="No referrer data yet"
            />
          </>
        )}

        {/* SEO SECTION */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#9aab8e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16, marginTop: 16 }}>Search Performance (Google)</h2>
        {loadingGsc ? (
          <div style={{ color: '#9aab8e', fontSize: 14, marginBottom: 32 }}>Loading SEO data...</div>
        ) : gscData?.error ? (
          <div style={{ background: '#fff8e6', border: '1px solid #f0d98a', borderRadius: 12, padding: '20px 24px', marginBottom: 28, fontSize: 14, color: '#7a6020' }}>
            <strong>⚠️ GSC not connected yet.</strong> To see keyword rankings and search impressions, add the Loftie service account to Google Search Console:
            <ol style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Go to <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" style={{ color: '#4a7c3f' }}>search.google.com/search-console</a></li>
              <li>Select the loftie.ai property</li>
              <li>Go to Settings → Users and permissions → Add user</li>
              <li>Add: <code style={{ background: '#f0e9c8', padding: '2px 6px', borderRadius: 4 }}>clawed@customlocaltech.iam.gserviceaccount.com</code> as Restricted</li>
            </ol>
            <p style={{ margin: '12px 0 0', color: '#9a8030' }}>Error: {gscData.error}</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
              <StatCard icon="🖱️" label="Search Clicks" value={(gscSummary?.clicks || 0).toLocaleString()} sub="from Google" />
              <StatCard icon="👀" label="Impressions" value={(gscSummary?.impressions || 0).toLocaleString()} sub="times shown in results" />
              <StatCard icon="📈" label="Click-Through Rate" value={gscSummary?.ctr ? (gscSummary.ctr * 100).toFixed(1) + '%' : '0%'} sub="CTR" />
              <StatCard icon="🏆" label="Avg. Position" value={gscSummary?.position ? gscSummary.position.toFixed(1) : 'N/A'} sub="in search results" />
            </div>
            <Table
              title="Top Search Queries"
              cols={['Keyword', 'Clicks', 'Impressions', 'Position']}
              rows={gscQueries.slice(0, 20).map((q: any) => [
                q.keys?.[0] || '',
                (q.clicks || 0).toLocaleString(),
                (q.impressions || 0).toLocaleString(),
                (q.position || 0).toFixed(1),
              ])}
              empty="No search query data yet — Google may take a few weeks to index"
            />
            <Table
              title="Top Pages in Search"
              cols={['Page', 'Clicks', 'Impressions']}
              rows={gscPages.slice(0, 10).map((p: any) => [
                (p.keys?.[0] || '').replace('https://www.loftie.ai', '').replace('https://loftie.ai', '') || '/',
                (p.clicks || 0).toLocaleString(),
                (p.impressions || 0).toLocaleString(),
              ])}
              empty="No page search data yet"
            />
          </>
        )}

        <p style={{ marginTop: 16, fontSize: 11, color: '#b0bfaa', textAlign: 'center' }}>
          Traffic via <a href="https://analytics.bizwebfix.com" target="_blank" rel="noreferrer" style={{ color: '#7a9166' }}>Umami</a> · Search data via Google Search Console
        </p>
      </main>
    </div>
  );
}
