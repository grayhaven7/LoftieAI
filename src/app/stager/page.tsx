import { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Loftie for Real Estate Agents | AI Staging Tool for Your Clients',
  description: 'Give your listings a competitive edge. Loftie AI helps your clients visualize a decluttered, staged home before photos — built by Sejal Parekh, who staged $350M in Bay Area real estate.',
  openGraph: {
    title: 'Loftie AI for Real Estate Agents',
    description: 'The AI staging tool your clients will love. Built by a Silicon Valley stager who has staged over $350M in properties.',
    url: 'https://www.loftie.ai/stager',
    siteName: 'Loftie AI',
    type: 'website',
  },
};

const benefits = [
  {
    icon: '🏠',
    title: 'Faster Listing Prep',
    desc: 'Clients see exactly what to declutter before photos. No more last-minute chaos.',
  },
  {
    icon: '📸',
    title: 'Better Listing Photos',
    desc: 'Staged homes photograph better. Loftie gets clients 80% of the way there before the photographer arrives.',
  },
  {
    icon: '💰',
    title: 'Higher Sale Price',
    desc: 'NAR data shows staged homes sell for 5-23% more. Loftie makes staging accessible for every listing.',
  },
  {
    icon: '⚡',
    title: 'Less Back-and-Forth',
    desc: 'Instead of telling clients what to do, show them. The AI visualization does the convincing for you.',
  },
  {
    icon: '🤝',
    title: 'Client Retention',
    desc: 'Offering Loftie as a free tool sets you apart from other agents and keeps clients coming back.',
  },
  {
    icon: '📊',
    title: 'Proven Results',
    desc: 'Built on $350M worth of staging experience in Silicon Valley\'s most competitive markets.',
  },
];

const steps = [
  { step: '1', title: 'Share with your client', desc: 'Send them to loftie.ai — it\'s free to use.' },
  { step: '2', title: 'They upload a photo', desc: 'Any cluttered room in their home. Takes 30 seconds.' },
  { step: '3', title: 'AI transforms it', desc: 'They see exactly what the room looks like decluttered and staged.' },
  { step: '4', title: 'Follow the plan', desc: 'Step-by-step cue cards guide them through the process.' },
];

export default function StagerPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Loftie AI for Real Estate Agents',
    description: 'AI-powered home staging and decluttering tool for real estate professionals and their clients.',
    provider: {
      '@type': 'Person',
      name: 'Sejal Parekh',
      jobTitle: 'Professional Home Stager & REALTOR®',
      url: 'https://innovaedesigns.com',
    },
    areaServed: ['Silicon Valley', 'San Francisco Bay Area', 'San Mateo County', 'Santa Clara County'],
    url: 'https://www.loftie.ai/stager',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'General Sans', sans-serif" }}>
      {/* Nav */}
      <header style={{ borderBottom: '1px solid #f0f4ee', padding: '16px 24px', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#2d3748', letterSpacing: '-0.03em' }}>Loftie</span>
            <span style={{ fontSize: 11, background: 'rgba(156,175,136,0.15)', color: '#7a9166', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>for agents</span>
          </Link>
          <Link href="/" style={{ padding: '8px 18px', borderRadius: 20, background: 'linear-gradient(90deg,#7a9166,#9CAF88)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            Try Loftie Free →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px 56px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(156,175,136,0.12)', color: '#7a9166', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 20, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          For Real Estate Agents
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: '#1a202c', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
          Give your listings the<br />
          <span style={{ color: '#9CAF88' }}>staging edge</span> they deserve
        </h1>
        <p style={{ fontSize: 18, color: '#4a5568', lineHeight: 1.7, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' }}>
          Loftie AI helps your clients visualize a decluttered, staged version of their home before photos — so listings hit the market looking their best.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ padding: '14px 28px', borderRadius: 12, background: 'linear-gradient(90deg,#7a9166,#9CAF88)', color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Try It Free
          </Link>
          <a href="mailto:sejal@innovaedesigns.com" style={{ padding: '14px 28px', borderRadius: 12, border: '1.5px solid #d4e0cc', color: '#7a9166', textDecoration: 'none', fontSize: 16, fontWeight: 600 }}>
            Talk to Sejal
          </a>
        </div>
        <p style={{ fontSize: 12, color: '#a0aec0', marginTop: 16 }}>Free to use. No account required for clients.</p>
      </section>

      {/* Stats bar */}
      <div style={{ background: 'linear-gradient(90deg,#7a9166,#9CAF88)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, textAlign: 'center' }}>
          {[
            { value: '$350M+', label: 'Bay Area properties staged' },
            { value: '5-23%', label: 'Higher sale price (NAR data)' },
            { value: '12 yrs', label: 'Silicon Valley staging expertise' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '72px 24px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1a202c', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 48 }}>
          How it works for your clients
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(156,175,136,0.12)', color: '#9CAF88', fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                {s.step}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2d3748', marginBottom: 6 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: '#718096', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section style={{ background: '#f8faf7', padding: '72px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1a202c', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 48 }}>
            Why agents love Loftie
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {benefits.map((b, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '22px', border: '1px solid #e8ede5' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{b.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2d3748', marginBottom: 8 }}>{b.title}</h3>
                <p style={{ fontSize: 13, color: '#718096', lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Sejal */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '72px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1a202c', letterSpacing: '-0.02em', marginBottom: 20 }}>
          Built by a stager who gets it
        </h2>
        <p style={{ fontSize: 16, color: '#4a5568', lineHeight: 1.8, marginBottom: 24 }}>
          Sejal Parekh is a certified Staging Design Specialist and licensed REALTOR® at Compass in Burlingame, CA. Through her company Innovae Designs, she&apos;s staged over $350M in Silicon Valley properties — from cozy condos to multi-million dollar estates.
        </p>
        <p style={{ fontSize: 16, color: '#4a5568', lineHeight: 1.8, marginBottom: 32 }}>
          She built Loftie to give every homeowner access to her staging expertise, and to help agents like you get listings market-ready faster.
        </p>
        <a href="https://innovaedesigns.com" target="_blank" rel="noopener noreferrer" style={{ color: '#7a9166', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Learn more about Sejal at Innovae Designs →
        </a>
      </section>

      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg,#7a9166,#9CAF88)', padding: '64px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12 }}>
          Ready to try it with your next listing?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 28 }}>
          Free for you and your clients. No credit card, no account needed to start.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ padding: '14px 28px', borderRadius: 12, background: '#fff', color: '#7a9166', textDecoration: 'none', fontSize: 16, fontWeight: 700 }}>
            Try Loftie Free →
          </Link>
          <a href="mailto:sejal@innovaedesigns.com" style={{ padding: '14px 28px', borderRadius: 12, border: '2px solid rgba(255,255,255,0.5)', color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 600 }}>
            Contact Sejal
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: '#a0aec0', borderTop: '1px solid #f0f4ee' }}>
        <p style={{ margin: 0 }}>
          <Link href="/" style={{ color: '#9CAF88', textDecoration: 'none', fontWeight: 600 }}>← Back to Loftie</Link>
          {' · '}
          &copy; 2026 Loftie AI · Built by{' '}
          <a href="https://innovaedesigns.com" target="_blank" rel="noopener noreferrer" style={{ color: '#9CAF88' }}>Sejal Parekh</a>
        </p>
      </footer>

      <Script
        id="stager-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </div>
  );
}
