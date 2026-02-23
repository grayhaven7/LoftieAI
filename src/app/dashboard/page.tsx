'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Image as ImageIcon, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface TransformationRecord {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
  firstName?: string;
  lastName?: string;
  userEmail?: string;
  feedbackHelpful?: boolean | null;
  feedbackComment?: string;
  feedbackSubmittedAt?: string;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getUserName = (t: TransformationRecord) => {
    const parts = [t.firstName, t.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="max-w-5xl mx-auto px-4 py-8">
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

        {/* Table */}
        {!loading && transformations.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="w-16">Photo</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Date</th>
                    <th>Feedback</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {transformations.map((t) => {
                    const name = getUserName(t);
                    return (
                      <tr key={t.id}>
                        <td>
                          <img
                            src={t.afterImageUrl || t.beforeImageUrl}
                            alt=""
                            className="w-12 h-8 object-cover rounded"
                          />
                        </td>
                        <td>
                          <span className="text-sm text-[var(--color-text-secondary)]">{name || '—'}</span>
                        </td>
                        <td>
                          <span className="text-sm text-[var(--color-text-secondary)]">{t.userEmail || '—'}</span>
                        </td>
                        <td className="text-sm text-[var(--color-text-muted)]">
                          {formatDate(t.createdAt)}
                        </td>
                        <td>
                          {t.feedbackSubmittedAt ? (
                            <div className="flex items-center gap-2 text-xs">
                              {t.feedbackHelpful === true && (
                                <span className="flex items-center gap-1 text-[var(--color-success)]">
                                  <ThumbsUp className="w-3 h-3" /> Y
                                </span>
                              )}
                              {t.feedbackHelpful === false && (
                                <span className="flex items-center gap-1 text-red-400">
                                  <ThumbsDown className="w-3 h-3" /> N
                                </span>
                              )}
                              {t.feedbackComment && (
                                <span className="text-[var(--color-text-muted)] truncate max-w-[120px]" title={t.feedbackComment}>
                                  &ldquo;{t.feedbackComment}&rdquo;
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)]">—</span>
                          )}
                        </td>
                        <td>
                          <Link href={`/results/${t.id}`} className="btn-icon w-8 h-8">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {transformations.map((t, i) => {
                const name = getUserName(t);
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="card p-3"
                  >
                    <div className="flex gap-3 items-start">
                      <img
                        src={t.afterImageUrl || t.beforeImageUrl}
                        alt=""
                        className="w-14 h-10 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        {name && (
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{name}</p>
                        )}
                        {t.userEmail && (
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">{t.userEmail}</p>
                        )}
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatDate(t.createdAt)}</p>
                        {t.feedbackSubmittedAt && (
                          <div className="flex items-center gap-2 text-xs mt-1">
                            {t.feedbackHelpful === true && (
                              <span className="flex items-center gap-1 text-[var(--color-success)]">
                                <ThumbsUp className="w-3 h-3" /> Helpful
                              </span>
                            )}
                            {t.feedbackHelpful === false && (
                              <span className="flex items-center gap-1 text-red-400">
                                <ThumbsDown className="w-3 h-3" /> Not helpful
                              </span>
                            )}
                            {t.feedbackComment && (
                              <span className="text-[var(--color-text-muted)] truncate max-w-[120px]" title={t.feedbackComment}>
                                &ldquo;{t.feedbackComment}&rdquo;
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <Link href={`/results/${t.id}`} className="btn-icon flex-shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
