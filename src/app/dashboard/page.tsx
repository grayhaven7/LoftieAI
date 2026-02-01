'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

interface TransformationRecord {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
  declutteringPlan?: string;
}

export default function DashboardPage() {
  const [transformations, setTransformations] = useState<TransformationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyTransformations = async () => {
    try {
      let browserId = localStorage.getItem('loftie-browser-id');
      if (!browserId) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/transformations/mine?browserId=${browserId}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        setTransformations([]);
        return;
      }

      const data = await response.json();
      setTransformations(data.transformations || []);
    } catch {
      setTransformations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyTransformations();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMyTransformations();
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">My Transformations</h1>
              <p className="text-sm text-[var(--color-text-muted)]">{transformations.length} room{transformations.length !== 1 ? 's' : ''} transformed</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-[var(--color-text-muted)] text-sm">Loading your transformations...</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && transformations.length === 0 && (
          <div className="text-center py-20">
            <ImageIcon className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">No transformations yet</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">Upload a photo of your room to get started!</p>
            <Link href="/" className="btn-primary">
              Transform a Room
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && transformations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {transformations.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/results/${t.id}`} className="block group">
                  <div className="bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-lg overflow-hidden hover:border-[var(--color-accent)]/30 transition-all">
                    <div className="grid grid-cols-2 gap-0.5 bg-[var(--color-bg-secondary)]">
                      {t.beforeImageUrl && (
                        <div className="aspect-[4/3] relative">
                          <img src={t.beforeImageUrl} alt="Before" className="w-full h-full object-cover" />
                          <span className="absolute top-2 left-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Before</span>
                        </div>
                      )}
                      {t.afterImageUrl && (
                        <div className="aspect-[4/3] relative">
                          <img src={t.afterImageUrl} alt="After" className="w-full h-full object-cover" />
                          <span className="absolute top-2 left-2 text-[10px] bg-[var(--color-accent)]/80 text-white px-1.5 py-0.5 rounded">After</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          t.status === 'completed' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' :
                          t.status === 'processing' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
