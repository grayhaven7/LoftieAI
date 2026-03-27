'use client';

import { useState } from 'react';

export default function EmailCapture() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, source: 'homepage-checklist' }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError('Something went wrong. Try again.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    }
    setLoading(false);
  };

  return (
    <section style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px' }}>
      <div style={{
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(156,175,136,0.12) 0%, rgba(122,145,102,0.06) 100%)',
        border: '1px solid rgba(156,175,136,0.25)',
        padding: '36px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
        <h2 style={{
          fontFamily: "'General Sans', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: '#2d3748',
          marginBottom: 8,
          letterSpacing: '-0.02em',
        }}>
          Get Sejal&apos;s Free Staging Checklist
        </h2>
        <p style={{
          fontFamily: "'General Sans', sans-serif",
          fontSize: 14,
          color: '#718096',
          marginBottom: 24,
          lineHeight: 1.6,
        }}>
          The exact room-by-room checklist used to stage over $350M in Bay Area properties. Free, no fluff.
        </p>

        {submitted ? (
          <div style={{
            background: 'rgba(156,175,136,0.15)',
            borderRadius: 12,
            padding: '20px',
            border: '1px solid rgba(156,175,136,0.3)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
            <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 15, fontWeight: 600, color: '#4a7c3f', margin: 0 }}>
              You&apos;re in! Check your inbox.
            </p>
            <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 13, color: '#718096', margin: '6px 0 0' }}>
              Sejal&apos;s checklist is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              placeholder="First name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid #d4e0cc',
                fontSize: 14,
                fontFamily: "'General Sans', sans-serif",
                outline: 'none',
                background: '#fff',
                color: '#2d3748',
              }}
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid #d4e0cc',
                fontSize: 14,
                fontFamily: "'General Sans', sans-serif",
                outline: 'none',
                background: '#fff',
                color: '#2d3748',
              }}
            />
            {error && <p style={{ fontSize: 12, color: '#e53e3e', margin: 0 }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '13px',
                borderRadius: 10,
                background: loading ? '#9CAF88' : 'linear-gradient(90deg, #7a9166 0%, #9CAF88 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'General Sans', sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? 'Sending...' : 'Send Me the Checklist →'}
            </button>
            <p style={{ fontSize: 11, color: '#a0aec0', margin: 0 }}>
              No spam. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
