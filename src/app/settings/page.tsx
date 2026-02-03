'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, RotateCcw, Check, Lock, Eye, EyeOff, Settings, Info, User, Image as ImageIcon, ThumbsUp, ThumbsDown, Mail, Download, RefreshCw, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface PromptSettings {
  roomDetection: string;
  declutteringPlan: string;
  imageTransformation: string;
}

type ImageProvider = 'gemini' | 'openrouter';

interface ModelSettings {
  imageProvider: ImageProvider;
  imageGeneration: string;
  textAnalysis: string;
  ttsModel: string;
  ttsVoice: string;
}

interface BioSettings {
  content: string;
  headshotUrl: string;
}

interface AppSettings {
  prompts: PromptSettings;
  models: ModelSettings;
  bio: BioSettings;
  updatedAt: string;
}

interface AvailableModels {
  imageProvider: { value: string; label: string }[];
  imageGeneration: { value: string; label: string }[];
  imageGenerationGemini: { value: string; label: string }[];
  imageGenerationOpenRouter: { value: string; label: string }[];
  textAnalysis: { value: string; label: string }[];
  ttsModel: { value: string; label: string }[];
  ttsVoice: { value: string; label: string }[];
}

interface PromptVariable {
  name: string;
  description: string;
}

interface PromptVariables {
  roomDetection: PromptVariable[];
  declutteringPlan: PromptVariable[];
  imageTransformation: PromptVariable[];
}

