'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Play, Loader2, CheckCircle, AlertCircle, Image as ImageIcon, Settings, RefreshCw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface TestResult {
  id: string;
  originalImage: string;
  transformedImage: string;
  prompt: string;
  model: string;
  timestamp: string;
  status: 'success' | 'error' | 'processing';
  error?: string;
}

interface TestingInterfaceProps {
  settings: {
    prompts: {
      imageTransformation: string;
    };
    models: {
      imageProvider: string;
      imageGeneration: string;
    };
  };
  onPromptChange: (prompt: string) => void;
  onModelChange: (provider: string, model: string) => void;
}

export default function TestingInterface({ 
  settings, 
  onPromptChange, 
  onModelChange 
}: TestingInterfaceProps) {
  const [testImages, setTestImages] = useState<File[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setTestImages(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    multiple: true,
  });

  const removeImage = (index: number) => {
    setTestImages(prev => prev.filter((_, i) => i !== index));
  };

  const runTest = async (imageFile: File) => {
    const testId = Date.now().toString();
    const originalImageUrl = URL.createObjectURL(imageFile);
    
    // Add processing result
    const processingResult: TestResult = {
      id: testId,
      originalImage: originalImageUrl,
      transformedImage: '',
      prompt: settings.prompts.imageTransformation,
      model: `${settings.models.imageProvider}/${settings.models.imageGeneration}`,
      timestamp: new Date().toISOString(),
      status: 'processing',
    };
    
    setTestResults(prev => [processingResult, ...prev]);
    setIsProcessing(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
      const imageBase64 = await base64Promise;

      // Call the transformation API
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          firstName: 'Test',
          lastName: 'User',
          userEmail: 'test@example.com',
          creativityLevel: 'strict',
          browserId: 'testing',
        }),
      });

      if (!response.ok) {
        throw new Error('Transformation failed');
      }

      const result = await response.json();
      const blobUrlParam = result.blobUrl ? `?blobUrl=${encodeURIComponent(result.blobUrl)}` : '';
      
      // Trigger processing
      fetch(`/api/process/${result.id}${blobUrlParam}`, { method: 'POST' }).catch(console.error);
      
      // Poll for completion
      let attempts = 0;
      const maxAttempts = 40;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const statusResponse = await fetch(`/api/transformations/${result.id}${blobUrlParam}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        const statusData = await statusResponse.json();
        
        if (statusData.afterImageUrl && statusData.status === 'completed') {
          // Success
          setTestResults(prev => 
            prev.map(r => 
              r.id === testId 
                ? {
                    ...r,
                    transformedImage: statusData.afterImageUrl,
                    status: 'success' as const,
                  }
                : r
            )
          );
          break;
        } else if (statusData.status === 'failed') {
          throw new Error('Transformation failed');
        }
        
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Transformation timed out');
      }

    } catch (error) {
      console.error('Test failed:', error);
      setTestResults(prev =>
        prev.map(r =>
          r.id === testId
            ? {
                ...r,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Unknown error',
              }
            : r
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const runAllTests = async () => {
    if (testImages.length === 0) return;
    
    for (const image of testImages) {
      await runTest(image);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Quick Prompt Editor */}
      <div className="card">
        <h3 className="text-sm text-[var(--color-text-primary)] font-medium mb-4">
          Quick Prompt Editor
        </h3>
        <div className="space-y-3">
          <label className="block text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
            Current Transformation Prompt
          </label>
          <textarea
            value={settings.prompts.imageTransformation}
            onChange={(e) => onPromptChange(e.target.value)}
            className="w-full p-3 bg-[var(--color-bg-secondary)] border border-[var(--glass-border)] rounded-xl text-sm text-[var(--color-text-primary)] resize-y focus:outline-none focus:border-[var(--color-accent)] transition-colors font-mono text-xs"
            style={{ minHeight: '400px' }}
            placeholder="Enter transformation prompt..."
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            Changes here will be used for testing. Save in the Prompts section to make permanent.
          </p>
        </div>
      </div>

      {/* Test Images Upload */}
      <div className="card">
        <h3 className="text-sm text-[var(--color-text-primary)] font-medium mb-4">
          Test Images
        </h3>
        
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
              : 'border-[var(--glass-border)] hover:border-[var(--color-accent)]/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--color-text-primary)] mb-1">
            {isDragActive ? 'Drop images here' : 'Upload test images'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            PNG, JPG, JPEG, WEBP up to 10MB each
          </p>
        </div>

        {testImages.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {testImages.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full aspect-square object-cover rounded-lg border border-[var(--glass-border)]"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {testImages.length > 0 && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={runAllTests}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isProcessing ? 'Processing...' : 'Test All Images'}
            </button>
            <button
              onClick={() => setTestImages([])}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--glass-border-hover)] text-[var(--color-text-primary)] rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Images
            </button>
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-[var(--color-text-primary)] font-medium">
              Test Results ({testResults.length})
            </h3>
            <button
              onClick={clearResults}
              className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Clear Results
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {testResults.map((result) => (
              <div key={result.id} className="border border-[var(--glass-border)] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  {result.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                  )}
                  {result.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-[var(--color-error)]" />
                  )}
                  {result.status === 'processing' && (
                    <Loader2 className="w-4 h-4 text-[var(--color-accent)] animate-spin" />
                  )}
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {result.model}
                  </span>
                </div>

                {result.status === 'error' && (
                  <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                    {result.error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-2">Before</p>
                    <img
                      src={result.originalImage}
                      alt="Original"
                      className="w-full aspect-square object-cover rounded border border-[var(--glass-border)]"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-2">After</p>
                    {result.transformedImage ? (
                      <img
                        src={result.transformedImage}
                        alt="Transformed"
                        className="w-full aspect-square object-cover rounded border border-[var(--glass-border)]"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-[var(--color-bg-secondary)] rounded border border-[var(--glass-border)] flex items-center justify-center">
                        {result.status === 'processing' ? (
                          <Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-[var(--color-text-muted)]" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}