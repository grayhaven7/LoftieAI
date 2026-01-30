'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // Set auth cookie and redirect
    document.cookie = `loftie-admin-auth=${password}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Strict`;
    
    // Verify by trying to access the protected page
    const res = await fetch('/api/transformations', {
      headers: { 'Authorization': `Bearer ${password}` },
    });

    if (res.ok) {
      router.push(redirect);
    } else {
      // Clear bad cookie
      document.cookie = 'loftie-admin-auth=; path=/; max-age=0';
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8 w-full max-w-sm text-center"
      >
        <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
        </div>
        <h1 className="text-lg text-[var(--color-text-primary)] font-medium mb-1">Admin Access</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">Enter password to continue</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-text-muted)]"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-400">Incorrect password</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary w-full py-3 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
