'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, ExternalLink, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

interface TransformationRecord {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  userEmail?: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
}

export default function AdminPage() {
  const [transformations, setTransformations] = useState<TransformationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransformations = async () => {
    try {
      setError(null);
      const response = await fetch('/api/transformations', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      let body: any = null;
      try {
        body = await response.json();
      } catch {
        // ignore
      }

      if (!response.ok) {
        const msg =
          body?.error ||
          `Failed to load transformations (HTTP ${response.status})`;
        setError(msg);
        setTransformations([]);
        return;
      }

      setTransformations(Array.isArray(body) ? body : []);
    } catch (err) {
      console.error('Failed to fetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transformations');
      setTransformations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchTransformations(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransformations();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Only show completed transformations in the main list
  const completedTransformations = transformations.filter(t => t.status === 'completed');
  
  const stats = [
    { value: completedTransformations.length, label: 'Completed' },
    { value: transformations.filter(t => t.status === 'processing').length, label: 'Processing' },
    {
      value: completedTransformations.filter(t => {
        const d = new Date(t.createdAt);
        return d.toDateString() === new Date().toDateString();
      }).length,
      label: 'Today'
    },
  ];

  return (
    <div className="gradient-bg min-h-screen">
      {/* Header */}
      <header className="py-4 px-4 sm:px-6 border-b border-[rgba(255,255,255,0.04)]">
        <nav className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          
          <span className="logo-text">Loftie</span>
          
          <button onClick={handleRefresh} disabled={refreshing} className="btn-icon">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </nav>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl text-[var(--color-text-primary)] tracking-tight mb-1">
            <span className="text-emphasis">Dashboard</span>
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Manage transformations</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="stat-value text-[var(--color-accent)]">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Content */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[var(--color-text-muted)] text-sm">Loading...</p>
            </div>
          ) : error ? (
            <div className="card text-center py-10">
              <h3 className="text-sm text-[var(--color-text-primary)] font-medium mb-2">Dashboard error</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <button onClick={handleRefresh} className="btn-secondary">Retry</button>
                <a href="/api/debug/storage" className="btn-primary" target="_blank" rel="noreferrer">
                  Storage Debug
                </a>
              </div>
            </div>
          ) : completedTransformations.length === 0 ? (
            <div className="card text-center py-12">
              <ImageIcon className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-3" />
              <h3 className="text-sm text-[var(--color-text-primary)] font-medium mb-1">No transformations</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Upload your first room photo</p>
              <Link href="/" className="btn-primary inline-flex">Get Started</Link>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="w-16">Preview</th>
                      <th>ID</th>
                      <th>Email</th>
                      <th>Date</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedTransformations.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <img src={t.afterImageUrl} alt="" className="w-12 h-8 object-cover rounded" />
                        </td>
                        <td>
                          <code className="text-xs text-[var(--color-text-muted)]">{t.id.slice(0, 10)}...</code>
                        </td>
                        <td className="text-sm text-[var(--color-text-secondary)]">{t.userEmail || '—'}</td>
                        <td className="text-sm text-[var(--color-text-muted)]">{formatDate(t.createdAt)}</td>
                        <td>
                          <Link href={`/results/${t.id}`} className="btn-icon w-8 h-8">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {completedTransformations.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="card p-3"
                  >
                    <div className="flex gap-3 items-center">
                      <img src={t.afterImageUrl} alt="" className="w-14 h-10 object-cover rounded flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <code className="text-xs text-[var(--color-text-muted)] block truncate">{t.id.slice(0, 14)}...</code>
                        {t.userEmail && <p className="text-xs text-[var(--color-text-secondary)] truncate">{t.userEmail}</p>}
                        <p className="text-xs text-[var(--color-text-muted)]">{formatDate(t.createdAt)}</p>
                      </div>
                      <Link href={`/results/${t.id}`} className="btn-icon">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </main>

      <footer className="py-6 text-center text-[var(--color-text-muted)] text-xs border-t border-[rgba(255,255,255,0.04)]">
        <p>© 2024 Loftie</p>
      </footer>
    </div>
  );
}
