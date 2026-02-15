'use client';

import { useState, useRef, useCallback } from 'react';

const MODELS = [
  { label: 'Gemini 2.5 Flash Image (direct)', value: 'gemini-2.5-flash-image', provider: 'gemini' },
  { label: 'Gemini 2.0 Flash Exp (direct)', value: 'gemini-2.0-flash-exp-image-generation', provider: 'gemini' },
  { label: 'Gemini 2.5 Flash Image (OpenRouter)', value: 'google/gemini-2.5-flash-image', provider: 'openrouter' },
  { label: 'Gemini 3 Pro Image Preview (OpenRouter)', value: 'google/gemini-3-pro-image-preview', provider: 'openrouter' },
  { label: 'GPT-5 Image (OpenRouter)', value: 'openai/gpt-5-image', provider: 'openrouter' },
  { label: 'GPT-5 Image Mini (OpenRouter)', value: 'openai/gpt-5-image-mini', provider: 'openrouter' },
] as const;

interface TestResult {
  id: string;
  model: string;
  modelLabel: string;
  beforeImage: string;
  afterImage: string;
  timestamp: Date;
  error?: string;
}

const DEFAULT_PROMPT = `TRANSFORM THIS PHOTO.

This is a PHOTO EDITING task — not a new image generation task.

You must show the SAME space from the SAME camera angle, SAME walls, SAME furniture placement, SAME lighting — but professionally decluttered, deeply cleaned, and beautifully organized.

The before and after must be DRAMATICALLY different at a glance. If someone can't immediately tell which is the before and which is the after, you haven't cleaned enough.

CORE RULE: ORGANIZE AND CLEAN — DO NOT REDESIGN.`;

export default function DebugPage() {
  const [image, setImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].value);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  }, [handleFile]);

  const runTest = async (modelValue?: string) => {
    if (!image) return;
    const model = MODELS.find(m => m.value === (modelValue || selectedModel))!;
    const id = Date.now().toString();
    setLoading(model.value);

    try {
      const res = await fetch('/api/debug/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image,
          model: model.value,
          provider: model.provider,
          prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      setResults(prev => [{
        id, model: model.value, modelLabel: model.label,
        beforeImage: image, afterImage: data.image, timestamp: new Date(),
      }, ...prev]);
    } catch (err) {
      setResults(prev => [{
        id, model: model.value, modelLabel: model.label,
        beforeImage: image, afterImage: '', timestamp: new Date(),
        error: err instanceof Error ? err.message : 'Unknown error',
      }, ...prev]);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>🔧 Debug: Prompt & Model Tester</h1>

      {/* Upload */}
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          border: '2px dashed var(--color-border, #444)', borderRadius: '12px',
          padding: '2rem', textAlign: 'center', cursor: 'pointer',
          marginBottom: '1.5rem', background: 'var(--color-bg-secondary, #1a1a2e)',
        }}
      >
        {image ? (
          <img src={image} alt="Uploaded" style={{ maxHeight: '200px', borderRadius: '8px' }} />
        ) : (
          <p style={{ color: 'var(--color-text-secondary, #888)' }}>Drop image here or click to upload</p>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>

      {/* Model selector */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value as typeof selectedModel)}
          style={{
            flex: 1, minWidth: '250px', padding: '0.75rem', borderRadius: '8px',
            background: 'var(--color-bg-secondary, #1a1a2e)', color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border, #444)', fontSize: '0.9rem',
          }}
        >
          {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <button
          onClick={() => runTest()}
          disabled={!image || !!loading}
          style={{
            padding: '0.75rem 2rem', borderRadius: '8px', border: 'none',
            background: loading ? '#555' : '#6c5ce7', color: '#fff',
            cursor: !image || loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 600,
          }}
        >
          {loading ? '⏳ Running...' : '▶ Run Test'}
        </button>

        <button
          onClick={async () => {
            if (!image) return;
            for (const model of MODELS) {
              await runTest(model.value);
            }
          }}
          disabled={!image || !!loading}
          style={{
            padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--color-border, #444)',
            background: 'transparent', color: 'var(--color-text-primary)',
            cursor: !image || loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
          }}
        >
          Run All Models
        </button>
      </div>

      {/* Prompt */}
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        style={{
          width: '100%', minHeight: '400px', padding: '1rem', borderRadius: '8px',
          background: 'var(--color-bg-secondary, #1a1a2e)', color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border, #444)', fontSize: '0.85rem',
          fontFamily: 'monospace', resize: 'vertical', marginBottom: '2rem', boxSizing: 'border-box',
        }}
      />

      {/* Loading indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary, #888)' }}>
          <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
          <p>Processing with {MODELS.find(m => m.value === loading)?.label}...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Results ({results.length})</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {results.map(r => (
              <div key={r.id} style={{
                background: 'var(--color-bg-secondary, #1a1a2e)', borderRadius: '12px',
                padding: '1rem', border: r.error ? '1px solid #e74c3c' : '1px solid var(--color-border, #444)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <strong>{r.modelLabel}</strong>
                  <span style={{ color: 'var(--color-text-secondary, #888)' }}>{r.timestamp.toLocaleTimeString()}</span>
                </div>
                {r.error ? (
                  <p style={{ color: '#e74c3c' }}>❌ {r.error}</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #888)', marginBottom: '0.5rem' }}>Before</p>
                      <img src={r.beforeImage} alt="Before" style={{ width: '100%', borderRadius: '8px' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #888)', marginBottom: '0.5rem' }}>After</p>
                      <img src={r.afterImage} alt="After" style={{ width: '100%', borderRadius: '8px' }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
