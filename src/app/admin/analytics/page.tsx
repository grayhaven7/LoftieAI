'use client';

import { useState, useEffect, useCallback } from 'react';
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
  } catch { return null; }
}

async function fetchUmami(path: string, token: string) {
  try {
    const res = await fetch(`${UMAMI_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return await res.json();
  } catch { return null; }
}

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0s';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function StatCard({ icon, label, value, sub, trend }: { icon: string; label: string; value: string; sub?: string; trend?: number }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e8ede5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#4a7c3f', lineHeight: 1 }}>{value}</div>
        {trend !== undefined && trend !== 0 && (
          <div style={{ fontSize: 12, fontWeight: 600, color: trend > 0 ? '#4a7c3f' : '#e53e3e', marginBottom: 2 }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#9aab8e', marginTop: 4, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#b0bfaa', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MiniChart({ data, color = '#9CAF88', label }: { data: { x: string; y: number }[]; color?: string; label: string }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.y), 1);
  const width = 300;
  const height = 60;
  const padding = 4;
  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((d.y / max) * (height - padding * 2));
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e8ede5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#9aab8e', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {data.length > 1 && (
          <polygon
            points={`${padding},${height} ${points} ${width - padding},${height}`}
            fill={`url(#grad-${label.replace(/\s/g, '')})`}
          />
        )}
        {data.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {data.map((d, i) => {
          const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
          const y = height - padding - ((d.y / max) * (height - padding * 2));
          return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {data.length > 0 && <span style={{ fontSize: 10, color: '#b0bfaa' }}>{data[0]?.x?.split(' ')[0]}</span>}
        {data.length > 1 && <span style={{ fontSize: 10, color: '#b0bfaa' }}>{data[data.length - 1]?.x?.split(' ')[0]}</span>}
      </div>
    </div>
  );
}

function DonutChart({ data, label }: { data: { x: string; y: number }[]; label: string }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.y, 0);
  const colors = ['#9CAF88', '#7a9166', '#4a7c3f', '#c8dbb8', '#b0c8a0'];
  let cumulative = 0;
  const radius = 40;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e8ede5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#9aab8e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          {data.map((d, i) => {
            const pct = d.y / total;
            const offset = circumference * (1 - cumulative);
            const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`;
            cumulative += pct;
            return (
              <circle
                key={i}
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="18"
                strokeDasharray={dashArray}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
          })}
          <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 18, fontWeight: 700, fill: '#4a7c3f' }}>{total}</text>
          <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 9, fill: '#9aab8e' }}>total</text>
        </svg>
        <div style={{ flex: 1 }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#3d5236', textTransform: 'capitalize', flex: 1 }}>{d.x}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4a7c3f' }}>{Math.round((d.y / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Table({ title, cols, rows, empty }: { title: string; cols: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ede5', marginBottom: 20, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8ede5' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#2d3a28', margin: 0 }}>{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '20px', color: '#9aab8e', fontSize: 13, textAlign: 'center' }}>{empty}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8faf7' }}>
                {cols.map((c, i) => (
                  <th key={i} style={{ padding: '9px 16px', textAlign: i === 0 ? 'left' : 'right', fontSize: 11, color: '#9aab8e', fontWeight: 600, whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f0f4ee' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '10px 16px', textAlign: j === 0 ? 'left' : 'right', fontSize: 12, color: j === 0 ? '#3d5236' : '#4a7c3f', fontWeight: j === 0 ? 400 : 600, fontFamily: j === 0 ? 'monospace' : 'inherit', wordBreak: 'break-all', maxWidth: j === 0 ? 260 : 'auto' }}>
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

function SectionHeader({ title }: { title: string }) {
  return <h2 style={{ fontSize: 12, fontWeight: 700, color: '#9aab8e', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '28px 0 14px' }}>{title}</h2>;
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [umamiData, setUmamiData] = useState<any>(null);
  const [gscData, setGscData] = useState<any>(null);
  const [blogData, setBlogData] = useState<any>(null);
  const [loadingUmami, setLoadingUmami] = useState(true);
  const [loadingGsc, setLoadingGsc] = useState(true);
  const [loadingBlog, setLoadingBlog] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadUmami = useCallback(async () => {
    setLoadingUmami(true);
    const token = await getUmamiToken();
    if (!token) { setUmamiData(null); setLoadingUmami(false); return; }
    const now = Date.now();
    const startAt = now - days * 24 * 60 * 60 * 1000;
    const params = `startAt=${startAt}&endAt=${now}`;
    const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles');
    const unit = days <= 7 ? 'day' : days <= 30 ? 'day' : 'week';

    const [stats, pages, refs, devices, browsers, chartData] = await Promise.all([
      fetchUmami(`/api/websites/${WEBSITE_ID}/stats?${params}`, token),
      fetchUmami(`/api/websites/${WEBSITE_ID}/metrics?${params}&type=url&limit=10`, token),
      fetchUmami(`/api/websites/${WEBSITE_ID}/metrics?${params}&type=referrer&limit=10`, token),
      fetchUmami(`/api/websites/${WEBSITE_ID}/metrics?${params}&type=device`, token),
      fetchUmami(`/api/websites/${WEBSITE_ID}/metrics?${params}&type=browser&limit=5`, token),
      fetchUmami(`/api/websites/${WEBSITE_ID}/pageviews?${params}&unit=${unit}&timezone=${tz}`, token),
    ]);

    setUmamiData({
      stats,
      pages: Array.isArray(pages) ? pages : [],
      refs: Array.isArray(refs) ? refs : [],
      devices: Array.isArray(devices) ? devices : [],
      browsers: Array.isArray(browsers) ? browsers : [],
      pageviews: chartData?.pageviews || [],
      sessions: chartData?.sessions || [],
    });
    setLoadingUmami(false);
  }, [days]);

  const loadGsc = useCallback(async () => {
    setLoadingGsc(true);
    try {
      const res = await fetch(`/api/admin/gsc?days=${days}&t=${Date.now()}`, { cache: 'no-store' });
      setGscData(await res.json());
    } catch { setGscData({ error: 'Failed to fetch' }); }
    setLoadingGsc(false);
  }, [days]);

  const loadBlog = useCallback(async () => {
    setLoadingBlog(true);
    try {
      const res = await fetch(`/api/blog?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      const posts = Array.isArray(data) ? data : data.posts || [];
      setBlogData(posts);
    } catch { setBlogData([]); }
    setLoadingBlog(false);
  }, []);

  useEffect(() => { loadUmami(); loadGsc(); }, [loadUmami, loadGsc]);
  useEffect(() => { loadBlog(); }, [loadBlog]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      loadUmami();
      setLastRefresh(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, [loadUmami]);

  const stats = umamiData?.stats;
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

  const blogPosts: any[] = blogData || [];
  const publishedCount = blogPosts.filter((p: any) => p.status === 'published').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf7', fontFamily: 'var(--font-roboto, sans-serif)' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e8ede5', padding: '14px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <nav style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7a9166', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              ← Dashboard
            </Link>
            <span style={{ color: '#d4e0cc', fontSize: 18 }}>|</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#2d3a28' }}>📊 Analytics</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#b0bfaa' }}>Updated {lastRefresh.toLocaleTimeString()}</span>
            <button onClick={() => { loadUmami(); loadGsc(); setLastRefresh(new Date()); }} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #d4e0cc', background: '#fff', color: '#7a9166', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>↻</button>
            <div style={{ display: 'flex', gap: 4 }}>
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setDays(d)} style={{ padding: '5px 12px', borderRadius: 18, border: '1px solid #d4e0cc', background: days === d ? '#4a7c3f' : '#fff', color: days === d ? '#fff' : '#7a9166', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* TRAFFIC */}
        <SectionHeader title="Site Traffic" />
        {loadingUmami ? (
          <div style={{ color: '#9aab8e', fontSize: 13, padding: '20px 0' }}>Loading traffic data...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
              <StatCard icon="👥" label="Unique Visitors" value={visitors.toLocaleString()} />
              <StatCard icon="👁️" label="Pageviews" value={pageviews.toLocaleString()} />
              <StatCard icon="↩️" label="Bounce Rate" value={bounceRate} />
              <StatCard icon="⏱️" label="Avg. Duration" value={avgDuration} />
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <MiniChart data={umamiData?.pageviews || []} color="#9CAF88" label="Pageviews over time" />
              <MiniChart data={umamiData?.sessions || []} color="#7a9166" label="Sessions over time" />
            </div>

            {/* Device + browser row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <DonutChart data={umamiData?.devices || []} label="Device Breakdown" />
              <DonutChart data={umamiData?.browsers || []} label="Browser Breakdown" />
            </div>

            <Table
              title="Top Pages"
              cols={['Page', 'Views']}
              rows={(umamiData?.pages || []).map((p: any) => [p.x || '/', (p.y || 0).toLocaleString()])}
              empty="No page data yet"
            />
            <Table
              title="Top Referrers"
              cols={['Source', 'Visitors']}
              rows={(umamiData?.refs || []).map((r: any) => [r.x || 'Direct', (r.y || 0).toLocaleString()])}
              empty="No referrer data yet"
            />
          </>
        )}

        {/* BLOG */}
        <SectionHeader title="Blog Performance" />
        {loadingBlog ? (
          <div style={{ color: '#9aab8e', fontSize: 13, padding: '8px 0 20px' }}>Loading blog data...</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ede5', marginBottom: 20, padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#4a7c3f' }}>{publishedCount}</div>
                <div style={{ fontSize: 12, color: '#9aab8e', fontWeight: 500 }}>Posts Published</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#4a7c3f' }}>
                  {new Set(blogPosts.map((p: any) => p.category)).size}
                </div>
                <div style={{ fontSize: 12, color: '#9aab8e', fontWeight: 500 }}>Categories</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#4a7c3f' }}>
                  {blogPosts.filter((p: any) => p.coverImageUrl).length}
                </div>
                <div style={{ fontSize: 12, color: '#9aab8e', fontWeight: 500 }}>With Cover Images</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(
                blogPosts.reduce((acc: any, p: any) => {
                  acc[p.category] = (acc[p.category] || 0) + 1;
                  return acc;
                }, {})
              ).map(([cat, count]: any) => (
                <span key={cat} style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(156,175,136,0.12)', color: '#7a9166', fontSize: 12, fontWeight: 600 }}>
                  {cat} ({count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* SEO */}
        <SectionHeader title="Search Performance (Google)" />
        {loadingGsc ? (
          <div style={{ color: '#9aab8e', fontSize: 13, padding: '8px 0 20px' }}>Loading SEO data...</div>
        ) : gscData?.error ? (
          <div style={{ background: '#fff8e6', border: '1px solid #f0d98a', borderRadius: 12, padding: '18px 20px', marginBottom: 20, fontSize: 13, color: '#7a6020' }}>
            <strong>GSC not connected.</strong> Error: {gscData.error}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
              <StatCard icon="🖱️" label="Search Clicks" value={(gscSummary?.clicks || 0).toLocaleString()} sub="from Google" />
              <StatCard icon="👀" label="Impressions" value={(gscSummary?.impressions || 0).toLocaleString()} sub="times shown" />
              <StatCard icon="📈" label="Click-Through" value={gscSummary?.ctr ? (gscSummary.ctr * 100).toFixed(1) + '%' : '0%'} sub="CTR" />
              <StatCard icon="🏆" label="Avg. Position" value={gscSummary?.position ? gscSummary.position.toFixed(1) : 'N/A'} sub="in results" />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ede5', marginBottom: 16, padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9aab8e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Indexing Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, background: '#f0f4ee', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (0 / publishedCount) * 100)}%`, background: 'linear-gradient(90deg,#7a9166,#9CAF88)', height: '100%', borderRadius: 8, transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4a7c3f', whiteSpace: 'nowrap' }}>
                  0 / {publishedCount} indexed
                </span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#b0bfaa' }}>
                All {publishedCount} posts submitted to Google Indexing API. Google processes submissions within 1-7 days. GSC data lags 2-3 days.
              </p>
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
              empty="No keyword data yet — check back in a few days after Google indexes the blog posts"
            />
            <Table
              title="Top Pages in Search"
              cols={['Page', 'Clicks', 'Impressions', 'Position']}
              rows={gscPages.slice(0, 10).map((p: any) => [
                (p.keys?.[0] || '').replace('https://www.loftie.ai', '').replace('https://loftie.ai', '') || '/',
                (p.clicks || 0).toLocaleString(),
                (p.impressions || 0).toLocaleString(),
                (p.position || 0).toFixed(1),
              ])}
              empty="No page search data yet"
            />
          </>
        )}

        <p style={{ marginTop: 24, fontSize: 11, color: '#b0bfaa', textAlign: 'center' }}>
          Traffic via <a href="https://analytics.bizwebfix.com" target="_blank" rel="noreferrer" style={{ color: '#7a9166' }}>Umami</a> · Search via Google Search Console · Auto-refreshes every 60s
        </p>
      </main>
    </div>
  );
}
