'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, ArrowRight, X, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
    setProgress(0);
    setError(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

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
        throw new Error(data.error || 'Failed to transform image');
      }

      clearInterval(progressInterval);
      setProgress(100);

      // Navigate to results page
      setTimeout(() => {
        router.push(`/results/${data.id}`);
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="py-6 px-8">
        <nav className="max-w-6xl mx-auto flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-sage)] to-[var(--color-sage-dark)] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-display font-semibold text-[var(--color-charcoal)]">
              Loftie
            </span>
          </motion.div>
          <motion.a
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            href="/admin"
            className="text-[var(--color-soft-gray)] hover:text-[var(--color-charcoal)] text-sm font-medium"
          >
            Admin
          </motion.a>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-display text-[var(--color-charcoal)] mb-4">
            Transform Your Space
          </h1>
          <p className="text-xl text-[var(--color-soft-gray)] max-w-2xl mx-auto leading-relaxed">
            Upload a photo of your cluttered room and let our AI show you the possibilities. 
            Get a photorealistic vision of your transformed space with step-by-step guidance.
          </p>
        </motion.div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                  className={`upload-zone rounded-2xl p-12 text-center cursor-pointer ${
                    isDragging ? 'drag-over' : ''
                  }`}
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
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-sage-light)] flex items-center justify-center">
                    <Upload className="w-8 h-8 text-[var(--color-sage-dark)]" />
                  </div>
                  <h3 className="text-2xl font-display text-[var(--color-charcoal)] mb-2">
                    Drop your room photo here
                  </h3>
                  <p className="text-[var(--color-soft-gray)]">
                    or click to browse • PNG, JPG up to 10MB
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="relative">
                  <img
                    src={selectedImage}
                    alt="Selected room"
                    className="w-full rounded-2xl object-cover max-h-96"
                  />
                  {!isProcessing && (
                    <button
                      onClick={clearImage}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all"
                    >
                      <X className="w-5 h-5 text-[var(--color-charcoal)]" />
                    </button>
                  )}
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[var(--color-sage)]" />
                    <span className="text-sm font-medium text-[var(--color-charcoal)]">
                      {selectedFile?.name}
                    </span>
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[var(--color-charcoal)]">
                    Email (optional) - We&apos;ll send you the results
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={isProcessing}
                    className="disabled:opacity-50"
                  />
                </div>

                {/* Progress Bar */}
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-sage)] animate-pulse" />
                      <p className="text-[var(--color-soft-gray)]">
                        {progress < 30
                          ? 'Analyzing your space...'
                          : progress < 60
                          ? 'Removing clutter and styling...'
                          : progress < 90
                          ? 'Creating your transformation plan...'
                          : 'Almost there...'}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="btn-primary w-full flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Transforming...
                    </>
                  ) : (
                    <>
                      Transform My Space
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-6 mt-16"
        >
          {[
            {
              icon: '✨',
              title: 'AI-Powered Vision',
              desc: 'See a photorealistic transformation of your decluttered space',
            },
            {
              icon: '📋',
              title: 'Step-by-Step Guide',
              desc: 'Get personalized guidance to achieve your transformed look',
            },
            {
              icon: '🎧',
              title: 'Audio Companion',
              desc: 'Listen to your decluttering plan with our friendly voice guide',
            },
          ].map((feature, i) => (
            <div key={i} className="text-center p-6">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-display text-[var(--color-charcoal)] mb-2">
                {feature.title}
              </h3>
              <p className="text-[var(--color-soft-gray)] text-sm">
                {feature.desc}
              </p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-[var(--color-soft-gray)] text-sm">
        <p>© 2024 Loftie AI • Transform your space, transform your life</p>
      </footer>
    </div>
  );
}
