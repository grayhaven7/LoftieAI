'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Sparkles, RefreshCw, Search, Check, Calendar, BookOpen
} from 'lucide-react';

const CATEGORIES = [
  { value: 'decluttering', label: 'Decluttering' },
  { value: 'home-staging', label: 'Home Staging' },
  { value: 'organization', label: 'Organization' },
  { value: 'room-guides', label: 'Room Guides' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'tips', label: 'Tips & Tricks' },
];

const SUGGESTED_KEYWORDS = [
  // Homeowners selling
  { keyword: 'is home staging worth the cost', category: 'home-staging' },
  { keyword: 'how to sell your home fast', category: 'tips' },
  { keyword: 'biggest staging mistakes sellers make', category: 'home-staging' },
  { keyword: 'how to keep your house show ready with kids', category: 'tips' },
  // Empty nesters
  { keyword: 'downsizing tips for empty nesters', category: 'decluttering' },
  { keyword: 'how to let go of sentimental items', category: 'decluttering' },
  { keyword: 'emotional guide to selling the family home', category: 'lifestyle' },
  // Overwhelmed by clutter
  { keyword: 'where to start when your house is a mess', category: 'decluttering' },
  { keyword: 'decluttering when you feel overwhelmed', category: 'decluttering' },
  // DIY design
  { keyword: 'how to make your home look expensive on a budget', category: 'tips' },
  { keyword: 'interior design tricks from professional stagers', category: 'tips' },
  { keyword: 'throw pillow arrangement ideas', category: 'tips' },
  // Real estate agents
  { keyword: 'staging tips for real estate agents', category: 'home-staging' },
  { keyword: 'staging ROI statistics agents should know', category: 'home-staging' },
  // High-value markets
  { keyword: 'luxury home staging tips', category: 'home-staging' },
  { keyword: 'staging a condo for sale', category: 'home-staging' },
  // AI and innovation
  { keyword: 'how AI is changing home staging', category: 'lifestyle' },
  { keyword: 'virtual staging vs traditional staging', category: 'home-staging' },
  // Thought leadership
  { keyword: 'psychology behind home staging', category: 'home-staging' },
  { keyword: 'why staged homes sell faster', category: 'home-staging' },
];

const ADMIN_KEY = 'loftie-admin-2026';

