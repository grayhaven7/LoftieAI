'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, ArrowUpRight, Settings, ExternalLink, Camera, Upload } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';

interface BioData {
  content: string;
  headshotUrl: string;
}

// Compress and resize image to max dimensions while maintaining quality
// Optimized for speed: 1440px max dimension balances quality and processing time
// Targets 1-1.5MB max for faster API calls
async function compressImage(file: File, maxDimension: number = 1440, quality: number = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Use high-quality image smoothing
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }

      // Convert to JPEG for better compression (unless PNG is needed for transparency)
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(mimeType, quality);

      // Check resulting size and compress more aggressively if needed
      const sizeInMB = (compressedDataUrl.length * 3) / 4 / (1024 * 1024); // Rough base64 to bytes conversion

      if (sizeInMB > 1.5 && quality > 0.5) {
        // Re-compress with lower quality if still too large
        const newQuality = Math.max(0.5, quality - 0.15);
        const recompressed = canvas.toDataURL('image/jpeg', newQuality);
        resolve(recompressed);
      } else {
        resolve(compressedDataUrl);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));

    // Read file and set as image source
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configWarning, setConfigWarning] = useState<string | null>(null);
  const [bio, setBio] = useState<BioData | null>(null);
  // User controls
  const [creativityLevel, setCreativityLevel] = useState<'strict' | 'balanced' | 'creative'>('strict');
  const [keepItems, setKeepItems] = useState('');
  const [browserId, setBrowserId] = useState<string>('');
  const [recentTransformations, setRecentTransformations] = useState<Array<{
    id: string;
    beforeImageUrl: string;
    afterImageUrl: string;
    status: string;
    createdAt: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Generate or retrieve browser ID
    let id = localStorage.getItem('loftie-browser-id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('loftie-browser-id', id);
    }
    setBrowserId(id);

    // Fetch recent transformations for this browser
    fetch(`/api/transformations/mine?browserId=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.transformations) {
          setRecentTransformations(data.transformations);
        }
      })
      .catch(() => {});

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

  // Camera functions
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setCameraStream(stream);
      setShowCamera(true);
      // Wait for React to render the video element, then attach stream
      const attachStream = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
          };
        } else {
          // Video element not mounted yet, retry
          requestAnimationFrame(attachStream);
        }
      };
      requestAnimationFrame(attachStream);
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera access denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setCameraError('No camera found on this device.');
        } else {
          setCameraError('Could not access camera. Please try uploading a photo instead.');
        }
      } else {
        setCameraError('Could not access camera.');
      }
    }
  };

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }, [cameraStream]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob and create a file
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      await handleFileSelect(file);
    }, 'image/jpeg', 0.9);
  };

  // Handle mobile camera input (fallback for devices without getUserMedia)
  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

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

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setIsCompressing(true);

    try {
      // Automatically compress and resize large images (especially from mobile)
      // Targets 1-2MB max with 1920px max dimension
      const compressedImage = await compressImage(file, 1920, 0.8);
      setSelectedImage(compressedImage);

      // Log compression stats for debugging
      const originalSizeMB = file.size / (1024 * 1024);
      const compressedSizeMB = (compressedImage.length * 3) / 4 / (1024 * 1024);
      console.log(`Image compressed: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB`);
    } catch (err) {
      // Fallback to original if compression fails
      console.warn('Image compression failed, using original:', err);
      setError('Image compression failed. Please try a smaller image or different format.');
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
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
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
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
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          creativityLevel,
          keepItems: keepItems.trim() || undefined,
          browserId: browserId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transformation');
      }

      // Navigate immediately to the results page - processing happens there
      // Pass blobUrl as query param for faster initial fetch (avoids Vercel Blob list() consistency issues)
      const url = data.blobUrl
        ? `/results/${data.id}?blobUrl=${encodeURIComponent(data.blobUrl)}`
        : `/results/${data.id}`;
      router.push(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  };

  const features = [
    {
      image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80',
      title: 'Visualize',
      desc: 'See an AI-generated preview of your space — calm, tidy, and clutter-free',
    },
    {
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80',
      title: 'Plan',
      desc: 'Get a personalized, step-by-step decluttering plan with donation & selling tips',
    },
    {
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80',
      title: 'Listen',
      desc: 'Play the audio guide and let your personal organizer walk you through it',
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
            <a href="/dashboard" className="nav-item">
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
          <span className="badge badge-accent mb-6">
            Transform your space in seconds
          </span>

          <h1 className="text-3xl sm:text-4xl md:text-5xl text-[var(--color-text-primary)] mb-4 tracking-[-0.03em] leading-[1.15]">
            <span className="text-emphasis">Declutter</span> your home,<br />
            <span className="text-emphasis">design</span> your life.
          </h1>
          
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-md mx-auto">
            Upload a photo. Get a vision of your space, clutter-free.
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
            {!selectedImage && !showCamera ? (
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
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleInputChange}
                  />
                  {/* Hidden camera input for mobile fallback */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleCameraInput}
                  />

                  <div className="mb-4 w-12 h-12 rounded-full border border-dashed border-[var(--color-text-muted)] flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-[var(--color-text-muted)]" />
                  </div>

                  <p className="text-sm text-[var(--color-text-primary)] mb-3 font-medium">
                    Add your room photo
                  </p>

                  {/* Camera and Upload buttons */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Try native camera API first, fall back to input capture
                        if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
                          startCamera();
                        } else {
                          cameraInputRef.current?.click();
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg text-xs font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg text-xs font-medium hover:bg-[var(--glass-border-hover)] transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload
                    </button>
                  </div>

                  <p className="text-xs text-[var(--color-text-muted)] opacity-75">
                    Well-lit, straight-on photos work best
                  </p>

                  {cameraError && (
                    <div className="mt-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] px-3 py-2 rounded-lg text-xs text-center">
                      {cameraError}
                    </div>
                  )}

                  {isCompressing && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-[var(--color-text-muted)]">Optimizing image...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : showCamera && !selectedImage ? (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Camera controls overlay */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button
                      onClick={stopCamera}
                      className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={capturePhoto}
                      className="w-14 h-14 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors border-4 border-white/50"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]" />
                    </button>
                    <div className="w-10 h-10" /> {/* Spacer for balance */}
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] text-center">
                  Position your room in the frame and tap to capture
                </p>
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
                    src={selectedImage!}
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

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    disabled={isProcessing}
                    className="flex-1"
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    disabled={isProcessing}
                    className="flex-1"
                  />
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional — we'll send your plan)"
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
                <p className="text-[10px] text-[var(--color-text-muted)] text-center mt-2 opacity-70">
                  AI image results may vary
                </p>

                {/* Privacy Notice */}
                <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
                  <p className="text-[10px] text-[var(--color-text-muted)] text-center flex items-center justify-center gap-1.5">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Your photos are processed securely and not stored after your session
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Recent Transformations */}
      {recentTransformations.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <h2 className="text-xl sm:text-2xl text-[var(--color-text-primary)] tracking-tight mb-2">
              Your Recent <span className="text-emphasis">Transformations</span>
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Pick up where you left off
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {recentTransformations.slice(0, 8).map((t, i) => (
              <motion.a
                key={t.id}
                href={`/results/${t.id}`}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group relative aspect-square rounded-xl overflow-hidden border border-[var(--glass-border)] hover:border-[var(--color-accent)] transition-colors"
              >
                <NextImage
                  src={t.afterImageUrl || t.beforeImageUrl}
                  alt="Transformation"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    t.status === 'completed' ? 'bg-green-500/80 text-white' :
                    t.status === 'processing' ? 'bg-yellow-500/80 text-white' :
                    'bg-red-500/80 text-white'
                  }`}>
                    {t.status}
                  </span>
                </div>
              </motion.a>
            ))}
          </div>
        </section>
      )}

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
              <NextImage
                src={feature.image}
                alt={feature.title}
                width={600}
                height={400}
                loading="lazy"
                className="feature-card-image"
              />
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
          Ready to love your <span className="text-emphasis">space</span> again?
        </h2>
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
                  <NextImage
                    src={bio.headshotUrl}
                    alt="Founder headshot"
                    width={128}
                    height={128}
                    loading="lazy"
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
      <footer className="py-6 text-center text-[var(--color-text-muted)] text-xs border-t border-[var(--glass-border)]">
        <div className="flex flex-col items-center gap-3">
          {/* Privacy Notice */}
          <div className="flex items-center gap-2 text-[10px] bg-[var(--color-bg-secondary)] px-4 py-2 rounded-full">
            <svg className="w-3.5 h-3.5 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Photos processed securely • Not stored or used for AI training</span>
          </div>
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
          <p className="text-[10px] opacity-60">
            Powered by AI • Results may vary
          </p>
        </div>
      </footer>
    </div>
  );
}
