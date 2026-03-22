'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Tag, Mail, Clock, User } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { useParams, useRouter } from 'next/navigation';

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
  sellerEmail: string;
  createdAt: string;
}

interface AuthUser {
  id: string;
  firstName: string;
  email: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  furniture: '🛋️ Furniture',
  clothes: '👕 Clothes',
  books: '📚 Books',
  electronics: '💻 Electronics',
  kitchen: '🍳 Kitchen',
  decor: '🖼️ Decor',
  other: '📦 Other',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setAuthUser(d.user); })
      .catch(() => {});

    if (params.id) {
      fetch(`/api/marketplace/${params.id}`)
        .then((r) => {
          if (!r.ok) throw new Error('Not found');
          return r.json();
        })
        .then((d) => setListing(d.listing))
        .catch(() => setError('Listing not found'))
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
        <div style={{ textAlign: 'center', color: '#a0aec0' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#9CAF88', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Loading...
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, color: '#718096', marginBottom: 20, fontFamily: "'General Sans', sans-serif" }}>
            {error || 'Listing not found'}
          </p>
          <Link
            href="/marketplace"
            style={{
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
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

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
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push('/marketplace')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={20} color="#4a5568" />
          </button>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
            <NextImage src="/loftie-logo.png" alt="Loftie" width={24} height={24} style={{ borderRadius: 5 }} />
            <span style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 600, fontSize: 16, color: '#2d3748' }}>
              Loftie
            </span>
          </Link>
          <span style={{ color: '#cbd5e0', fontSize: 18, fontWeight: 300 }}>|</span>
          <span style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 500, fontSize: 14, color: '#718096' }}>
            Marketplace
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 80px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
            gap: 32,
          }}
          className="listing-detail-grid"
        >
          {/* Image */}
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#f0f2f5' }}>
            <img
              src={listing.imageUrl}
              alt={listing.title}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            {listing.status === 'sold' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    padding: '8px 24px',
                    borderRadius: 8,
                    background: 'white',
                    color: '#2d3748',
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "'General Sans', sans-serif",
                    letterSpacing: '0.05em',
                  }}
                >
                  SOLD
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'rgba(156,175,136,0.12)',
                  color: '#7a9166',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'General Sans', sans-serif",
                }}
              >
                {CATEGORY_LABELS[listing.category] || listing.category}
              </span>
            </div>

            <h1
              style={{
                fontFamily: "'General Sans', sans-serif",
                fontSize: 'clamp(22px, 4vw, 32px)',
                fontWeight: 600,
                color: '#2d3748',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                margin: '0 0 12px',
              }}
            >
              {listing.title}
            </h1>

            <div
              style={{
                fontFamily: "'General Sans', sans-serif",
                fontSize: 28,
                fontWeight: 700,
                color: listing.price === null ? '#9CAF88' : '#2d3748',
                marginBottom: 20,
              }}
            >
              {listing.price === null ? 'Free' : `$${listing.price}`}
            </div>

            <div
              style={{
                padding: 20,
                borderRadius: 14,
                background: 'white',
                border: '1px solid rgba(0,0,0,0.06)',
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontFamily: "'General Sans', sans-serif",
                  fontSize: 15,
                  color: '#4a5568',
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {listing.description}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#718096', fontSize: 14, fontFamily: "'General Sans', sans-serif" }}>
                <MapPin size={16} />
                <span>{listing.location}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#718096', fontSize: 14, fontFamily: "'General Sans', sans-serif" }}>
                <Clock size={16} />
                <span>Listed {formatDate(listing.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#718096', fontSize: 14, fontFamily: "'General Sans', sans-serif" }}>
                <User size={16} />
                <span>Posted by {listing.sellerFirstName}</span>
              </div>
            </div>

            {/* Contact button */}
            {listing.status === 'active' && (
              <>
                {!showEmail ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (!authUser) {
                        router.push('/');
                        return;
                      }
                      setShowEmail(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 0',
                      borderRadius: 12,
                      border: 'none',
                      background: '#9CAF88',
                      color: 'white',
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: "'General Sans', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Mail size={18} />
                    {authUser ? 'Contact Seller' : 'Sign in to Contact'}
                  </motion.button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: 'rgba(156,175,136,0.08)',
                      border: '1px solid rgba(156,175,136,0.2)',
                    }}
                  >
                    <p style={{ fontSize: 13, color: '#718096', marginBottom: 8, fontFamily: "'General Sans', sans-serif" }}>
                      Reach out to {listing.sellerFirstName}:
                    </p>
                    <a
                      href={`mailto:${listing.sellerEmail}?subject=Loftie Marketplace: ${listing.title}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#7a9166',
                        fontSize: 15,
                        fontWeight: 600,
                        fontFamily: "'General Sans', sans-serif",
                        textDecoration: 'none',
                      }}
                    >
                      <Mail size={16} />
                      {listing.sellerEmail}
                    </a>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .listing-detail-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
