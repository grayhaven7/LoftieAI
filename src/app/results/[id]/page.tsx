'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, Mail, ChevronDown, Check, Share2, Play, Pause, Volume2, X, Settings, RefreshCw, MessageSquare, ThumbsUp, ThumbsDown, Printer, HelpCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { use } from 'react';
import { useSearchParams } from 'next/navigation';

interface TransformationData {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  declutteringPlan: string;
  audioUrl?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
  creativityLevel?: 'strict' | 'balanced' | 'creative';
  keepItems?: string;
}

// Wrapper component that handles Suspense for useSearchParams
export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)] text-sm">Loading...</p>
        </div>
      </div>
    }>
      <ResultsPageContent params={params} />
    </Suspense>
  );
}

function ResultsPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const blobUrl = searchParams.get('blobUrl');
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
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackHelpful, setFeedbackHelpful] = useState<boolean | null>(null);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showFollowUp, setShowFollowUp] = useState(false);
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
            // Pass blobUrl for direct fetch if available (faster, avoids list() consistency issues)
            const apiUrl = blobUrl
              ? `/api/transformations/${id}?blobUrl=${encodeURIComponent(blobUrl)}`
              : `/api/transformations/${id}`;
            const response = await fetch(apiUrl, {
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
                  // Pass blobUrl to process endpoint for direct fetch
                  const processUrl = blobUrl
                    ? `/api/process/${id}?blobUrl=${encodeURIComponent(blobUrl)}`
                    : `/api/process/${id}`;
                  fetch(processUrl, { method: 'POST' }).catch(console.error);
                }

                let consecutivePollFailures = 0;
                const jitter = Math.random() * 500;
                interval = setInterval(async () => {
                  try {
                    // Use blobUrl for polling too
                    const pollUrl = blobUrl
                      ? `/api/transformations/${id}?blobUrl=${encodeURIComponent(blobUrl)}`
                      : `/api/transformations/${id}`;
                    const pollResponse = await fetch(pollUrl, {
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
                }, 3000 + jitter);
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
  }, [id, blobUrl]);

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
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, transformationId: id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      setEmailSent(true);
    } catch (err) {
      console.error('Failed to send email:', err);
      alert(`Failed to send email: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setEmailSending(false);
    }
  };

  // Generate combined before/after image for sharing
  const generateCombinedImage = async (): Promise<Blob | null> => {
    if (!data?.beforeImageUrl || !data?.afterImageUrl) return null;

    try {
      // Load both images
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      const [beforeImg, afterImg] = await Promise.all([
        loadImage(data.beforeImageUrl),
        loadImage(data.afterImageUrl)
      ]);

      // Create canvas with side-by-side layout
      const canvas = document.createElement('canvas');
      const padding = 20;
      const labelHeight = 40;
      const imgWidth = Math.max(beforeImg.width, afterImg.width);
      const imgHeight = Math.max(beforeImg.height, afterImg.height);

      canvas.width = imgWidth * 2 + padding * 3;
      canvas.height = imgHeight + padding * 2 + labelHeight * 2;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header
      ctx.fillStyle = '#9CAF88';
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('I decluttered my room with Loftie! 🏠✨', canvas.width / 2, padding + 20);

      // Labels
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('BEFORE', padding + imgWidth / 2, labelHeight + padding + 20);
      ctx.fillText('AFTER', padding * 2 + imgWidth + imgWidth / 2, labelHeight + padding + 20);

      // Draw images
      const imageY = labelHeight + padding + 30;
      ctx.drawImage(beforeImg, padding, imageY, imgWidth, imgHeight);
      ctx.drawImage(afterImg, padding * 2 + imgWidth, imageY, imgWidth, imgHeight);

      // Footer with URL
      ctx.fillStyle = '#666666';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('loftie.ai', canvas.width / 2, canvas.height - 10);

      return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png', 0.9);
      });
    } catch (error) {
      console.error('Failed to generate combined image:', error);
      return null;
    }
  };

  const handleShare = async () => {
    const shareText = 'I decluttered my room with Loftie! 🏠✨';
    const shareUrl = 'https://loftie.ai';

    // Try to share with image if supported
    if (navigator.share && navigator.canShare) {
      try {
        const combinedBlob = await generateCombinedImage();
        if (combinedBlob) {
          const file = new File([combinedBlob], 'loftie-transformation.png', { type: 'image/png' });
          const shareData = {
            title: 'My Room Transformation',
            text: shareText,
            url: shareUrl,
            files: [file]
          };

          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        }
        // Fallback to text-only share
        await navigator.share({ title: 'My Room Transformation', text: shareText, url: shareUrl });
      } catch (err) {
        // User cancelled or error - try fallback
        if ((err as Error).name !== 'AbortError') {
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
          window.open(twitterUrl, '_blank', 'width=550,height=420');
        }
      }
    } else {
      // Fallback: open Twitter/X share
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(twitterUrl, '_blank', 'width=550,height=420');
    }
  };

  // Download combined image
  const handleDownloadCombined = async () => {
    const combinedBlob = await generateCombinedImage();
    if (combinedBlob) {
      const url = URL.createObjectURL(combinedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `loftie-transformation-${id}.png`;
      link.click();
      URL.revokeObjectURL(url);
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

  const handleFeedbackSubmit = async () => {
    if (feedbackSending || (!feedbackComment.trim() && feedbackHelpful === null)) return;

    setFeedbackSending(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transformationId: id,
          helpful: feedbackHelpful,
          comment: feedbackComment.trim(),
        }),
      });

      if (response.ok) {
        setFeedbackSubmitted(true);
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setFeedbackSending(false);
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

  // Parse greeting (text before first numbered step)
  const parseGreeting = (plan: string | undefined): string => {
    if (!plan) return '';
    // Find the first numbered step (1. )
    const firstStepMatch = plan.match(/^([\s\S]*?)(?=\n\s*1\.\s)/);
    if (firstStepMatch && firstStepMatch[1]) {
      return firstStepMatch[1].trim();
    }
    return '';
  };

  // Parse closing (text after last numbered step, typically includes "Quick Organization Tip" and encouragement)
  const parseClosing = (plan: string | undefined): string => {
    if (!plan) return '';
    // Find text after the last numbered step (look for patterns like "Quick Organization Tip" or encouraging closing)
    const closingMatch = plan.match(/(?:\n\s*(?:Quick Organization Tip|You did it|You've done|I'm so proud|Amazing work|Great job|You should feel)[^\n]*[\s\S]*)$/i);
    if (closingMatch) {
      // Get everything from "Quick Organization Tip" onward if present
      const tipMatch = plan.match(/\n\s*(Quick Organization Tip[\s\S]*)$/i);
      if (tipMatch) {
        return tipMatch[1].trim();
      }
      return closingMatch[0].trim();
    }
    return '';
  };

  const parseSteps = (plan: string | undefined): string[] => {
    if (!plan) return [];
    // Extract only numbered steps (1. through 8.)
    const stepMatches = plan.match(/(?:^|\n)\s*(\d+)\.\s+([^\n]+(?:\n(?!\s*\d+\.\s)[^\n]+)*)/g);
    if (stepMatches && stepMatches.length > 0) {
      return stepMatches
        .map(match => match.replace(/^\n?\s*\d+\.\s+/, '').trim())
        .filter(step => step.length > 10)
        .slice(0, 8); // Allow up to 8 steps
    }

    // Fallback: Try splitting on numbered steps (e.g., "1. ", "2. ")
    let steps = plan.split(/\d+\.\s+/).filter((step) => step.trim());
    // Remove the first element if it's the greeting (text before step 1)
    if (steps.length > 0 && !steps[0].match(/^\s*(Let's|Start|First|Grab|Pick|Take|Now|Clear|Sort)/i)) {
      steps = steps.slice(1);
    }
    // If only 0-1 steps found, try splitting on newlines (fallback for unnumbered plans)
    if (steps.length <= 1) {
      steps = plan.split(/\n+/).filter((step) => step.trim().length > 20);
    }
    // If still one big block, try splitting on sentence patterns that look like step boundaries
    if (steps.length <= 1 && plan.length > 200) {
      steps = plan.split(/(?<=[.!])\s+(?=[A-Z](?:ext|tep|ow|hen|inally|rab|ort|lear|ake|ove))/)
        .filter((step) => step.trim().length > 20);
    }
    // Filter out closing paragraphs (Quick Organization Tip, encouraging messages)
    steps = steps.filter(step => !step.match(/^(Quick Organization Tip|You did it|You've done|I'm so proud|Amazing work)/i));
    return steps.slice(0, 8); // Allow up to 8 steps
  };

  const toggleStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepIndex)) {
        newSet.delete(stepIndex);
      } else {
        newSet.add(stepIndex);
      }
      return newSet;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // useMemo must be called unconditionally (before any early returns)
  const greeting = useMemo(() => parseGreeting(data?.declutteringPlan), [data?.declutteringPlan]);
  const closing = useMemo(() => parseClosing(data?.declutteringPlan), [data?.declutteringPlan]);
  const steps = useMemo(() => parseSteps(data?.declutteringPlan), [data?.declutteringPlan]);

  const allStepsCompleted = steps.length > 0 && completedSteps.size === steps.length;

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
                    style={{ willChange: 'transform' }}
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

          {/* AI Visualization Disclaimer */}
          {data.status === 'completed' && data.afterImageUrl && (
            <div className="mt-3 flex items-start gap-2 text-[10px] text-[var(--color-text-muted)] bg-[rgba(255,255,255,0.03)] px-3 py-2 rounded-lg">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>This is an AI visualization to inspire you — your actual results may look different based on your decluttering choices.</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={handleDownload}
              className="btn-secondary"
              disabled={!data?.afterImageUrl}
            >
              <Download className="w-3.5 h-3.5" /> After Image
            </button>
            <button
              onClick={handleDownloadCombined}
              className="btn-secondary"
              disabled={!data?.afterImageUrl || !data?.beforeImageUrl}
            >
              <Download className="w-3.5 h-3.5" /> Before/After
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6 print-section">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setPlanExpanded(!planExpanded)} className="flex items-center gap-2">
                <h2 className="text-sm text-[var(--color-text-primary)] font-medium">Declutter Plan</h2>
                <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform print:hidden ${planExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Print button */}
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handlePrint}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                  title="Print instructions"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress indicator */}
            {steps.length > 0 && (
              <div className="mb-4 print:hidden">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[var(--color-text-muted)]">Progress</span>
                  <span className="text-[var(--color-accent)]">{completedSteps.size} of {steps.length} complete</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(completedSteps.size / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <AnimatePresence>
              {planExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  {/* Greeting - displayed before steps */}
                  {greeting && (
                    <div className="mb-4 p-3 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-lg">
                      <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                        {data?.firstName && greeting.includes('Hi!') ? greeting.replace('Hi!', `Hi ${data.firstName}!`) : greeting}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {steps.map((step, i) => (
                      <div
                        key={i}
                        className={`step-card transition-all ${
                          completedSteps.has(i)
                            ? 'opacity-60 border-l-[var(--color-success)]'
                            : ''
                        }`}
                        onClick={() => toggleStepComplete(i)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="flex gap-3 items-start">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStepComplete(i);
                            }}
                            className={`flex-shrink-0 w-5 h-5 rounded border transition-colors print:border-gray-400 ${
                              completedSteps.has(i)
                                ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white'
                                : 'border-[var(--color-text-muted)] hover:border-[var(--color-accent)]'
                            }`}
                          >
                            {completedSteps.has(i) && <Check className="w-3 h-3 m-auto" />}
                          </button>
                          <p className={`text-xs leading-relaxed flex-1 ${
                            completedSteps.has(i)
                              ? 'line-through text-[var(--color-text-muted)]'
                              : 'text-[var(--color-text-secondary)]'
                          } print:text-gray-700`}>
                            {formatStepWithEmoji(step.trim())}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Closing - displayed after steps */}
                  {closing && (
                    <div className="mt-4 p-3 bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-lg">
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
                        {closing}
                      </p>
                    </div>
                  )}

                  {/* Completion celebration */}
                  {allStepsCompleted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 p-4 bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-lg text-center print:hidden"
                    >
                      <p className="text-[var(--color-success)] text-sm font-medium mb-1">Amazing work!</p>
                      <p className="text-[var(--color-text-muted)] text-xs">You've completed all the steps. Your space is looking great!</p>
                    </motion.div>
                  )}

                  {data.audioUrl && (
                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] print:hidden">
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

        {/* Donation Links */}
        {data.status === 'completed' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="mb-6 print:hidden">
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <h3 className="text-sm text-[var(--color-text-primary)] font-medium">Donate Your Items</h3>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                Give your decluttered items a second life! Find a drop-off location near you:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href="https://www.goodwill.org/locator/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-lg hover:border-[var(--color-accent)] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">Goodwill Locator</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Find a drop-off near you</p>
                  </div>
                </a>
                <a
                  href="https://satruck.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-lg hover:border-[var(--color-accent)] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/20 transition-colors">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">Salvation Army</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Schedule a free pickup</p>
                  </div>
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* What's Next Section */}
        {data.status === 'completed' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-6 print:hidden">
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="text-sm text-[var(--color-text-primary)] font-medium">What's Next?</h3>
              </div>

              {!showFollowUp ? (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Ready to continue your decluttering journey? Here are some ways to keep going:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowFollowUp(true)}
                      className="flex items-center gap-2 p-3 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-lg text-left hover:border-[var(--color-accent)] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-accent)]/20 transition-colors">
                        <Check className="w-4 h-4 text-[var(--color-accent)]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text-primary)]">I did these steps!</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">Get guidance on what's next</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowFollowUp(true)}
                      className="flex items-center gap-2 p-3 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-lg text-left hover:border-[var(--color-accent)] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-accent)]/20 transition-colors">
                        <HelpCircle className="w-4 h-4 text-[var(--color-accent)]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text-primary)]">I have questions</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">Get help if you're stuck</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-lg p-4">
                    <h4 className="text-xs font-medium text-[var(--color-text-primary)] mb-3">Next Steps to Continue</h4>
                    <div className="space-y-3 text-xs text-[var(--color-text-secondary)]">
                      <div className="flex gap-2">
                        <span className="text-[var(--color-success)] font-medium">1.</span>
                        <p><strong>Process your piles:</strong> Take your donate items to Goodwill or schedule a pickup. List sellable items on Facebook Marketplace or Poshmark.</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[var(--color-success)] font-medium">2.</span>
                        <p><strong>Tackle the next area:</strong> Ready for another room? Upload a new photo and keep the momentum going!</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[var(--color-success)] font-medium">3.</span>
                        <p><strong>Prevent future clutter:</strong> Set a weekly 10-minute tidy session. When you buy something new, try to donate something old.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-lg p-4">
                    <h4 className="text-xs font-medium text-[var(--color-text-primary)] mb-3">Quick Tips for Common Challenges</h4>
                    <div className="space-y-2 text-xs text-[var(--color-text-secondary)]">
                      <details className="group">
                        <summary className="cursor-pointer hover:text-[var(--color-text-primary)] transition-colors list-none flex items-center gap-2">
                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                          <span>"I can't decide what to keep"</span>
                        </summary>
                        <p className="pl-5 mt-2 text-[var(--color-text-muted)]">
                          Ask yourself: Have I used this in the last year? Does it bring me joy? Would I buy it again today? If no to all three, it's time to let it go.
                        </p>
                      </details>
                      <details className="group">
                        <summary className="cursor-pointer hover:text-[var(--color-text-primary)] transition-colors list-none flex items-center gap-2">
                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                          <span>"I'm feeling overwhelmed"</span>
                        </summary>
                        <p className="pl-5 mt-2 text-[var(--color-text-muted)]">
                          Take a break! Decluttering is a marathon, not a sprint. Focus on just one small area at a time. Even 15 minutes makes a difference.
                        </p>
                      </details>
                      <details className="group">
                        <summary className="cursor-pointer hover:text-[var(--color-text-primary)] transition-colors list-none flex items-center gap-2">
                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                          <span>"I made piles, now what?"</span>
                        </summary>
                        <p className="pl-5 mt-2 text-[var(--color-text-muted)]">
                          Get those piles out of your home ASAP! Schedule a donation pickup, list items for sale tonight, and take trash out immediately.
                        </p>
                      </details>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowFollowUp(false)}
                      className="btn-secondary flex-1"
                    >
                      Close
                    </button>
                    <a href="/" className="btn-primary flex-1 text-center">
                      Transform Another Room
                    </a>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Email CTA - More prominent call to action */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card print:hidden bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-[var(--color-accent)]" />
            </div>
            <h3 className="text-base text-[var(--color-text-primary)] font-medium mb-2">
              Want this checklist and AI photo emailed to you?
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Get your personalized decluttering plan and transformed room image delivered to your inbox
            </p>

            {emailSent ? (
              <div className="flex items-center justify-center gap-2 text-[var(--color-success)] text-sm py-2">
                <Check className="w-4 h-4" /> Sent to {email}!
              </div>
            ) : (
              <div className="flex gap-2 max-w-sm mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1"
                  disabled={emailSending}
                />
                <button onClick={handleEmailSend} disabled={!email || emailSending} className="btn-primary">
                  {emailSending ? 'Sending...' : 'Yes, Email Me!'}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Feedback */}
        {data.status === 'completed' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card print:hidden">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
              <h3 className="text-sm text-[var(--color-text-primary)] font-medium">Did this help you declutter?</h3>
            </div>

            {feedbackSubmitted ? (
              <div className="flex items-center gap-2 text-[var(--color-success)] text-sm">
                <Check className="w-3.5 h-3.5" /> Thank you for your feedback!
              </div>
            ) : (
              <div className="space-y-3">
                {/* Helpful buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFeedbackHelpful(true)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      feedbackHelpful === true
                        ? 'bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30'
                        : 'bg-[rgba(255,255,255,0.05)] text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.1)]'
                    }`}
                    disabled={feedbackSending}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Yes, helpful
                  </button>
                  <button
                    onClick={() => setFeedbackHelpful(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      feedbackHelpful === false
                        ? 'bg-[var(--color-error)]/20 text-[var(--color-error)] border border-[var(--color-error)]/30'
                        : 'bg-[rgba(255,255,255,0.05)] text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.1)]'
                    }`}
                    disabled={feedbackSending}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Not really
                  </button>
                </div>

                {/* Comment field */}
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Tell us more about your experience (optional)"
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[var(--glass-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-none focus:outline-none focus:border-[var(--color-accent)]"
                  rows={3}
                  disabled={feedbackSending}
                />

                <button
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackSending || (!feedbackComment.trim() && feedbackHelpful === null)}
                  className="btn-secondary w-full"
                >
                  {feedbackSending ? 'Sending...' : 'Submit Feedback'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </main>

      <footer className="py-6 text-center text-[var(--color-text-muted)] text-xs border-t border-[rgba(255,255,255,0.04)] print:hidden">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-4">
            <p>© 2026 Loftie</p>
            <span className="text-[var(--color-text-muted)]">•</span>
            <a
              href="https://innovaedesigns.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--color-accent)] transition-colors"
            >
              Created by Sejal Parekh
            </a>
            <Link
              href="/settings"
              className="opacity-50 hover:opacity-100 transition-opacity"
              title="AI Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
