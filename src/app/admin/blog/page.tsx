'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Edit3, Eye, EyeOff,
  Sparkles, RefreshCw, ExternalLink, Search, Copy, Check
} from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  publishedAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
  seoTitle?: string;
  seoDescription?: string;
  readingTimeMinutes: number;
}

const CATEGORIES = [
  { value: 'decluttering', label: 'Decluttering' },
  { value: 'home-staging', label: 'Home Staging' },
  { value: 'organization', label: 'Organization' },
  { value: 'room-guides', label: 'Room Guides' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'tips', label: 'Tips & Tricks' },
];

const SUGGESTED_KEYWORDS = [
  'how to organize a small closet',
  'bathroom staging tips for selling',
  'dining room staging ideas',
  'how to stage a home office',
  'backyard staging on a budget',
  'garage organization before selling',
  'laundry room makeover ideas',
  'how to depersonalize your home',
  'home staging mistakes to avoid',
  'staging a small apartment',
  'open house preparation checklist',
  'how to stage with existing furniture',
  'paint colors that sell homes',
  'budget home staging under $500',
  'staging tips for real estate photos',
  'entryway staging ideas',
  'guest bedroom staging tips',
  'kids room staging for home sale',
  'how to stage a kitchen on a budget',
  'front porch curb appeal ideas',
];

