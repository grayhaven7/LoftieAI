'use client';

import { useState, useEffect, useRef, use } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  Download, 
  Mail,
  Check,
  Share2
} from 'lucide-react';
import Link from 'next/link';
import { RoomTransformation } from '@/lib/types';

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [transformation, setTransformation] = useState<RoomTransformation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBefore, setShowBefore] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchTransformation = async () => {
      try {
        const response = await fetch(`/api/transformations/${id}`);
        if (!response.ok) {
          throw new Error('Transformation not found');
        }
        const data = await response.json();
        setTransformation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchTransformation();
  }, [id]);

  const handlePlayAudio = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!transformation?.declutteringPlan) return;

    setAudioLoading(true);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transformation.declutteringPlan }),
      });

      if (!response.ok) throw new Error('Failed to generate audio');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Audio error:', err);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email || !transformation) return;

    setEmailSending(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transformationId: transformation.id,
          email,
        }),
      });

      if (response.ok) {
        setEmailSent(true);
      }
    } catch (err) {
      console.error('Email error:', err);
    } finally {
      setEmailSending(false);
    }
  };

  const handleDownload = async (imageUrl: string, type: 'before' | 'after') => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loftie-${type}-${id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Loftie Transformation',
          text: 'Check out my room transformation!',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share error:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--color-sage-light)] flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-[var(--color-sage-dark)]" />
          </div>
          <p className="text-[var(--color-soft-gray)]">Loading your transformation...</p>
        </div>
      </div>
    );
  }

  if (error || !transformation) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center card max-w-md mx-4">
          <h2 className="text-2xl font-display text-[var(--color-charcoal)] mb-4">
            Oops! Something went wrong
          </h2>
          <p className="text-[var(--color-soft-gray)] mb-6">{error}</p>
          <Link href="/" className="btn-primary inline-block">
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  // Parse the decluttering plan into steps
  const steps = transformation.declutteringPlan
    .split(/\d+\.\s+/)
    .filter(step => step.trim().length > 0);

  return (
    <div className="min-h-screen gradient-bg">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Header */}
      <header className="py-6 px-8">
        <nav className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-sage)] to-[var(--color-sage-dark)] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-display font-semibold text-[var(--color-charcoal)]">
              Loftie
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--color-soft-gray)] hover:text-[var(--color-charcoal)]"
          >
            <ArrowLeft className="w-4 h-4" />
            New Transformation
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-[var(--color-sage-light)] text-[var(--color-sage-dark)] px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Check className="w-4 h-4" />
            Transformation Complete
          </div>
          <h1 className="text-4xl md:text-5xl font-display text-[var(--color-charcoal)] mb-4">
            Your Space, Reimagined
          </h1>
          <p className="text-xl text-[var(--color-soft-gray)]">
            Here&apos;s your personalized decluttering vision and plan
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Before/After Comparison */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-display text-[var(--color-charcoal)]">
                  {showBefore ? 'Before' : 'After'}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBefore(!showBefore)}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    Show {showBefore ? 'After' : 'Before'}
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl aspect-square">
                <motion.img
                  key={showBefore ? 'before' : 'after'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  src={showBefore ? transformation.beforeImageUrl : transformation.afterImageUrl}
                  alt={showBefore ? 'Before' : 'After'}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handleDownload(transformation.beforeImageUrl, 'before')}
                  className="flex-1 btn-secondary text-sm py-3 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Before
                </button>
                <button
                  onClick={() => handleDownload(transformation.afterImageUrl, 'after')}
                  className="flex-1 btn-primary text-sm py-3 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  After
                </button>
                <button
                  onClick={handleShare}
                  className="btn-secondary text-sm py-3 px-4"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Email Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card mt-6"
            >
              <h3 className="text-xl font-display text-[var(--color-charcoal)] mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-[var(--color-sage)]" />
                Save to Email
              </h3>
              {emailSent ? (
                <div className="flex items-center gap-2 text-[var(--color-sage-dark)]">
                  <Check className="w-5 h-5" />
                  <span>Email sent successfully!</span>
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1"
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={!email || emailSending}
                    className="btn-primary whitespace-nowrap"
                  >
                    {emailSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* Decluttering Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display text-[var(--color-charcoal)]">
                Your Decluttering Plan
              </h2>
              <button
                onClick={handlePlayAudio}
                disabled={audioLoading}
                className={`voice-btn ${isPlaying ? 'playing' : ''}`}
                title={isPlaying ? 'Stop' : 'Listen'}
              >
                {audioLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isPlaying ? (
                  <VolumeX className="w-6 h-6" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="step-card"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-sage-light)] flex items-center justify-center flex-shrink-0 text-[var(--color-sage-dark)] font-medium">
                      {index + 1}
                    </div>
                    <p className="text-[var(--color-charcoal)] leading-relaxed">
                      {step.trim()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-[var(--color-soft-gray)] text-sm">
        <p>© 2024 Loftie AI • Transform your space, transform your life</p>
      </footer>
    </div>
  );
}

