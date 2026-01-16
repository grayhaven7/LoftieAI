'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, Mail, ChevronDown, Check, Share2, Play, Pause, Volume2, X, Settings, RefreshCw } from 'lucide-react';
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
  status: 'processing' | 'completed' | 'failed';
  creativityLevel?: 'strict' | 'balanced' | 'creative';
  keepItems?: string;
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<TransformationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showAfter, setShowAfter] = useState(true);
  const [email, setEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(true);
  const [afterImageError, setAfterImageError] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'toggle' | 'slider'>('slider');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isRetrying, setIsRetrying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processingRequestFired = useRef(false);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    async function fetchData() {
      try {
        const maxAttempts = 5;
        let lastResponse: Response | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          setRetryCount(attempt);
          
          try {
            const response = await fetch(`/api/transformations/${id}`, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' },
            });

            lastResponse = response;

            if (response.ok) {
              const result = await response.json();
              setData(result);
              if (result.userEmail) setEmail(result.userEmail);
              
              if (result.status === 'processing') {
                if (!processingRequestFired.current) {
                  processingRequestFired.current = true;
                  fetch(`/api/process/${id}`, { method: 'POST' }).catch(console.error);
                }
                
                let consecutivePollFailures = 0;
                interval = setInterval(async () => {
                  try {
                    const pollResponse = await fetch(`/api/transformations/${id}`, {
                      cache: 'no-store',
                      headers: { 'Cache-Control': 'no-cache' },
                    });
                    
                    if (!pollResponse.ok) {
                      consecutivePollFailures++;
                      if (consecutivePollFailures >= 3) {
                        if (interval) clearInterval(interval);
                        setError(`Trouble fetching updates (HTTP ${pollResponse.status})`);
                      }
                      return;
                    }

                    consecutivePollFailures = 0;
                    const pollResult = await pollResponse.json();
                    setData(pollResult);
                    if (pollResult.status !== 'processing') {
                      if (interval) clearInterval(interval);
                    }
                  } catch (e) {
                    consecutivePollFailures++;
                    if (consecutivePollFailures >= 3) {
                      if (interval) clearInterval(interval);
                      setError('Trouble fetching updates. Please refresh.');
                    }
                  }
                }, 3000);
              }
              return; // Success!
            }

            if (response.status !== 404 || attempt === maxAttempts) {
              const body = await response.json().catch(() => ({}));
              throw new Error(body.error || `Failed to load (HTTP ${response.status})`);
            }
          } catch (err) {
            if (attempt === maxAttempts) throw err;
          }

          await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
        }

        if (!lastResponse?.ok) throw new Error('Transformation not found');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => { if (interval) clearInterval(interval); };
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

  const handleRetry = async () => {
    if (!data || isRetrying) return;
    setIsRetrying(true);
    setAfterImageError(false);

    try {
      // Reset the transformation status and trigger reprocessing
      const response = await fetch(`/api/retry/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to retry transformation');
      }

      // Start polling for updates
      setData(prev => prev ? { ...prev, status: 'processing' } : null);
      processingRequestFired.current = false;
      window.location.reload();
    } catch (err) {
      console.error('Retry failed:', err);
      setError('Failed to retry. Please try uploading a new image.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const getEmojiForContext = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    // Match keywords to emojis
    if (lowerText.includes('sunshine') || lowerText.includes('blanket') || lowerText.includes('bright')) return '☀️';
    if (lowerText.includes('window') || lowerText.includes('shine') || lowerText.includes('sparkle')) return '✨';
    if (lowerText.includes('bedside') || lowerText.includes('nightstand') || lowerText.includes('table')) return '🛏️';
    if (lowerText.includes('love') || lowerText.includes('care')) return '💕';
    if (lowerText.includes('wrangle') || lowerText.includes('rogue') || lowerText.includes('gather') || lowerText.includes('collect')) return '📦';
    if (lowerText.includes('clothes') || lowerText.includes('fold') || lowerText.includes('hang') || lowerText.includes('wardrobe')) return '👕';
    if (lowerText.includes('home') || lowerText.includes('belong') || lowerText.includes('place')) return '🏠';
    if (lowerText.includes('book') || lowerText.includes('read')) return '📚';
    if (lowerText.includes('plant') || lowerText.includes('green')) return '🌿';
    if (lowerText.includes('clean') || lowerText.includes('tidy') || lowerText.includes('fresh') || lowerText.includes('floor')) return '🧹';
    if (lowerText.includes('relax') || lowerText.includes('calm') || lowerText.includes('peace')) return '🧘';
    if (lowerText.includes('storage') || lowerText.includes('bin') || lowerText.includes('container')) return '🗂️';
    if (lowerText.includes('desk') || lowerText.includes('work') || lowerText.includes('office')) return '💼';
    if (lowerText.includes('kitchen') || lowerText.includes('cook')) return '🍳';
    if (lowerText.includes('bathroom') || lowerText.includes('shower')) return '🚿';
    if (lowerText.includes('start') || lowerText.includes('begin') || lowerText.includes('first')) return '🎯';
    if (lowerText.includes('final') || lowerText.includes('last') || lowerText.includes('finish')) return '🎉';
    
    // Default emoji for general organizing
    return '✅';
  };

  const formatStepWithEmoji = (step: string): string => {
    // Replace **text** pattern with text + emoji (without bold markers)
    return step.replace(/\*\*([^*]+)\*\*/g, (_, content) => {
      const emoji = getEmojiForContext(content);
      return `${content} ${emoji}`;
    });
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
          <p className="text-[var(--color-text-muted)] text-sm">Searching for transformation...</p>
          {retryCount > 1 && (
            <p className="text-[var(--color-text-muted)] text-[10px] mt-2 uppercase tracking-widest">
              Attempt {retryCount} of 5
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center px-4">
        <div className="card text-center max-w-sm">
          <div className="w-12 h-12 bg-[rgba(239,68,68,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6 text-[rgb(239,68,68)]" />
          </div>
          <h2 className="text-lg text-[var(--color-text-primary)] mb-2 font-medium">Transformation Not Found</h2>
          <p className="text-[var(--color-text-muted)] text-sm mb-4">
            {error ? (
              <span className="text-[rgb(239,68,68)] font-medium">{error}</span>
            ) : (
              'This transformation could not be found. It may have expired or the link may be incorrect.'
            )}
          </p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
            >
              Try Refreshing
            </button>
            <Link href="/" className="btn-secondary">Go Home</Link>
          </div>
          <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Technical Info</p>
            <div className="flex flex-col gap-1">
              <code className="text-[10px] bg-[rgba(0,0,0,0.2)] px-2 py-1 rounded text-[var(--color-text-secondary)] break-all">
                ID: {id}
              </code>
              <code className="text-[10px] bg-[rgba(0,0,0,0.2)] px-2 py-1 rounded text-[var(--color-text-secondary)]">
                Retries: {retryCount} / 5
              </code>
              <a href="/api/debug/storage" target="_blank" className="text-[10px] text-[var(--color-accent)] hover:underline mt-1">
                View Storage Dashboard
              </a>
            </div>
          </div>
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
        {/* Status */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          {data.status === 'processing' ? (
            <>
              <span className="badge mb-3 inline-flex" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'rgb(251, 191, 36)' }}>
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Processing
              </span>
              <h1 className="text-2xl sm:text-3xl text-[var(--color-text-primary)] tracking-tight mb-1">
                Creating your <span className="text-emphasis">transformation</span>
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)]">This may take a minute...</p>
            </>
          ) : data.status === 'failed' ? (
            <>
              <span className="badge mb-3 inline-flex" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'rgb(239, 68, 68)' }}>
                Failed
              </span>
              <h1 className="text-2xl sm:text-3xl text-[var(--color-text-primary)] tracking-tight mb-1">
                Transformation <span className="text-emphasis">failed</span>
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Please try uploading your image again</p>
            </>
          ) : (
            <>
              <span className="badge badge-success mb-3 inline-flex">
                <Check className="w-3 h-3" /> Complete
              </span>
              <h1 className="text-2xl sm:text-3xl text-[var(--color-text-primary)] tracking-tight mb-1">
                Your <span className="text-emphasis">transformation</span>
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)]">See what your space could look like</p>
            </>
          )}
        </motion.div>

        {/* Image */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="card overflow-hidden p-0">
            {/* Mode toggle and before/after tabs */}
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-2">
              {comparisonMode === 'toggle' ? (
                <div className="flex flex-1">
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
              ) : (
                <span className="py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Drag to compare
                </span>
              )}
              <button
                onClick={() => setComparisonMode(comparisonMode === 'toggle' ? 'slider' : 'toggle')}
                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                title={comparisonMode === 'toggle' ? 'Switch to slider view' : 'Switch to toggle view'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {comparisonMode === 'toggle' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden">
              {data.status === 'processing' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-secondary)]">
                  <div className="text-center px-4">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[rgba(251,191,36,0.1)] flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[rgb(251,191,36)] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-[var(--color-text-secondary)] text-sm mb-1">Generating...</p>
                    <p className="text-[var(--color-text-muted)] text-xs">Your transformation is being created</p>
                  </div>
                </div>
              ) : data.status === 'failed' || !data.afterImageUrl || afterImageError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-secondary)]">
                  <div className="text-center px-4">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
                      <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-[var(--color-text-secondary)] text-sm mb-1">Image unavailable</p>
                    <p className="text-[var(--color-text-muted)] text-xs">The transformed image could not be loaded</p>
                  </div>
                </div>
              ) : comparisonMode === 'toggle' ? (
                <AnimatePresence mode="wait">
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
                </AnimatePresence>
              ) : (
                /* Slider comparison view */
                <div
                  ref={sliderContainerRef}
                  className="relative w-full h-full cursor-ew-resize select-none"
                  onMouseMove={(e) => e.buttons === 1 && handleSliderMove(e)}
                  onMouseDown={handleSliderMove}
                  onTouchMove={handleSliderMove}
                  onTouchStart={handleSliderMove}
                >
                  {/* After image (full width, background) */}
                  <img
                    src={data.afterImageUrl}
                    alt="After"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => setAfterImageError(true)}
                  />
                  {/* Before image (clipped) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img
                      src={data.beforeImageUrl}
                      alt="Before"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }}
                    />
                  </div>
                  {/* Slider line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                    style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </div>
                  </div>
                  {/* Labels */}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                    Before
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                    After
                  </div>
                </div>
              )}
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
            {data.status === 'completed' && (
              <button
                onClick={handleRetry}
                className="btn-secondary"
                disabled={isRetrying}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : 'Retry'}
              </button>
            )}
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
                          <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed flex-1">{formatStepWithEmoji(step.trim())}</p>
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
        <div className="flex items-center justify-center gap-4">
          <p>© 2024 Loftie</p>
          <Link 
            href="/settings" 
            className="opacity-50 hover:opacity-100 transition-opacity"
            title="AI Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
