import { Metadata } from 'next';
import Link from 'next/link';
import NextImage from 'next/image';
import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '@/lib/blog-storage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      url: `https://www.loftie.ai/blog/${post.slug}`,
      siteName: 'Loftie AI',
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      ...(post.coverImageUrl
        ? {
            images: [
              {
                url: post.coverImageUrl,
                width: 1200,
                height: 630,
                alt: post.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const allPosts = await getAllPosts();

  if (!post) {
    notFound();
  }

  // Related posts: same category first, then any, max 3, exclude current
  const related = [
    ...allPosts.filter(p => p.slug !== post.slug && p.category === post.category),
    ...allPosts.filter(p => p.slug !== post.slug && p.category !== post.category),
  ].slice(0, 3);

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
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
            <NextImage src="/loftie-logo.png" alt="Loftie" width={28} height={28} style={{ borderRadius: 6 }} />
            <span style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 600, fontSize: 18, color: '#2d3748', letterSpacing: '-0.02em' }}>
              Loftie
            </span>
          </Link>
          <span style={{ color: '#cbd5e0', fontSize: 20, fontWeight: 300 }}>|</span>
          <Link href="/blog" style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 500, fontSize: 15, color: '#718096', textDecoration: 'none' }}>
            Blog
          </Link>
        </div>
      </header>

      <article style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* Category + reading time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              background: 'rgba(156,175,136,0.12)',
              color: '#7a9166',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'General Sans', sans-serif",
              textTransform: 'capitalize',
            }}
          >
            {post.category.replace('-', ' ')}
          </span>
          <span style={{ fontSize: 13, color: '#a0aec0', fontFamily: "'General Sans', sans-serif" }}>
            {post.readingTimeMinutes} min read
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontSize: 'clamp(28px, 5vw, 40px)',
            fontWeight: 600,
            color: '#2d3748',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: 16,
          }}
        >
          {post.title}
        </h1>

        {/* Author + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div>
            <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#2d3748', margin: 0 }}>
              {post.author}
            </p>
            <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 12, color: '#a0aec0', margin: 0 }}>
              {post.authorTitle} · {formatDate(post.publishedAt)}
            </p>
          </div>
        </div>

        {/* Cover image */}
        {post.coverImageUrl && (
          <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 32 }}>
            <img
              src={post.coverImageUrl}
              alt={post.title}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        )}

        {/* Content */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontSize: 16,
            color: '#2d3748',
            lineHeight: 1.8,
          }}
        />

        {/* FAQ Section */}
        {post.faqs && post.faqs.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontFamily: "'General Sans', sans-serif", fontSize: 22, fontWeight: 600, color: '#2d3748', letterSpacing: '-0.02em', marginBottom: 16 }}>
              Frequently Asked Questions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {post.faqs.map((faq, i) => (
                <details key={i} style={{ borderRadius: 10, border: '1px solid rgba(156,175,136,0.25)', overflow: 'hidden' }}>
                  <summary style={{ padding: '14px 18px', fontFamily: "'General Sans', sans-serif", fontSize: 15, fontWeight: 600, color: '#2d3748', cursor: 'pointer', background: 'rgba(156,175,136,0.06)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {faq.question}
                    <span style={{ color: '#9CAF88', fontSize: 18, fontWeight: 300, flexShrink: 0, marginLeft: 12 }}>+</span>
                  </summary>
                  <div style={{ padding: '14px 18px', fontFamily: "'General Sans', sans-serif", fontSize: 14, color: '#4a5568', lineHeight: 1.7, background: '#fff' }}>
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div
          style={{
            marginTop: 48,
            padding: 28,
            borderRadius: 16,
            background: 'rgba(156,175,136,0.08)',
            border: '1px solid rgba(156,175,136,0.15)',
            textAlign: 'center',
          }}
        >
          <h3
            style={{
              fontFamily: "'General Sans', sans-serif",
              fontSize: 20,
              fontWeight: 600,
              color: '#2d3748',
              marginBottom: 8,
            }}
          >
            See what your space could look like
          </h3>
          <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 14, color: '#718096', marginBottom: 16 }}>
            Upload a photo of your room and get an AI-powered transformation with a personalized decluttering plan.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              borderRadius: 10,
              background: '#9CAF88',
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily: "'General Sans', sans-serif",
            }}
          >
            Try Loftie Free
          </Link>
        </div>

        {/* Author Bio */}
        <div style={{ marginTop: 48, padding: '24px 28px', borderRadius: 16, background: '#fff', border: '1px solid #e8ede5', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <img
            src="https://www.compass.com/m/13/45bf84f9-6c46-4085-9db5-2cde80179f68/300x300.webp"
            alt="Sejal Parekh"
            width={64}
            height={64}
            style={{ flexShrink: 0, width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(156,175,136,0.3)' }}
          />
          <div>
            <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 15, fontWeight: 700, color: '#2d3748', margin: '0 0 2px' }}>Sejal Parekh</p>
            <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 12, color: '#9CAF88', fontWeight: 600, margin: '0 0 10px' }}>Compass Real Estate Agent &amp; Professional Home Stager</p>
            <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 13, color: '#718096', lineHeight: 1.6, margin: '0 0 12px' }}>
              Sejal has staged over $350M in Silicon Valley properties through her company Innovae Designs. Her proven techniques help homes sell faster and for more — and inspired the AI behind Loftie.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <a href="https://innovaedesigns.com" target="_blank" rel="noreferrer" style={{ fontFamily: "'General Sans', sans-serif", fontSize: 12, color: '#7a9166', fontWeight: 600, textDecoration: 'none' }}>Innovae Designs ↗</a>
              <a href="https://www.loftie.ai" style={{ fontFamily: "'General Sans', sans-serif", fontSize: 12, color: '#7a9166', fontWeight: 600, textDecoration: 'none' }}>Loftie AI ↗</a>
            </div>
          </div>
        </div>

        {/* Related Posts */}
        {related.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontFamily: "'General Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#2d3748', marginBottom: 20, letterSpacing: '-0.02em' }}>Related Articles</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {related.map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: 'none', display: 'block', padding: 18, borderRadius: 12, border: '1px solid #e8ede5', background: '#fff', transition: 'border-color 0.2s' }}>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 5, background: 'rgba(156,175,136,0.12)', color: '#7a9166', fontSize: 11, fontWeight: 600, fontFamily: "'General Sans', sans-serif", textTransform: 'capitalize', marginBottom: 8 }}>
                    {p.category.replace('-', ' ')}
                  </span>
                  <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#2d3748', lineHeight: 1.4, margin: '0 0 8px' }}>{p.title}</p>
                  <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 12, color: '#a0aec0', lineHeight: 1.5, margin: 0 }}>
                    {(p.excerpt || '').slice(0, 100)}{(p.excerpt || '').length > 100 ? '…' : ''}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {post.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: '#f0f2f5',
                  color: '#718096',
                  fontSize: 12,
                  fontFamily: "'General Sans', sans-serif",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Back to blog */}
        <div style={{ marginTop: 32 }}>
          <Link
            href="/blog"
            style={{
              fontFamily: "'General Sans', sans-serif",
              fontSize: 14,
              color: '#9CAF88',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            ← Back to all posts
          </Link>
        </div>
      </article>

      {/* Article schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.excerpt,
            author: {
              '@type': 'Person',
              name: post.author,
              jobTitle: post.authorTitle,
            },
            publisher: {
              '@type': 'Organization',
              name: 'Loftie AI',
              url: 'https://www.loftie.ai',
            },
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            mainEntityOfPage: `https://www.loftie.ai/blog/${post.slug}`,
            ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
          }),
        }}
      />

      {/* FAQPage schema for rich snippets */}
      {post.faqs && post.faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: post.faqs.map(faq => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: faq.answer,
                },
              })),
            }),
          }}
        />
      )}

      <style>{`
        .blog-content h2 { font-size: 24px; font-weight: 600; margin: 32px 0 12px; letter-spacing: -0.02em; }
        .blog-content h3 { font-size: 20px; font-weight: 600; margin: 28px 0 10px; letter-spacing: -0.01em; }
        .blog-content p { margin: 0 0 16px; }
        .blog-content ul, .blog-content ol { margin: 0 0 16px; padding-left: 24px; }
        .blog-content li { margin-bottom: 8px; }
        .blog-content blockquote { border-left: 3px solid #9CAF88; padding: 12px 20px; margin: 20px 0; background: rgba(156,175,136,0.05); border-radius: 0 8px 8px 0; font-style: italic; color: #4a5568; }
        .blog-content a { color: #7a9166; text-decoration: underline; }
        .blog-content img { max-width: 100%; border-radius: 12px; margin: 20px 0; }
        .blog-content strong { font-weight: 600; }
      `}</style>
    </div>
  );
}
