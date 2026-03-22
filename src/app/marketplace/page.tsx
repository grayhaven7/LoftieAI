'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, MapPin, Tag, Camera, ArrowLeft, Package, Check, Trash2, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number | null;
  category: string;
  location: string;
  imageUrl: string;
  status: 'active' | 'sold' | 'removed';
  sellerId: string;
  sellerFirstName: string;
  createdAt: string;
}

interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All', emoji: '🏠' },
  { value: 'furniture', label: 'Furniture', emoji: '🛋️' },
  { value: 'clothes', label: 'Clothes', emoji: '👕' },
  { value: 'books', label: 'Books', emoji: '📚' },
  { value: 'electronics', label: 'Electronics', emoji: '💻' },
  { value: 'kitchen', label: 'Kitchen', emoji: '🍳' },
  { value: 'decor', label: 'Decor', emoji: '🖼️' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

async function compressImage(file: File, maxDimension = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      canvas.width = width;
      canvas.height = height;
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target?.result as string; };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function MarketplacePage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMyListings, setShowMyListings] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formIsFree, setFormIsFree] = useState(false);
  const [formCategory, setFormCategory] = useState('furniture');
  const [formLocation, setFormLocation] = useState('');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setAuthUser(d.user); })
      .catch(() => {});

    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const res = await fetch('/api/marketplace');
      const data = await res.json();
      if (data.listings) setListings(data.listings);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    try {
      const res = await fetch('/api/marketplace/mine');
      const data = await res.json();
      if (data.listings) setMyListings(data.listings);
    } catch {
      // silent
    }
  };

  const handleShowMyListings = () => {
    setShowMyListings(true);
    fetchMyListings();
  };

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setFormImage(compressed);
    } catch {
      setFormError('Failed to process image');
    }
  }, []);

  const handleSubmit = async () => {
    if (!formTitle || !formDescription || !formCategory || !formLocation || !formImage) {
      setFormError('Please fill in all fields and add a photo');
      return;
    }

    setCreating(true);
    setFormError(null);

    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          price: formIsFree ? null : formPrice,
          category: formCategory,
          location: formLocation,
          imageBase64: formImage,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create listing');
      }

      // Reset form
      setFormTitle('');
      setFormDescription('');
      setFormPrice('');
      setFormIsFree(false);
      setFormCategory('furniture');
      setFormLocation('');
      setFormImage(null);
      setShowCreateForm(false);
      fetchListings();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'sold' | 'active' | 'removed') => {
    try {
      await fetch(`/api/marketplace/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchMyListings();
      fetchListings();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this listing?')) return;
    try {
      await fetch(`/api/marketplace/${id}`, { method: 'DELETE' });
      fetchMyListings();
      fetchListings();
    } catch {
      // silent
    }
  };

  const filtered = listings.filter((l) => {
    const matchesCategory = activeCategory === 'all' || l.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
              <NextImage src="/loftie-logo.png" alt="Loftie" width={28} height={28} style={{ borderRadius: 6 }} />
              <span style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 600, fontSize: 18, color: '#2d3748', letterSpacing: '-0.02em' }}>
                Loftie
              </span>
            </Link>
            <span style={{ color: '#cbd5e0', fontSize: 20, fontWeight: 300 }}>|</span>
            <span style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 500, fontSize: 15, color: '#718096', letterSpacing: '-0.01em' }}>
              Marketplace
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {authUser && (
              <button
                onClick={handleShowMyListings}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: 'white',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#4a5568',
                  cursor: 'pointer',
                  fontFamily: "'General Sans', sans-serif",
                }}
              >
                My Listings
              </button>
            )}
            {authUser && (
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#9CAF88',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'General Sans', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Plus size={15} />
                Post Item
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero section */}
      <div style={{ textAlign: 'center', padding: '48px 20px 24px' }}>
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
          Loftie Community Market
        </h1>
        <p
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontSize: 16,
            color: '#718096',
            maxWidth: 440,
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          Decluttered your space? Give your items a second life.
        </p>
      </div>

      {/* Search bar */}
      <div style={{ maxWidth: 600, margin: '0 auto 20px', padding: '0 20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            background: 'white',
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <Search size={18} color="#718096" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              fontFamily: "'General Sans', sans-serif",
              color: '#2d3748',
              background: 'transparent',
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={16} color="#a0aec0" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: activeCategory === cat.value ? '1.5px solid #9CAF88' : '1px solid rgba(0,0,0,0.08)',
                background: activeCategory === cat.value ? 'rgba(156,175,136,0.1)' : 'white',
                color: activeCategory === cat.value ? '#7a9166' : '#4a5568',
                fontSize: 13,
                fontWeight: activeCategory === cat.value ? 600 : 500,
                cursor: 'pointer',
                fontFamily: "'General Sans', sans-serif",
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listings grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#9CAF88', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Package size={48} color="#cbd5e0" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#a0aec0', fontSize: 16, fontFamily: "'General Sans', sans-serif" }}>
              {searchQuery || activeCategory !== 'all' ? 'No items match your search' : 'No listings yet. Be the first to post!'}
            </p>
            {authUser && (
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  marginTop: 16,
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#9CAF88',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'General Sans', sans-serif",
                }}
              >
                Post an Item
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            <AnimatePresence>
              {filtered.map((listing) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => router.push(`/marketplace/${listing.id}`)}
                  style={{
                    background: 'white',
                    borderRadius: 14,
                    border: '1px solid rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                >
                  <div style={{ position: 'relative', width: '100%', paddingTop: '75%', overflow: 'hidden', background: '#f0f2f5' }}>
                    <img
                      src={listing.imageUrl}
                      alt={listing.title}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {listing.price === null && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          padding: '3px 10px',
                          borderRadius: 6,
                          background: '#9CAF88',
                          color: 'white',
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "'General Sans', sans-serif",
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Free
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <h3
                        style={{
                          fontFamily: "'General Sans', sans-serif",
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#2d3748',
                          margin: 0,
                          lineHeight: 1.3,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {listing.title}
                      </h3>
                      {listing.price !== null && (
                        <span style={{ fontFamily: "'General Sans', sans-serif", fontSize: 15, fontWeight: 700, color: '#2d3748', marginLeft: 8, whiteSpace: 'nowrap' }}>
                          ${listing.price}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#a0aec0', fontSize: 12, fontFamily: "'General Sans', sans-serif" }}>
                      <MapPin size={12} />
                      <span>{listing.location}</span>
                      <span style={{ margin: '0 4px' }}>·</span>
                      <span>{timeAgo(listing.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {authUser && !showCreateForm && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setShowCreateForm(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#9CAF88',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 16px rgba(156,175,136,0.4)',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40,
          }}
          className="mobile-fab"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={26} />
        </motion.button>
      )}
      <style>{`.mobile-fab { display: none !important; } @media (max-width: 640px) { .mobile-fab { display: flex !important; } }`}</style>

      {/* Create Listing Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: 20,
                padding: 28,
                width: '100%',
                maxWidth: 480,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontFamily: "'General Sans', sans-serif", fontSize: 20, fontWeight: 600, color: '#2d3748', margin: 0, letterSpacing: '-0.02em' }}>
                  Post an Item
                </h2>
                <button onClick={() => setShowCreateForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X size={20} color="#a0aec0" />
                </button>
              </div>

              {/* Image upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  paddingTop: formImage ? '0' : '56%',
                  position: 'relative',
                  borderRadius: 14,
                  border: '2px dashed rgba(0,0,0,0.1)',
                  background: '#f8f9fa',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  marginBottom: 20,
                  transition: 'border-color 0.2s',
                }}
              >
                {formImage ? (
                  <img src={formImage} alt="Preview" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Camera size={28} color="#a0aec0" />
                    <span style={{ fontSize: 13, color: '#a0aec0', fontFamily: "'General Sans', sans-serif" }}>
                      Tap to add a photo
                    </span>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />

              {/* Title */}
              <input
                type="text"
                placeholder="What are you listing?"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                maxLength={80}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.1)',
                  fontSize: 15,
                  fontFamily: "'General Sans', sans-serif",
                  color: '#2d3748',
                  marginBottom: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {/* Description */}
              <textarea
                placeholder="Describe your item (condition, size, details...)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.1)',
                  fontSize: 14,
                  fontFamily: "'General Sans', sans-serif",
                  color: '#2d3748',
                  marginBottom: 12,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />

              {/* Price */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', fontSize: 15 }}>$</span>
                  <input
                    type="number"
                    placeholder="Price"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    disabled={formIsFree}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 28px',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.1)',
                      fontSize: 15,
                      fontFamily: "'General Sans', sans-serif",
                      color: formIsFree ? '#cbd5e0' : '#2d3748',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: formIsFree ? '#f8f9fa' : 'white',
                    }}
                  />
                </div>
                <button
                  onClick={() => { setFormIsFree(!formIsFree); if (!formIsFree) setFormPrice(''); }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: formIsFree ? '1.5px solid #9CAF88' : '1px solid rgba(0,0,0,0.1)',
                    background: formIsFree ? 'rgba(156,175,136,0.1)' : 'white',
                    color: formIsFree ? '#7a9166' : '#4a5568',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'General Sans', sans-serif",
                    whiteSpace: 'nowrap',
                  }}
                >
                  Free
                </button>
              </div>

              {/* Category */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.1)',
                    fontSize: 14,
                    fontFamily: "'General Sans', sans-serif",
                    color: '#2d3748',
                    outline: 'none',
                    appearance: 'none',
                    background: 'white',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} color="#a0aec0" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>

              {/* Location */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <MapPin size={16} color="#a0aec0" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="City or ZIP code"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 38px',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.1)',
                    fontSize: 14,
                    fontFamily: "'General Sans', sans-serif",
                    color: '#2d3748',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {formError && (
                <p style={{ color: '#f56565', fontSize: 13, marginBottom: 16, fontFamily: "'General Sans', sans-serif" }}>{formError}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={creating}
                style={{
                  width: '100%',
                  padding: '14px 0',
                  borderRadius: 12,
                  border: 'none',
                  background: creating ? '#b5c4a3' : '#9CAF88',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: creating ? 'default' : 'pointer',
                  fontFamily: "'General Sans', sans-serif",
                  letterSpacing: '-0.01em',
                  transition: 'background 0.2s',
                }}
              >
                {creating ? 'Posting...' : 'Post Listing'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Listings Modal */}
      <AnimatePresence>
        {showMyListings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setShowMyListings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: 20,
                padding: 28,
                width: '100%',
                maxWidth: 520,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontFamily: "'General Sans', sans-serif", fontSize: 20, fontWeight: 600, color: '#2d3748', margin: 0 }}>
                  My Listings
                </h2>
                <button onClick={() => setShowMyListings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X size={20} color="#a0aec0" />
                </button>
              </div>

              {myListings.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#a0aec0', padding: '32px 0', fontFamily: "'General Sans', sans-serif" }}>
                  You haven&apos;t posted any items yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {myListings.map((listing) => (
                    <div
                      key={listing.id}
                      style={{
                        display: 'flex',
                        gap: 14,
                        padding: 12,
                        borderRadius: 12,
                        border: '1px solid rgba(0,0,0,0.06)',
                        background: listing.status === 'sold' ? '#f8f9fa' : 'white',
                        opacity: listing.status === 'sold' ? 0.7 : 1,
                      }}
                    >
                      <img
                        src={listing.imageUrl}
                        alt={listing.title}
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontFamily: "'General Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#2d3748', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {listing.title}
                        </h4>
                        <p style={{ fontSize: 13, color: '#718096', margin: '0 0 8px', fontFamily: "'General Sans', sans-serif" }}>
                          {listing.price === null ? 'Free' : `$${listing.price}`}
                          {listing.status === 'sold' && (
                            <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: '#edf2f7', color: '#a0aec0', fontSize: 11, fontWeight: 600 }}>
                              SOLD
                            </span>
                          )}
                        </p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {listing.status === 'active' && (
                            <button
                              onClick={() => handleUpdateStatus(listing.id, 'sold')}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: '1px solid rgba(0,0,0,0.08)',
                                background: 'white',
                                fontSize: 11,
                                fontWeight: 500,
                                color: '#4a5568',
                                cursor: 'pointer',
                                fontFamily: "'General Sans', sans-serif",
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Check size={12} /> Mark Sold
                            </button>
                          )}
                          {listing.status === 'sold' && (
                            <button
                              onClick={() => handleUpdateStatus(listing.id, 'active')}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: '1px solid rgba(0,0,0,0.08)',
                                background: 'white',
                                fontSize: 11,
                                fontWeight: 500,
                                color: '#4a5568',
                                cursor: 'pointer',
                                fontFamily: "'General Sans', sans-serif",
                              }}
                            >
                              Relist
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(listing.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(0,0,0,0.08)',
                              background: 'white',
                              fontSize: 11,
                              fontWeight: 500,
                              color: '#f56565',
                              cursor: 'pointer',
                              fontFamily: "'General Sans', sans-serif",
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not logged in notice */}
      {!authUser && !loading && (
        <div style={{ textAlign: 'center', padding: '0 20px 40px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-block',
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
            Sign in to post items
          </Link>
        </div>
      )}
    </div>
  );
}
