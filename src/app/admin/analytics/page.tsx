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
      cache: 'no-store',
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
      cache: 'no-store',
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
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function formatPercent(val: number): string {
  if (val == null) return '0%';
  return `${Math.round(val * 100)}%`;
}

export default async function AnalyticsPage() {
  // Auth is handled by middleware — no cookie check needed here

  const now = Date.now();
  const startAt = now - 30 * 24 * 60 * 60 * 1000;

  const token = await getUmamiToken();

  let stats: any = null;
  let topPages: any[] = [];
  let referrers: any[] = [];

  if (token) {
    const params = `startAt=${startAt}&endAt=${now}`;
    const [statsData, pagesData, referrersData] = await Promise.all([
      fetchUmami(`/api/websites/${WEBSITE_ID}/stats?${params}`, token),
      fetchUmami(`/api/websites/${WEBSITE_ID}/metrics?${params}&type=url&limit=10`, token),
      fetchUmami(`/api/websites/${WEBSITE_ID}/metrics?${params}&type=referrer&limit=10`, token),
    ]);
    stats = statsData;
    topPages = Array.isArray(pagesData) ? pagesData : [];
    referrers = Array.isArray(referrersData) ? referrersData : [];
  }

  const visitors = stats?.visitors?.value ?? 0;
  const pageviews = stats?.pageviews?.value ?? 0;
  const bounceRate = stats?.bounces?.value && stats?.visits?.value
    ? stats.bounces.value / stats.visits.value
    : null;
  const avgDuration = stats?.totaltime?.value && stats?.visits?.value
    ? stats.totaltime.value / stats.visits.value * 1000
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf7', fontFamily: 'var(--font-roboto, sans-serif)' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e8ede5', padding: '16px 24px' }}>
        <nav style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7a9166', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            ← Back to Dashboard
          </Link>
          <span style={{ fontSize: 13, color: '#9aab8e' }}>Last 30 days</span>
        </nav>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#2d3a28', marginBottom: 8 }}>
          📊 Loftie Analytics
        </h1>
        <p style={{ color: '#7a9166', fontSize: 14, marginBottom: 32 }}>
          Site traffic for loftie.ai — last 30 days
        </p>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'Unique Visitors', value: visitors.toLocaleString(), icon: '👥' },
            { label: 'Pageviews', value: pageviews.toLocaleString(), icon: '👁️' },
            { label: 'Bounce Rate', value: bounceRate != null ? formatPercent(bounceRate) : 'N/A', icon: '↩️' },
            { label: 'Avg. Visit Duration', value: avgDuration != null ? formatDuration(avgDuration) : 'N/A', icon: '⏱️' },
          ].map((card) => (
            <div key={card.label} style={{
              background: '#fff',
              borderRadius: 12,
              padding: '20px 24px',
              border: '1px solid #e8ede5',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#4a7c3f', lineHeight: 1 }}>
                {card.value}
              </div>
              <div style={{ fontSize: 12, color: '#9aab8e', marginTop: 4, fontWeight: 500 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Top Pages */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ede5', marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #e8ede5' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2d3a28', margin: 0 }}>Top Pages</h2>
          </div>
          {topPages.length === 0 ? (
            <div style={{ padding: '24px', color: '#9aab8e', fontSize: 14, textAlign: 'center' }}>
              No page data yet — tracking script just added, check back tomorrow!
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8faf7' }}>
                  <th style={{ padding: '10px 24px', textAlign: 'left', fontSize: 12, color: '#9aab8e', fontWeight: 600 }}>Page</th>
                  <th style={{ padding: '10px 24px', textAlign: 'right', fontSize: 12, color: '#9aab8e', fontWeight: 600 }}>Views</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((page: any, i: number) => (
                  <tr key={i} style={{ borderTop: '1px solid #f0f4ee' }}>
                    <td style={{ padding: '12px 24px', fontSize: 14, color: '#3d5236', fontFamily: 'monospace' }}>
                      {page.x || '/'}
                    </td>
                    <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#4a7c3f' }}>
                      {(page.y || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top Referrers */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8ede5', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #e8ede5' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2d3a28', margin: 0 }}>Top Referrers</h2>
          </div>
          {referrers.length === 0 ? (
            <div style={{ padding: '24px', color: '#9aab8e', fontSize: 14, textAlign: 'center' }}>
              No referrer data yet
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8faf7' }}>
                  <th style={{ padding: '10px 24px', textAlign: 'left', fontSize: 12, color: '#9aab8e', fontWeight: 600 }}>Source</th>
                  <th style={{ padding: '10px 24px', textAlign: 'right', fontSize: 12, color: '#9aab8e', fontWeight: 600 }}>Visitors</th>
                </tr>
              </thead>
              <tbody>
                {referrers.map((ref: any, i: number) => (
                  <tr key={i} style={{ borderTop: '1px solid #f0f4ee' }}>
                    <td style={{ padding: '12px 24px', fontSize: 14, color: '#3d5236' }}>
                      {ref.x || 'Direct'}
                    </td>
                    <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#4a7c3f' }}>
                      {(ref.y || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p style={{ marginTop: 24, fontSize: 12, color: '#b0bfaa', textAlign: 'center' }}>
          Powered by <a href="https://analytics.bizwebfix.com" target="_blank" rel="noreferrer" style={{ color: '#7a9166' }}>Umami Analytics</a> — privacy-friendly, no cookies
        </p>
      </main>
    </div>
  );
}