interface TransformationRecord {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  createdAt: string;
  accessedAt?: string;
  status: 'processing' | 'completed' | 'failed';
  firstName?: string;
  userEmail?: string;
  feedbackHelpful?: boolean | null;
  feedbackComment?: string;
  feedbackSubmittedAt?: string;
}

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [defaults, setDefaults] = useState<{ prompts: PromptSettings; models: ModelSettings; bio: BioSettings } | null>(null);
  const [availableModels, setAvailableModels] = useState<AvailableModels | null>(null);
  const [promptVariables, setPromptVariables] = useState<PromptVariables | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transformations data
  const [transformations, setTransformations] = useState<TransformationRecord[]>([]);
  const [transformationsLoading, setTransformationsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.valid) {
        setIsAuthenticated(true);
        // Store password for subsequent requests
        sessionStorage.setItem('settings-password', password);
        fetchSettings(password);
      } else {
        setAuthError('Invalid password');
      }
    } catch {
      setAuthError('Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchSettings = async (pwd: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/settings', {
        headers: { 'x-settings-password': pwd },
      });

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      setDefaults(data.defaults);
      setAvailableModels(data.availableModels);
      setPromptVariables(data.promptVariables);

      // Also fetch transformations
      fetchTransformations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransformations = async () => {
    setTransformationsLoading(true);
    try {
      const response = await fetch('/api/transformations?limit=50', {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        // Sort by createdAt descending
        const sorted = (data.transformations || []).sort(
          (a: TransformationRecord, b: TransformationRecord) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setTransformations(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch transformations:', err);
    } finally {
      setTransformationsLoading(false);
    }
  };

  useEffect(() => {
    // Check if already authenticated
    const storedPassword = sessionStorage.getItem('settings-password');
    if (storedPassword) {
      setPassword(storedPassword);
      setIsAuthenticated(true);
      fetchSettings(storedPassword);
    }
  }, []);

  const savePrompt = async (key: keyof PromptSettings) => {
    if (!settings) return;
    
    setSaving(true);
    setSaved(null);
    setError(null);

    try {
      const pwd = sessionStorage.getItem('settings-password') || password;
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-settings-password': pwd,
        },
        body: JSON.stringify({
          prompts: { [key]: settings.prompts[key] },
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveModels = async () => {
    if (!settings) return;

    setSaving(true);
    setSaved(null);
    setError(null);

    try {
      const pwd = sessionStorage.getItem('settings-password') || password;
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-settings-password': pwd,
        },
        body: JSON.stringify({
          models: settings.models,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setSaved('models');
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveBio = async () => {
    if (!settings) return;

    setSaving(true);
    setSaved(null);
    setError(null);

    try {
      const pwd = sessionStorage.getItem('settings-password') || password;
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-settings-password': pwd,
        },
        body: JSON.stringify({
          bio: settings.bio,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setSaved('bio');
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateBio = (key: keyof BioSettings, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      bio: { ...settings.bio, [key]: value },
    });
  };

  const resetBio = () => {
    if (!defaults || !settings) return;
    setSettings({
      ...settings,
      bio: defaults.bio,
    });
  };

  const resetPrompt = async (key: keyof PromptSettings) => {
    if (!defaults || !settings) return;
    
    setSettings({
      ...settings,
      prompts: { ...settings.prompts, [key]: defaults.prompts[key] },
    });
  };

  const resetAllToDefaults = async () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
    
    setSaving(true);
    setError(null);

    try {
      const pwd = sessionStorage.getItem('settings-password') || password;
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-settings-password': pwd,
        },
        body: JSON.stringify({ action: 'reset' }),
      });

      if (!response.ok) throw new Error('Failed to reset');

      const data = await response.json();
      setSettings(data.settings);
      setSaved('all');
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset');
    } finally {
      setSaving(false);
    }
  };

  const updatePrompt = (key: keyof PromptSettings, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      prompts: { ...settings.prompts, [key]: value },
    });
  };

  const updateModel = (key: keyof ModelSettings, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      models: { ...settings.models, [key]: value },
    });
  };

  const promptInfo = {
    roomDetection: {
      title: 'Room Detection Prompt',
      description: 'Validates that uploaded images are actually rooms before processing.',
    },
    declutteringPlan: {
      title: 'Decluttering Plan Prompt',
      description: 'Generates step-by-step organization instructions based on the room image.',
    },
    imageTransformation: {
      title: 'Image Transformation Prompt',
      description: 'Creates the AI-edited image showing the organized room.',
    },
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full rounded-2xl shadow-lg p-6 border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--glass-border)' }}
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <h1 className="text-xl text-[var(--color-text-primary)] tracking-tight mb-1 font-semibold">
              Settings
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              Enter password to access AI settings
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {authError && (
              <div className="text-red-500 text-xs text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || !password}
              className="w-full py-2.5 px-4 bg-[var(--color-accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {authLoading ? 'Authenticating...' : 'Access Settings'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
              ← Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <header className="py-4 px-4 sm:px-6 border-b border-[var(--glass-border)]" style={{ background: 'var(--color-bg-secondary)' }}>
        <nav className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/admin" className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          
          <span className="logo-text">Loftie</span>
          
          <button
            onClick={resetAllToDefaults}
            disabled={saving}
            className="btn-icon"
            title="Reset all to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </nav>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Settings className="w-5 h-5 text-[var(--color-accent)]" />
            <h1 className="text-2xl text-[var(--color-text-primary)] tracking-tight">
              AI <span className="text-emphasis">Settings</span>
            </h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Customize prompts and model settings for image transformations
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] px-4 py-3 rounded-xl text-sm"
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[var(--color-text-muted)] text-sm">Loading settings...</p>
          </div>
        ) : settings ? (
          <div className="space-y-8">
            {/* Prompt Settings */}
            <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className="text-lg text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <span className="text-emphasis">Prompts</span>
              </h2>
              
              <div className="space-y-6">
                {(Object.keys(promptInfo) as Array<keyof PromptSettings>).map((key) => (
                  <div key={key} className="card">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm text-[var(--color-text-primary)] font-medium mb-1">
                          {promptInfo[key].title}
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {promptInfo[key].description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => resetPrompt(key)}
                          className="btn-icon w-8 h-8"
                          title="Reset to default"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {promptVariables && promptVariables[key].length > 0 && (
                      <div className="mb-3 flex items-start gap-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-accent)]/5 px-3 py-2 rounded-lg">
                        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[var(--color-accent)]" />
                        <div>
                          <span className="text-[var(--color-text-secondary)]">Available variables:</span>
                          {promptVariables[key].map((v) => (
                            <span key={v.name} className="ml-2">
                              <code className="text-[var(--color-accent)]">{v.name}</code>
                              <span className="opacity-75"> - {v.description}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <textarea
                      value={settings.prompts[key]}
                      onChange={(e) => updatePrompt(key, e.target.value)}
                      className="w-full min-h-[200px] p-4 bg-[rgba(255,255,255,0.02)] border border-[var(--glass-border)] rounded-xl text-sm text-[var(--color-text-primary)] resize-y focus:outline-none focus:border-[var(--color-accent)] transition-colors font-mono leading-relaxed"
                      placeholder="Enter prompt..."
                    />

                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => savePrompt(key)}
                        disabled={saving}
                        className="btn-secondary"
                      >
                        {saved === key ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            Save Prompt
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Model Settings */}
            <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-lg text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <span className="text-emphasis">Models</span>
              </h2>

              <div className="card">
                <div className="space-y-6">
                  {availableModels && (
                    <>
                      {/* Image Generation Provider Section */}
                      <div className="pb-4 border-b border-[var(--glass-border)]">
                        <h3 className="text-sm text-[var(--color-text-primary)] font-medium mb-3">Image Generation</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                              Provider
                            </label>
                            <select
                              value={settings.models.imageProvider || 'gemini'}
                              onChange={(e) => {
                                const newProvider = e.target.value as ImageProvider;
                                // When switching providers, set a default model for that provider
                                const defaultModel = newProvider === 'openrouter'
                                  ? 'google/gemini-3-pro-image-preview'
                                  : 'gemini-2.0-flash-exp-image-generation';
                                setSettings({
                                  ...settings,
                                  models: {
                                    ...settings.models,
                                    imageProvider: newProvider,
                                    imageGeneration: defaultModel
                                  },
                                });
                              }}
                              className="w-full p-3 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-xl text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                            >
                              {availableModels.imageProvider?.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                              Model
                            </label>
                            <select
                              value={settings.models.imageGeneration}
                              onChange={(e) => updateModel('imageGeneration', e.target.value)}
                              className="w-full p-3 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-xl text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                            >
                              {(settings.models.imageProvider === 'openrouter'
                                ? availableModels.imageGenerationOpenRouter
                                : availableModels.imageGenerationGemini
                              )?.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {settings.models.imageProvider === 'openrouter' && (
                          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                            Using OpenRouter provides access to GPT-5 Image, FLUX, Seedream, and more models.
                            Requires <code className="text-[var(--color-accent)]">OPENROUTER_API_KEY</code> environment variable.
                          </p>
                        )}
                      </div>

                      {/* Other Model Settings */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                            Text Analysis
                          </label>
                          <select
                            value={settings.models.textAnalysis}
                            onChange={(e) => updateModel('textAnalysis', e.target.value)}
                            className="w-full p-3 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-xl text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                          >
                            {availableModels.textAnalysis.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                            Text-to-Speech Model
                          </label>
                          <select
                            value={settings.models.ttsModel}
                            onChange={(e) => updateModel('ttsModel', e.target.value)}
                            className="w-full p-3 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-xl text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                          >
                            {availableModels.ttsModel.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                            TTS Voice
                          </label>
                          <select
                            value={settings.models.ttsVoice}
                            onChange={(e) => updateModel('ttsVoice', e.target.value)}
                            className="w-full p-3 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] rounded-xl text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                          >
                            {availableModels.ttsVoice.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-[var(--glass-border)]">
                  <button
                    onClick={saveModels}
                    disabled={saving}
                    className="btn-secondary"
                  >
                    {saved === 'models' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Save Models
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.section>

            {/* Bio Settings */}
            <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="text-lg text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--color-accent)]" />
                <span className="text-emphasis">Founder Bio</span>
              </h2>

              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm text-[var(--color-text-primary)] font-medium mb-1">
                      About Section Content
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      This content appears in the About section on the homepage.
                    </p>
                  </div>
                  <button
                    onClick={resetBio}
                    className="btn-icon w-8 h-8"
                    title="Reset to default"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                      Bio Text
                    </label>
                    <textarea
                      value={settings.bio.content}
                      onChange={(e) => updateBio('content', e.target.value)}
                      className="w-full min-h-[200px] p-4 bg-[rgba(255,255,255,0.02)] border border-[var(--glass-border)] rounded-xl text-sm text-[var(--color-text-primary)] resize-y focus:outline-none focus:border-[var(--color-accent)] transition-colors leading-relaxed"
                      placeholder="Enter founder bio..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                      Headshot Image URL (optional)
                    </label>
                    <input
                      type="url"
                      value={settings.bio.headshotUrl}
                      onChange={(e) => updateBio('headshotUrl', e.target.value)}
                      placeholder="https://example.com/headshot.jpg"
                      className="w-full"
                    />
                    {settings.bio.headshotUrl && (
                      <div className="mt-3 flex items-center gap-3">
                        <img
                          src={settings.bio.headshotUrl}
                          alt="Headshot preview"
                          className="w-16 h-16 rounded-full object-cover border border-[var(--glass-border)]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span className="text-xs text-[var(--color-text-muted)]">Preview</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-[var(--glass-border)]">
                  <button
                    onClick={saveBio}
                    disabled={saving}
                    className="btn-secondary"
                  >
                    {saved === 'bio' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Save Bio
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.section>

            {/* Transformations & Feedback */}
            <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg text-[var(--color-text-primary)] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="text-emphasis">Transformations & Feedback</span>
                </h2>
                <button
                  onClick={fetchTransformations}
                  disabled={transformationsLoading}
                  className="btn-secondary text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${transformationsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="card">
                {transformationsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-[var(--color-text-muted)]">Loading transformations...</p>
                  </div>
                ) : transformations.length === 0 ? (
                  <div className="text-center py-8">
                    <ImageIcon className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-[var(--color-text-muted)]">No transformations yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4 border-b border-[var(--glass-border)]">
                      <div className="text-center p-3 bg-[rgba(255,255,255,0.02)] rounded-lg">
                        <div className="text-2xl font-semibold text-[var(--color-text-primary)]">{transformations.length}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Total</div>
                      </div>
                      <div className="text-center p-3 bg-[rgba(255,255,255,0.02)] rounded-lg">
                        <div className="text-2xl font-semibold text-[var(--color-success)]">
                          {transformations.filter(t => t.status === 'completed').length}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Completed</div>
                      </div>
                      <div className="text-center p-3 bg-[rgba(255,255,255,0.02)] rounded-lg">
                        <div className="text-2xl font-semibold text-[var(--color-accent)]">
                          {transformations.filter(t => t.feedbackSubmittedAt).length}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">With Feedback</div>
                      </div>
                      <div className="text-center p-3 bg-[rgba(255,255,255,0.02)] rounded-lg">
                        <div className="text-2xl font-semibold text-[var(--color-success)]">
                          {transformations.filter(t => t.feedbackHelpful === true).length}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Helpful</div>
                      </div>
                    </div>

                    {/* Transformations list */}
                    <div className="max-h-[600px] overflow-y-auto space-y-3">
                      {transformations.map((t) => (
                        <div
                          key={t.id}
                          className="flex gap-4 p-3 bg-[rgba(255,255,255,0.02)] border border-[var(--glass-border)] rounded-lg hover:border-[var(--color-accent)]/30 transition-all"
                        >
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-20 h-20 relative rounded-lg overflow-hidden bg-[var(--color-bg-secondary)]">
                            {t.afterImageUrl ? (
                              <img src={t.afterImageUrl} alt="After" className="w-full h-full object-cover" />
                            ) : t.beforeImageUrl ? (
                              <img src={t.beforeImageUrl} alt="Before" className="w-full h-full object-cover opacity-50" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-[var(--color-text-muted)]" />
                              </div>
                            )}
                            <span className={`absolute bottom-1 right-1 text-[8px] px-1.5 py-0.5 rounded ${
                              t.status === 'completed' ? 'bg-[var(--color-success)]/80 text-white' :
                              t.status === 'processing' ? 'bg-[var(--color-accent)]/80 text-white' :
                              'bg-red-500/80 text-white'
                            }`}>
                              {t.status}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {t.firstName && (
                                <span className="flex items-center gap-1 text-xs text-[var(--color-text-primary)]">
                                  <User className="w-3 h-3" />
                                  {t.firstName}
                                </span>
                              )}
                              {t.userEmail && (
                                <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] truncate">
                                  <Mail className="w-3 h-3" />
                                  {t.userEmail}
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] text-[var(--color-text-muted)] mb-2">
                              Created: {new Date(t.createdAt).toLocaleString()}
                              {t.accessedAt && (
                                <span className="ml-2">• Last accessed: {new Date(t.accessedAt).toLocaleString()}</span>
                              )}
                            </div>

                            {/* Feedback */}
                            {t.feedbackSubmittedAt ? (
                              <div className="flex items-start gap-2">
                                {t.feedbackHelpful === true && (
                                  <span className="flex items-center gap-1 text-xs text-[var(--color-success)] bg-[var(--color-success)]/10 px-2 py-0.5 rounded">
                                    <ThumbsUp className="w-3 h-3" /> Helpful
                                  </span>
                                )}
                                {t.feedbackHelpful === false && (
                                  <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                                    <ThumbsDown className="w-3 h-3" /> Not helpful
                                  </span>
                                )}
                                {t.feedbackComment && (
                                  <span className="text-xs text-[var(--color-text-secondary)] italic truncate flex-1" title={t.feedbackComment}>
                                    "{t.feedbackComment}"
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-[var(--color-text-muted)]">No feedback yet</span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex-shrink-0 flex flex-col gap-1">
                            <a
                              href={`/results/${t.id}`}
                              target="_blank"
                              className="text-[10px] text-[var(--color-accent)] hover:underline"
                            >
                              View →
                            </a>
                            {t.beforeImageUrl && (
                              <a
                                href={t.beforeImageUrl}
                                download={`before-${t.id}.jpg`}
                                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> Before
                              </a>
                            )}
                            {t.afterImageUrl && (
                              <a
                                href={t.afterImageUrl}
                                download={`after-${t.id}.png`}
                                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> After
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.section>

            {/* Last Updated */}
            <AnimatePresence>
              {saved === 'all' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-sm text-[var(--color-success)] flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  All settings reset to defaults
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center text-xs text-[var(--color-text-muted)]">
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </div>
          </div>
        ) : null}
      </main>

      <footer className="py-6 text-center text-[var(--color-text-muted)] text-xs border-t border-[rgba(255,255,255,0.04)]">
        <p>© 2026 Loftie</p>
      </footer>
    </div>
  );
}



