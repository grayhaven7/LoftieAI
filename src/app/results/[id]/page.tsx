'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, Mail, ChevronDown, Check, Share2, Play, Pause, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

interface TransformationData {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  declutteringPlan: string;
  audioUrl?: string;
  userEmail?: string;
  createdAt: string;
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<TransformationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAfter, setShowAfter] = useState(true);
  const [email, setEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(true);
  const [afterImageError, setAfterImageError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/transformations/${id}`);
        if (!response.ok) throw new Error('Transformation not found');
        const result = await response.json();
        setData(result);
        if (result.userEmail) setEmail(result.userEmail);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const toggleAudio = () => {
    if (!audioRef.current || !data?.audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = async () => {
    if (!data?.afterImageUrl) return;
    const link = document.createElement('a');
    link.href = data.afterImageUrl;
    link.download = `loftie-${id}.png`;
    link.click();
  };

  const handleEmailSend = async () => {
    if (!email || !data) return;
    setEmailSending(true);
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, transformationId: id }),
      });
      setEmailSent(true);
    } catch (err) {
      console.error('Failed to send email:', err);
    } finally {
      setEmailSending(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Room Transformation', url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const parseSteps = (plan: string | undefined): string[] => {
    if (!plan) return [];
    return plan.split(/\d+\.\s+/).filter((step) => step.trim()).slice(0, 6);
  };

  if (loading) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center px-4">
        <div className="card text-center max-w-sm">
          <h2 className="text-lg text-[var(--color-text-primary)] mb-2 font-medium">Not Found</h2>
          <p className="text-[var(--color-text-muted)] text-sm mb-4">{error || 'This transformation may have expired.'}</p>
          <Link href="/" className="btn-primary inline-flex">Go Home</Link>
        </div>
      </div>
    );
  }

  const steps = parseSteps(data.declutteringPlan);

  return (
    <div className="gradient-bg min-h-screen">
      {data.audioUrl && <audio ref={audioRef} src={data.audioUrl} onEnded={() => setIsPlaying(false)} />}

      {/* Header */}
      <header className="py-4 px-4 sm:px-6 border-b border-[rgba(255,255,255,0.04)]">
        <nav className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          
          <span className="logo-text">Loftie</span>
          
          <div className="w-16 flex justify-end">
            {data.audioUrl && (
              <button onClick={toggleAudio} className={`voice-btn ${isPlaying ? 'playing' : ''}`}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
        {/* Success */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <span className="badge badge-success mb-3 inline-flex">
            <Check className="w-3 h-3" /> Complete
          </span>
          <h1 className="text-2xl sm:text-3xl text-[var(--color-text-primary)] tracking-tight mb-1">
            Your <span className="text-emphasis">transformation</span>
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">See what your space could look like</p>
        </motion.div>

        {/* Image */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="card overflow-hidden p-0">
            <div className="flex border-b border-[rgba(255,255,255,0.06)]">
              <button
                onClick={() => setShowAfter(false)}
                className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  !showAfter ? 'text-[var(--color-text-primary)] bg-[rgba(255,255,255,0.04)]' : 'text-[var(--color-text-muted)]'
                }`}
              >
                Before
              </button>
              <button
                onClick={() => setShowAfter(true)}
                className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  showAfter ? 'text-[var(--color-text-primary)] bg-[rgba(255,255,255,0.04)]' : 'text-[var(--color-text-muted)]'
                }`}
              >
                After
              </button>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden">
              <AnimatePresence mode="wait">
                {showAfter && (!data.afterImageUrl || afterImageError) ? (
                  <motion.div
                    key="error"
                    className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-secondary)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="text-center px-4">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
                        <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-[var(--color-text-secondary)] text-sm mb-1">Image unavailable</p>
                      <p className="text-[var(--color-text-muted)] text-xs">The transformed image could not be loaded</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.img
                    key={showAfter ? 'after' : 'before'}
                    src={showAfter ? data.afterImageUrl : data.beforeImageUrl}
                    alt={showAfter ? 'Transformed' : 'Original'}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onError={() => {
                      if (showAfter) setAfterImageError(true);
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleDownload} 
              className="btn-secondary"
              disabled={!data?.afterImageUrl}
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button onClick={handleShare} className="btn-secondary">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </motion.div>

        {/* Plan */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
          <div className="card">
            <button onClick={() => setPlanExpanded(!planExpanded)} className="w-full flex items-center justify-between mb-3">
              <h2 className="text-sm text-[var(--color-text-primary)] font-medium">Declutter Plan</h2>
              <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${planExpanded ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {planExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <div className="space-y-2">
                    {steps.map((step, i) => (
                      <div key={i} className="step-card">
                        <div className="flex gap-3">
                          <span className="text-[var(--color-accent)] font-semibold text-xs">{String(i + 1).padStart(2, '0')}</span>
                          <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed flex-1">{step.trim()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {data.audioUrl && (
                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                      <button onClick={toggleAudio} className="btn-secondary w-full">
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {isPlaying ? 'Pause Audio' : 'Play Audio Guide'}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Email */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="text-sm text-[var(--color-text-primary)] font-medium">Save to Email</h3>
          </div>
          
          {emailSent ? (
            <div className="flex items-center gap-2 text-[var(--color-success)] text-sm">
              <Check className="w-3.5 h-3.5" /> Sent to {email}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1"
                disabled={emailSending}
              />
              <button onClick={handleEmailSend} disabled={!email || emailSending} className="btn-primary">
                {emailSending ? '...' : 'Send'}
              </button>
            </div>
          )}
        </motion.div>
      </main>

      <footer className="py-6 text-center text-[var(--color-text-muted)] text-xs border-t border-[rgba(255,255,255,0.04)]">
        <p>© 2024 Loftie</p>
      </footer>
    </div>
  );
}
