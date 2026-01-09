'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, ArrowUpRight, Settings, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BioData {
  content: string;
  headshotUrl: string;
}

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configWarning, setConfigWarning] = useState<string | null>(null);
  const [bio, setBio] = useState<BioData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if storage is configured
    fetch('/api/debug/storage')
      .then(res => res.json())
      .then(data => {
        if (data.environment?.isVercel && !data.environment?.hasBlobToken) {
          setConfigWarning('Vercel Blob storage is not linked to this project. Transformations will not be saved.');
        }
      })
      .catch(() => {});

    // Fetch bio data for About section
    fetch('/api/bio')
      .then(res => res.json())
      .then(data => {
        if (data.bio) {
          setBio(data.bio);
        }
      })
      .catch(() => {});
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          userEmail: email || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transformation');
      }

      // Navigate immediately to the results page - processing happens there
      router.push(`/results/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  };

  const features = [
    {
      image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80',
      title: 'Visualize',
      desc: 'AI-generated vision of your decluttered space',
    },
    {
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80',
      title: 'Plan',
      desc: 'Step-by-step guidance to achieve it',
    },
    {
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80',
      title: 'Listen',
      desc: 'Audio companion walks you through',
    },
  ];

  return (
    <div className="hero-bg">
      {/* Header */}
      <header className="py-4 px-4 sm:px-6">
        <nav className="max-w-5xl mx-auto flex justify-between items-center">
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="logo-text"
          >
            Loftie
          </motion.span>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center"
          >
            <a href="#features" className="nav-item hidden sm:block">
              How it Works
            </a>
            <a href="/admin" className="nav-item">
              Dashboard
            </a>
          </motion.div>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="promo-banner mb-6 inline-block">
            Transform your space in seconds
          </span>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-[var(--color-text-primary)] mb-4 tracking-[-0.03em]">
            <span className="text-emphasis">Declutter</span> your home,<br />
            <span className="text-emphasis">design</span> your life.
          </h1>
          
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-md mx-auto">
            Upload a photo. Get an AI-powered vision of your space, clutter-free.
          </p>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-md mx-auto mt-2">
            No signup needed. Give Loftie a try with one room photo.
          </p>
        </motion.div>
        
        {configWarning && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-3 rounded-xl text-xs text-center flex items-center justify-center gap-2"
          >
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            {configWarning}
          </motion.div>
        )}
      </main>

      {/* Upload */}
      <section id="upload" className="max-w-md mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card"
        >
          <AnimatePresence mode="wait">
            {!selectedImage ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className={`upload-zone p-6 sm:p-8 ${isDragging ? 'drag-over' : ''}`}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleInputChange}
                  />
                  
                  <div className="mb-4 w-12 h-12 rounded-full border border-dashed border-[var(--color-text-muted)] flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-[var(--color-text-muted)]" />
                  </div>
                  
                  <p className="text-sm text-[var(--color-text-primary)] mb-1 font-medium">
                    Drop your room photo
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    or click to browse
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2 opacity-75">
                    Well-lit, straight-on photos work best
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="relative">
                  <img
                    src={selectedImage}
                    alt="Selected room"
                    className="w-full rounded-lg object-cover max-h-56"
                  />
                  {!isProcessing && (
                    <button
                      onClick={clearImage}
                      className="absolute top-2 right-2 btn-icon w-8 h-8"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white truncate max-w-[60%]">
                    {selectedFile?.name}
                  </div>
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  disabled={isProcessing}
                />

                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2 py-2"
                  >
                    <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[var(--color-text-muted)] text-xs">Uploading...</p>
                  </motion.div>
                )}

                {error && (
                  <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] px-3 py-2 rounded-lg text-xs text-center">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="btn-primary w-full"
                >
                  {isProcessing ? 'Transforming...' : (
                    <>Transform <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-xl sm:text-2xl text-[var(--color-text-primary)] tracking-tight mb-2">
            How it <span className="text-emphasis">works</span>
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Three simple steps to your dream space
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="feature-card"
            >
              <img src={feature.image} alt={feature.title} className="feature-card-image" />
              <div className="feature-card-content">
                <span className="text-[0.6rem] text-[var(--color-accent)] font-semibold uppercase tracking-wider">
                  Step {i + 1}
                </span>
                <h3 className="text-sm text-[var(--color-text-primary)] font-medium mt-1 mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-md mx-auto px-4 py-12 text-center">
        <h2 className="text-lg sm:text-xl text-[var(--color-text-primary)] mb-2">
          Ready to <span className="text-emphasis">transform</span>?
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Be one of the first to declutter with AI.
        </p>
        <button
          onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}
          className="btn-primary"
        >
          Get Started <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>

      {/* About */}
      {bio && bio.content && (
        <section id="about" className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card"
          >
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
              {bio.headshotUrl && (
                <div className="flex-shrink-0 flex justify-center sm:justify-start">
                  <img
                    src={bio.headshotUrl}
                    alt="Founder headshot"
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-2 border-[var(--color-accent)]/30"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="mb-4">
                  <span className="text-[0.65rem] text-[var(--color-accent)] font-semibold uppercase tracking-wider">
                    About
                  </span>
                  <h2 className="text-xl sm:text-2xl text-[var(--color-text-primary)] tracking-tight mt-1">
                    Meet the <span className="text-emphasis">Founder</span>
                  </h2>
                </div>
                <div className="space-y-4 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {bio.content.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-[var(--glass-border)]">
                  <a
                    href="https://innovaedesigns.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    Visit Innovae Designs
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Footer */}
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