export default function AdminBlogPage() {
  const [postCount, setPostCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [step, setStep] = useState<'idle' | 'generating' | 'preview' | 'published'>('idle');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generator inputs
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('home-staging');
  const [tone, setTone] = useState('encouraging');
  const [additionalContext, setAdditionalContext] = useState('');

  // Generated content
  const [generated, setGenerated] = useState<{
    title: string;
    excerpt: string;
    content: string;
    tags: string[];
    seoTitle: string;
    seoDescription: string;
    category: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/blog?drafts=true')
      .then(r => r.json())
      .then(d => setPostCount(d.posts?.length || 0))
      .catch(() => {});
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    setGenerating(true);
    setStep('generating');
    setGenerated(null);
    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ keyword, category, tone, additionalContext }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGenerated(data.generated);
      setStep('preview');
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : 'Generation failed. Please try again.');
      setStep('idle');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generated) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ ...generated, status: 'published' }),
      });
      if (!res.ok) throw new Error('Publish failed');
      setStep('published');
      setPostCount(prev => prev + 1);
      showMessage('success', 'Blog post published!');
    } catch {
      showMessage('error', 'Failed to publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handleScheduleDraft = async () => {
    if (!generated) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ ...generated, status: 'draft' }),
      });
      if (!res.ok) throw new Error('Save failed');
      setStep('published');
      setPostCount(prev => prev + 1);
      showMessage('success', 'Saved as draft! It will be reviewed before publishing.');
    } catch {
      showMessage('error', 'Failed to save. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setStep('idle');
    setGenerated(null);
    setKeyword('');
    setAdditionalContext('');
  };

  const selectSuggestion = (kw: string, cat: string) => {
    setKeyword(kw);
    setCategory(cat);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#718096', fontSize: 14, fontFamily: "'General Sans', sans-serif" }}>
              <ArrowLeft size={16} /> Admin
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: 'rgba(156,175,136,0.12)', color: '#7a9166',
              fontFamily: "'General Sans', sans-serif",
            }}>
              {postCount} posts published
            </span>
            <a href="/blog" target="_blank" rel="noopener noreferrer" style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              background: '#f7f8fa', color: '#718096', textDecoration: 'none',
              fontFamily: "'General Sans', sans-serif",
            }}>
              View Blog →
            </a>
          </div>
        </div>
      </header>

      {/* Toast */}
      {message && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          padding: '12px 24px', borderRadius: 12,
          background: message.type === 'success' ? '#9CAF88' : '#e53e3e',
          color: 'white', fontSize: 14, fontWeight: 500,
          fontFamily: "'General Sans', sans-serif",
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          {message.text}
        </div>
      )}

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "'General Sans', sans-serif", fontSize: 28, fontWeight: 600,
            color: '#2d3748', letterSpacing: '-0.03em', marginBottom: 8,
          }}>
            ✍️ Create Blog Content
          </h1>
          <p style={{
            fontFamily: "'General Sans', sans-serif", fontSize: 15, color: '#718096', lineHeight: 1.5,
            maxWidth: 480, margin: '0 auto',
          }}>
            Enter a topic or keyword and the AI will write a complete blog post using your expertise from "Secrets of a Million Dollar Stager."
          </p>
        </div>

        {/* === IDLE / INPUT STATE === */}
        {(step === 'idle' || step === 'generating') && (
          <div style={{
            background: 'white', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)',
            padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            {/* Keyword input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 8, fontFamily: "'General Sans', sans-serif" }}>
                What should the post be about?
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#a0aec0' }} />
                <input
                  style={{
                    width: '100%', padding: '12px 16px 12px 40px', borderRadius: 12,
                    border: '2px solid #e2e8f0', fontSize: 15, fontFamily: "'General Sans', sans-serif",
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  placeholder="e.g. how to stage a small bathroom on a budget"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = '#9CAF88')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  disabled={generating}
                />
              </div>
            </div>

            {/* Category + Tone row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#718096', marginBottom: 6, fontFamily: "'General Sans', sans-serif" }}>
                  Category
                </label>
                <select
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '1px solid #e2e8f0', fontSize: 14, fontFamily: "'General Sans', sans-serif",
                    outline: 'none', color: '#4a5568', background: 'white',
                  }}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={generating}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#718096', marginBottom: 6, fontFamily: "'General Sans', sans-serif" }}>
                  Tone
                </label>
                <select
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '1px solid #e2e8f0', fontSize: 14, fontFamily: "'General Sans', sans-serif",
                    outline: 'none', color: '#4a5568', background: 'white',
                  }}
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  disabled={generating}
                >
                  <option value="encouraging">Encouraging & Warm</option>
                  <option value="casual">Casual & Friendly</option>
                  <option value="professional">Professional & Authoritative</option>
                </select>
              </div>
            </div>

            {/* Additional context */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#718096', marginBottom: 6, fontFamily: "'General Sans', sans-serif" }}>
                Extra notes or book excerpts (optional)
              </label>
              <textarea
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1px solid #e2e8f0', fontSize: 14, fontFamily: "'General Sans', sans-serif",
                  outline: 'none', minHeight: 70, resize: 'vertical',
                }}
                placeholder="Paste specific tips from your book or add notes to guide the post..."
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
                disabled={generating}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !keyword.trim()}
              style={{
                width: '100%', padding: '14px 24px', borderRadius: 12,
                background: generating || !keyword.trim() ? '#cbd5e0' : '#9CAF88',
                color: 'white', border: 'none', fontSize: 16, fontWeight: 600,
                cursor: generating || !keyword.trim() ? 'default' : 'pointer',
                fontFamily: "'General Sans', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.2s',
              }}
            >
              {generating ? (
                <>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Writing your post... (about 30 seconds)
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Blog Post
                </>
              )}
            </button>

            {/* Suggested keywords */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f2f5' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#a0aec0', marginBottom: 10, fontFamily: "'General Sans', sans-serif" }}>
                💡 TOPIC IDEAS
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SUGGESTED_KEYWORDS.map(({ keyword: kw, category: cat }) => (
                  <button
                    key={kw}
                    onClick={() => selectSuggestion(kw, cat)}
                    disabled={generating}
                    style={{
                      background: keyword === kw ? 'rgba(156,175,136,0.15)' : '#f7f8fa',
                      border: keyword === kw ? '1px solid #9CAF88' : '1px solid transparent',
                      borderRadius: 20, padding: '5px 12px', fontSize: 12,
                      color: keyword === kw ? '#7a9166' : '#718096',
                      cursor: 'pointer', fontFamily: "'General Sans', sans-serif",
                      transition: 'all 0.15s',
                    }}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === PREVIEW STATE === */}
        {step === 'preview' && generated && (
          <div>
            {/* Preview card */}
            <div style={{
              background: 'white', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 16,
            }}>
              {/* Preview header */}
              <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0f2f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: 'rgba(156,175,136,0.12)', color: '#7a9166',
                    fontFamily: "'General Sans', sans-serif", textTransform: 'capitalize',
                  }}>
                    {generated.category.replace('-', ' ')}
                  </span>
                  <span style={{ fontSize: 12, color: '#a0aec0', fontFamily: "'General Sans', sans-serif" }}>
                    by Sejal Parekh
                  </span>
                </div>
                <h2 style={{
                  fontFamily: "'General Sans', sans-serif", fontSize: 22, fontWeight: 600,
                  color: '#2d3748', letterSpacing: '-0.02em', lineHeight: 1.3, margin: '0 0 8px',
                }}>
                  {generated.title}
                </h2>
                <p style={{
                  fontFamily: "'General Sans', sans-serif", fontSize: 14, color: '#718096',
                  lineHeight: 1.5, margin: 0,
                }}>
                  {generated.excerpt}
                </p>
              </div>

              {/* Content preview */}
              <div style={{
                padding: '24px 28px', maxHeight: 500, overflow: 'auto',
                fontFamily: "'General Sans', sans-serif", fontSize: 15, color: '#4a5568', lineHeight: 1.75,
              }}
                dangerouslySetInnerHTML={{ __html: generated.content }}
              />

              {/* Tags */}
              <div style={{ padding: '12px 28px 20px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {generated.tags.map(t => (
                  <span key={t} style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                    background: '#f7f8fa', color: '#718096', fontFamily: "'General Sans', sans-serif",
                  }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handlePublish}
                disabled={publishing}
                style={{
                  flex: 1, padding: '14px 24px', borderRadius: 12,
                  background: '#9CAF88', color: 'white', border: 'none',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'General Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: publishing ? 0.6 : 1,
                }}
              >
                {publishing ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                Publish Now
              </button>
              <button
                onClick={handleScheduleDraft}
                disabled={publishing}
                style={{
                  flex: 1, padding: '14px 24px', borderRadius: 12,
                  background: 'white', color: '#4a5568', border: '1px solid #e2e8f0',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'General Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: publishing ? 0.6 : 1,
                }}
              >
                <Calendar size={16} />
                Save as Draft
              </button>
            </div>

            {/* Regenerate / start over */}
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                onClick={() => { setStep('idle'); setGenerated(null); }}
                style={{
                  background: 'none', border: 'none', color: '#a0aec0', fontSize: 13,
                  cursor: 'pointer', fontFamily: "'General Sans', sans-serif",
                  textDecoration: 'underline',
                }}
              >
                Not quite right? Generate again
              </button>
            </div>
          </div>
        )}

        {/* === PUBLISHED STATE === */}
        {step === 'published' && (
          <div style={{
            background: 'white', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)',
            padding: 48, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 32, background: 'rgba(156,175,136,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Check size={32} color="#7a9166" />
            </div>
            <h2 style={{
              fontFamily: "'General Sans', sans-serif", fontSize: 22, fontWeight: 600,
              color: '#2d3748', marginBottom: 8,
            }}>
              Post Created!
            </h2>
            <p style={{
              fontFamily: "'General Sans', sans-serif", fontSize: 15, color: '#718096',
              marginBottom: 24,
            }}>
              Your blog post is live and will start appearing in search results as Google indexes it.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={resetForm}
                style={{
                  padding: '12px 24px', borderRadius: 12,
                  background: '#9CAF88', color: 'white', border: 'none',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'General Sans', sans-serif",
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Sparkles size={14} /> Create Another Post
              </button>
              <a
                href="/blog"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '12px 24px', borderRadius: 12,
                  background: 'white', color: '#4a5568', border: '1px solid #e2e8f0',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'General Sans', sans-serif", textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <BookOpen size={14} /> View Blog
              </a>
            </div>
          </div>
        )}

        {/* Auto-publishing info */}
        <div style={{
          marginTop: 32, padding: '16px 20px', borderRadius: 12,
          background: 'rgba(156,175,136,0.06)', border: '1px solid rgba(156,175,136,0.15)',
        }}>
          <p style={{
            fontFamily: "'General Sans', sans-serif", fontSize: 13, color: '#718096',
            margin: 0, lineHeight: 1.5,
          }}>
            💡 <strong style={{ color: '#4a5568' }}>Auto-publishing is active.</strong> New blog posts are automatically created daily using SEO keyword research and content from your book. You can also create posts manually anytime using the tool above.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