const ADMIN_KEY = 'loftie-admin-2026';

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'editor' | 'generate'>('list');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generator state
  const [genKeyword, setGenKeyword] = useState('');
  const [genCategory, setGenCategory] = useState('home-staging');
  const [genTone, setGenTone] = useState('encouraging');
  const [genAdditionalContext, setGenAdditionalContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState<Partial<BlogPost> | null>(null);

  // Editor state
  const [edTitle, setEdTitle] = useState('');
  const [edExcerpt, setEdExcerpt] = useState('');
  const [edContent, setEdContent] = useState('');
  const [edCategory, setEdCategory] = useState('home-staging');
  const [edTags, setEdTags] = useState('');
  const [edSeoTitle, setEdSeoTitle] = useState('');
  const [edSeoDesc, setEdSeoDesc] = useState('');
  const [edStatus, setEdStatus] = useState<'draft' | 'published'>('draft');

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/blog?drafts=true');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleGenerate = async () => {
    if (!genKeyword.trim()) return;
    setGenerating(true);
    setGeneratedContent(null);
    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({
          keyword: genKeyword,
          category: genCategory,
          tone: genTone,
          additionalContext: genAdditionalContext,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedContent(data.generated);
      showMessage('success', 'Content generated! Review and publish below.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Generation failed';
      showMessage('error', errMsg);
    } finally {
      setGenerating(false);
    }
  };

  const loadIntoEditor = (post?: Partial<BlogPost>) => {
    const p = post || {};
    setEdTitle(p.title || '');
    setEdExcerpt(p.excerpt || '');
    setEdContent(p.content || '');
    setEdCategory(p.category || 'home-staging');
    setEdTags((p.tags || []).join(', '));
    setEdSeoTitle(p.seoTitle || '');
    setEdSeoDesc(p.seoDescription || '');
    setEdStatus(p.status || 'draft');
    setView('editor');
  };

  const handleSave = async () => {
    if (!edTitle.trim() || !edContent.trim()) {
      showMessage('error', 'Title and content are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: edTitle,
        excerpt: edExcerpt,
        content: edContent,
        category: edCategory,
        tags: edTags.split(',').map(t => t.trim()).filter(Boolean),
        seoTitle: edSeoTitle || edTitle,
        seoDescription: edSeoDesc || edExcerpt,
        status: edStatus,
      };

      let res;
      if (editingPost) {
        res = await fetch(`/api/blog/${editingPost.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error('Save failed');
      showMessage('success', editingPost ? 'Post updated!' : 'Post created!');
      setEditingPost(null);
      setView('list');
      fetchPosts();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Save failed';
      showMessage('error', errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug: string) => {
    try {
      const res = await fetch(`/api/blog/${slug}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      if (!res.ok) throw new Error('Delete failed');
      showMessage('success', 'Post deleted');
      setDeleteConfirm(null);
      fetchPosts();
    } catch {
      showMessage('error', 'Delete failed');
    }
  };

  const toggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/blog/${post.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      showMessage('success', `Post ${newStatus === 'published' ? 'published' : 'unpublished'}`);
      fetchPosts();
    } catch {
      showMessage('error', 'Failed to update status');
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Styles
  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 16,
    border: '1px solid rgba(0,0,0,0.06)',
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  const btnPrimary: React.CSSProperties = {
    background: '#9CAF88',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: "'General Sans', sans-serif",
  };

  const btnSecondary: React.CSSProperties = {
    background: 'transparent',
    color: '#718096',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: "'General Sans', sans-serif",
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    fontFamily: "'General Sans', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
    marginBottom: 6,
    fontFamily: "'General Sans', sans-serif",
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#718096', fontSize: 14 }}>
              <ArrowLeft size={16} /> Admin
            </Link>
            <span style={{ color: '#cbd5e0' }}>|</span>
            <span style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 600, fontSize: 16, color: '#2d3748' }}>
              Blog Manager
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={view === 'list' ? btnPrimary : btnSecondary} onClick={() => { setView('list'); setEditingPost(null); }}>
              Posts ({posts.length})
            </button>
            <button style={view === 'generate' ? btnPrimary : btnSecondary} onClick={() => setView('generate')}>
              <Sparkles size={14} /> AI Generate
            </button>
            <button style={view === 'editor' && !editingPost ? btnPrimary : btnSecondary} onClick={() => { setEditingPost(null); loadIntoEditor(); }}>
              <Plus size={14} /> New Post
            </button>
          </div>
        </div>
      </header>

      {/* Message toast */}
      {message && (
        <div style={{
          position: 'fixed', top: 80, right: 20, zIndex: 100,
          padding: '12px 20px', borderRadius: 12,
          background: message.type === 'success' ? '#9CAF88' : '#e53e3e',
          color: 'white', fontSize: 14, fontWeight: 500,
          fontFamily: "'General Sans', sans-serif",
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {message.text}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* === LIST VIEW === */}
        {view === 'list' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>Loading posts...</div>
            ) : posts.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: 60 }}>
                <p style={{ color: '#718096', fontSize: 16, marginBottom: 16 }}>No blog posts yet</p>
                <button style={btnPrimary} onClick={() => setView('generate')}>
                  <Sparkles size={14} /> Generate Your First Post
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {posts.map(post => (
                  <div key={post.id} style={{ ...cardStyle, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: post.status === 'published' ? 'rgba(156,175,136,0.12)' : 'rgba(203,213,224,0.3)',
                          color: post.status === 'published' ? '#7a9166' : '#a0aec0',
                          fontFamily: "'General Sans', sans-serif",
                        }}>
                          {post.status}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                          background: 'rgba(66,153,225,0.08)', color: '#4299e1',
                          fontFamily: "'General Sans', sans-serif", textTransform: 'capitalize',
                        }}>
                          {post.category.replace('-', ' ')}
                        </span>
                        <span style={{ fontSize: 12, color: '#a0aec0', fontFamily: "'General Sans', sans-serif" }}>
                          {post.readingTimeMinutes} min · {formatDate(post.publishedAt)}
                        </span>
                      </div>
                      <h3 style={{
                        fontFamily: "'General Sans', sans-serif", fontSize: 15, fontWeight: 600,
                        color: '#2d3748', margin: '0 0 4px', lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {post.title}
                      </h3>
                      <p style={{
                        fontFamily: "'General Sans', sans-serif", fontSize: 13, color: '#718096',
                        margin: 0, lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {post.excerpt}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => toggleStatus(post)}
                        title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                        style={{ ...btnSecondary, padding: '8px 10px', border: 'none' }}
                      >
                        {post.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => { setEditingPost(post); loadIntoEditor(post); }}
                        title="Edit"
                        style={{ ...btnSecondary, padding: '8px 10px', border: 'none' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View"
                        style={{ ...btnSecondary, padding: '8px 10px', border: 'none', textDecoration: 'none' }}
                      >
                        <ExternalLink size={14} />
                      </a>
                      {deleteConfirm === post.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => handleDelete(post.slug)}
                            style={{ ...btnSecondary, padding: '8px 10px', border: 'none', color: '#e53e3e' }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            style={{ ...btnSecondary, padding: '8px 10px', border: 'none' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(post.id)}
                          title="Delete"
                          style={{ ...btnSecondary, padding: '8px 10px', border: 'none', color: '#e53e3e' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === AI GENERATE VIEW === */}
        {view === 'generate' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={cardStyle}>
              <h2 style={{ fontFamily: "'General Sans', sans-serif", fontSize: 18, fontWeight: 600, color: '#2d3748', marginTop: 0, marginBottom: 16 }}>
                <Sparkles size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                AI Blog Generator
              </h2>
              <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 13, color: '#718096', marginTop: 0, marginBottom: 20, lineHeight: 1.5 }}>
                Enter a keyword or topic. The AI will generate a full blog post using content and expertise from Sejal's book "Secrets of a Million Dollar Stager."
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Target Keyword *</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: 13, color: '#a0aec0' }} />
                    <input
                      style={{ ...inputStyle, paddingLeft: 32 }}
                      placeholder="e.g. how to stage a small bathroom"
                      value={genKeyword}
                      onChange={e => setGenKeyword(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select style={inputStyle} value={genCategory} onChange={e => setGenCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Tone</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['encouraging', 'casual', 'professional'].map(t => (
                    <button
                      key={t}
                      onClick={() => setGenTone(t)}
                      style={{
                        ...btnSecondary,
                        padding: '6px 14px', fontSize: 13,
                        background: genTone === t ? 'rgba(156,175,136,0.12)' : 'transparent',
                        color: genTone === t ? '#7a9166' : '#718096',
                        borderColor: genTone === t ? '#9CAF88' : '#e2e8f0',
                        textTransform: 'capitalize' as const,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Additional Context (optional)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                  placeholder="Paste additional book content, specific tips, or notes to guide the AI..."
                  value={genAdditionalContext}
                  onChange={e => setGenAdditionalContext(e.target.value)}
                />
              </div>

              <button
                style={{ ...btnPrimary, opacity: generating || !genKeyword.trim() ? 0.6 : 1 }}
                onClick={handleGenerate}
                disabled={generating || !genKeyword.trim()}
              >
                {generating ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                {generating ? 'Generating...' : 'Generate Blog Post'}
              </button>

              {/* Suggested Keywords */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <label style={{ ...labelStyle, fontSize: 12 }}>Suggested Keywords</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SUGGESTED_KEYWORDS.map(kw => (
                    <button
                      key={kw}
                      onClick={() => setGenKeyword(kw)}
                      style={{
                        background: genKeyword === kw ? 'rgba(156,175,136,0.15)' : '#f7f8fa',
                        border: genKeyword === kw ? '1px solid #9CAF88' : '1px solid transparent',
                        borderRadius: 8, padding: '4px 10px', fontSize: 12,
                        color: genKeyword === kw ? '#7a9166' : '#718096',
                        cursor: 'pointer', fontFamily: "'General Sans', sans-serif",
                      }}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated Content Preview */}
            {generatedContent && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "'General Sans', sans-serif", fontSize: 16, fontWeight: 600, color: '#2d3748', margin: 0 }}>
                    Generated Content Preview
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={btnSecondary} onClick={() => { loadIntoEditor({ ...generatedContent, status: 'draft' }); }}>
                      <Edit3 size={14} /> Edit & Publish
                    </button>
                    <button style={btnPrimary} onClick={() => { loadIntoEditor({ ...generatedContent, status: 'published' }); }}>
                      <Eye size={14} /> Publish Now
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>Title</span>
                  <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 18, fontWeight: 600, color: '#2d3748', margin: 0 }}>
                    {generatedContent.title}
                  </p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>Excerpt</span>
                  <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 14, color: '#718096', margin: 0 }}>
                    {generatedContent.excerpt}
                  </p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>SEO Title ({(generatedContent.seoTitle || '').length}/60)</span>
                  <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: 13, color: '#4a5568', margin: 0 }}>
                    {generatedContent.seoTitle}
                  </p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>Tags</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(generatedContent.tags || []).map(t => (
                      <span key={t} style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                        background: 'rgba(156,175,136,0.1)', color: '#7a9166',
                        fontFamily: "'General Sans', sans-serif",
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span style={labelStyle}>Content Preview</span>
                  <div style={{
                    background: '#fafbfc', borderRadius: 12, padding: 20, marginTop: 8,
                    maxHeight: 400, overflow: 'auto',
                    fontFamily: "'General Sans', sans-serif", fontSize: 14, color: '#4a5568', lineHeight: 1.7,
                  }}
                    dangerouslySetInnerHTML={{ __html: generatedContent.content || '' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* === EDITOR VIEW === */}
        {view === 'editor' && (
          <div style={cardStyle}>
            <h2 style={{ fontFamily: "'General Sans', sans-serif", fontSize: 18, fontWeight: 600, color: '#2d3748', marginTop: 0, marginBottom: 20 }}>
              {editingPost ? 'Edit Post' : 'New Post'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={edTitle} onChange={e => setEdTitle(e.target.value)} placeholder="Blog post title" />
              </div>

              <div>
                <label style={labelStyle}>Excerpt / Meta Description</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={edExcerpt} onChange={e => setEdExcerpt(e.target.value)} placeholder="1-2 sentence summary for SEO and previews" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select style={inputStyle} value={edCategory} onChange={e => setEdCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={edStatus} onChange={e => setEdStatus(e.target.value as 'draft' | 'published')}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Tags (comma-separated)</label>
                <input style={inputStyle} value={edTags} onChange={e => setEdTags(e.target.value)} placeholder="home staging, decluttering, tips" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>SEO Title (max 60 chars)</label>
                  <input style={inputStyle} value={edSeoTitle} onChange={e => setEdSeoTitle(e.target.value)} placeholder="Defaults to title" maxLength={60} />
                  <span style={{ fontSize: 11, color: '#a0aec0' }}>{edSeoTitle.length}/60</span>
                </div>
                <div>
                  <label style={labelStyle}>SEO Description (max 155 chars)</label>
                  <input style={inputStyle} value={edSeoDesc} onChange={e => setEdSeoDesc(e.target.value)} placeholder="Defaults to excerpt" maxLength={155} />
                  <span style={{ fontSize: 11, color: '#a0aec0' }}>{edSeoDesc.length}/155</span>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Content (HTML) *</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 400, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
                  value={edContent}
                  onChange={e => setEdContent(e.target.value)}
                  placeholder="<p>Your blog post content...</p>"
                />
              </div>

              {/* Content Preview */}
              {edContent && (
                <div>
                  <label style={labelStyle}>Preview</label>
                  <div
                    style={{
                      background: '#fafbfc', borderRadius: 12, padding: 20,
                      maxHeight: 300, overflow: 'auto',
                      fontFamily: "'General Sans', sans-serif", fontSize: 14, color: '#4a5568', lineHeight: 1.7,
                    }}
                    dangerouslySetInnerHTML={{ __html: edContent }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button style={btnSecondary} onClick={() => { setView('list'); setEditingPost(null); }}>
                  Cancel
                </button>
                <button
                  style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {saving ? 'Saving...' : editingPost ? 'Update Post' : 'Create Post'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus, textarea:focus, select:focus { border-color: #9CAF88 !important; }
      `}</style>
    </div>
  );
}
