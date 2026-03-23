import { Metadata } from 'next';
import Link from 'next/link';
import NextImage from 'next/image';
import { getAllPosts } from '@/lib/blog-storage';
import { BLOG_CATEGORIES } from '@/lib/blog-types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Loftie Blog - Decluttering Tips, Home Staging & Organization',
  description: 'Expert advice on decluttering, home staging, and room organization from professional home stager Sejal Parekh. Tips, guides, and inspiration for transforming your space.',
  openGraph: {
    title: 'Loftie Blog - Decluttering Tips & Home Staging',
    description: 'Expert decluttering and home staging advice from a professional stager.',
    url: 'https://www.loftie.ai/blog',
    siteName: 'Loftie AI',
    type: 'website',
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
            <NextImage src="/loftie-logo.png" alt="Loftie" width={28} height={28} style={{ borderRadius: 6 }} />
            <span style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 600, fontSize: 18, color: '#2d3748', letterSpacing: '-0.02em' }}>
              Loftie
            </span>
          </Link>
          <span style={{ color: '#cbd5e0', fontSize: 20, fontWeight: 300 }}>|</span>
          <span style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 500, fontSize: 15, color: '#718096' }}>
            Blog
          </span>
        </div>
      </header>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '48px 20px 32px' }}>
        <h1
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 600,
            color: '#2d3748',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: 10,
          }}
        >
          The Loftie Blog
        </h1>
        <p
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontSize: 16,
            color: '#718096',
            maxWidth: 480,
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          Decluttering tips, home staging secrets, and organization ideas from professional stager Sejal Parekh.
        </p>
      </div>

      {/* Posts */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 20px 80px' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: '#a0aec0', fontSize: 16, fontFamily: "'General Sans', sans-serif" }}>
              Blog posts coming soon! Stay tuned for decluttering tips and home staging advice.
            </p>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                marginTop: 16,
                padding: '10px 24px',
                borderRadius: 10,
                background: '#9CAF88',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                fontFamily: "'General Sans', sans-serif",
              }}
            >
              Try Loftie AI
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {posts.map((post, i) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <article
                  style={{
                    display: 'flex',
                    gap: 20,
                    padding: 20,
                    borderRadius: 16,
                    background: 'white',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  {post.coverImageUrl && (
                    <div
                      style={{
                        width: 200,
                        minHeight: 140,
                        borderRadius: 12,
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: '#f0f2f5',
                      }}
                    >
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 6,
                          background: 'rgba(156,175,136,0.12)',
                          color: '#7a9166',
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: "'General Sans', sans-serif",
                          textTransform: 'capitalize',
                        }}
                      >
                        {post.category.replace('-', ' ')}
                      </span>
                      <span style={{ fontSize: 12, color: '#a0aec0', fontFamily: "'General Sans', sans-serif" }}>
                        {post.readingTimeMinutes} min read
                      </span>
                    </div>
                    <h2
                      style={{
                        fontFamily: "'General Sans', sans-serif",
                        fontSize: i === 0 ? 22 : 18,
                        fontWeight: 600,
                        color: '#2d3748',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.3,
                        margin: '0 0 8px',
                      }}
                    >
                      {post.title}
                    </h2>
                    <p
                      style={{
                        fontFamily: "'General Sans', sans-serif",
                        fontSize: 14,
                        color: '#718096',
                        lineHeight: 1.5,
                        margin: '0 0 12px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}
                    >
                      {post.excerpt}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#a0aec0', fontFamily: "'General Sans', sans-serif" }}>
                      <span>{post.author}</span>
                      <span>·</span>
                      <span>{formatDate(post.publishedAt)}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
