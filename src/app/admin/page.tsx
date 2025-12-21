'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, ExternalLink, Clock, Mail, CheckCircle, XCircle, Loader } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { RoomTransformation } from '@/lib/types';

export default function AdminPage() {
  const [transformations, setTransformations] = useState<RoomTransformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransformations = async () => {
      try {
        const response = await fetch('/api/transformations');
        if (response.ok) {
          const data = await response.json();
          setTransformations(data);
        }
      } catch (err) {
        console.error('Error fetching transformations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransformations();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const stats = {
    total: transformations.length,
    completed: transformations.filter(t => t.status === 'completed').length,
    processing: transformations.filter(t => t.status === 'processing').length,
    withEmail: transformations.filter(t => t.userEmail).length,
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={selectedImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-2xl"
          />
        </div>
      )}

      {/* Header */}
      <header className="py-6 px-8">
        <nav className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-sage)] to-[var(--color-sage-dark)] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-display font-semibold text-[var(--color-charcoal)]">
              Loftie
            </span>
            <span className="text-sm text-[var(--color-soft-gray)] ml-2">Admin</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--color-soft-gray)] hover:text-[var(--color-charcoal)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-display text-[var(--color-charcoal)] mb-2">
            Transformations Dashboard
          </h1>
          <p className="text-[var(--color-soft-gray)]">
            View and manage all room transformations
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Total', value: stats.total, color: 'var(--color-sage)' },
            { label: 'Completed', value: stats.completed, color: '#22c55e' },
            { label: 'Processing', value: stats.processing, color: '#eab308' },
            { label: 'With Email', value: stats.withEmail, color: 'var(--color-terracotta)' },
          ].map((stat, i) => (
            <div key={i} className="card text-center">
              <div
                className="text-3xl font-display font-semibold mb-1"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
              <div className="text-sm text-[var(--color-soft-gray)]">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Transformations Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card overflow-x-auto"
        >
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--color-sage-light)] flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6 text-[var(--color-sage-dark)]" />
              </div>
              <p className="text-[var(--color-soft-gray)]">Loading transformations...</p>
            </div>
          ) : transformations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-soft-gray)]">No transformations yet</p>
              <Link href="/" className="btn-primary inline-block mt-4">
                Create First Transformation
              </Link>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transformations.map((transformation, index) => (
                  <motion.tr
                    key={transformation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <td>
                      <div className="flex gap-2">
                        <img
                          src={transformation.beforeImageUrl}
                          alt="Before"
                          className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage(transformation.beforeImageUrl)}
                        />
                        {transformation.afterImageUrl && (
                          <img
                            src={transformation.afterImageUrl}
                            alt="After"
                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedImage(transformation.afterImageUrl)}
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transformation.status)}
                        <span className="capitalize text-[var(--color-charcoal)]">
                          {transformation.status}
                        </span>
                      </div>
                    </td>
                    <td>
                      {transformation.userEmail ? (
                        <div className="flex items-center gap-2 text-[var(--color-charcoal)]">
                          <Mail className="w-4 h-4 text-[var(--color-sage)]" />
                          {transformation.userEmail}
                        </div>
                      ) : (
                        <span className="text-[var(--color-soft-gray)]">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-[var(--color-soft-gray)]">
                        <Clock className="w-4 h-4" />
                        {format(new Date(transformation.createdAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/results/${transformation.id}`}
                        className="flex items-center gap-1 text-[var(--color-sage-dark)] hover:text-[var(--color-sage)] font-medium"
                      >
                        View
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-[var(--color-soft-gray)] text-sm">
        <p>© 2024 Loftie AI • Admin Dashboard</p>
      </footer>
    </div>
  );
}

