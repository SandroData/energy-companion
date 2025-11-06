// src/app/[locale]/login/page.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function LoginPage() {
  const supabase = React.useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [step, setStep] = React.useState<'request' | 'verify'>('request');
  const [email, setEmail] = React.useState('');
  const [token, setToken] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      // IMPORTANT: no emailRedirectTo here → Supabase sends a 6-digit code
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('verify');
      setMsg('We sent you a 6-digit code by email. Paste it below.');
    } catch (err: any) {
      setMsg(`❌ ${err?.message || 'Failed to send code'}`);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      // Try as existing user first…
      let { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      // …if that fails, it might be a first-time signup OTP
      if (error) {
        const res2 = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'signup',
        });
        error = res2.error ?? null;
      }

      if (error) throw error;

      setMsg('✅ Signed in!');
      // Make the server see the cookie session on next render:
      router.replace('/en'); // adjust default locale if needed
    } catch (err: any) {
      setMsg(`❌ ${err?.message || 'Verification failed'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12 space-y-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      {step === 'request' && (
        <form onSubmit={requestCode} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border rounded px-3 py-2"
            required
          />
          <button
            disabled={loading || !email}
            className="rounded px-4 py-2 bg-gray-900 text-white w-full"
          >
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={verifyCode} className="space-y-3">
          <div className="text-sm text-gray-600">
            Email: <strong>{email}</strong>
          </div>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit code"
            className="w-full border rounded px-3 py-2 tracking-widest"
            required
          />
          <button
            disabled={loading || token.length !== 6}
            className="rounded px-4 py-2 bg-gray-900 text-white w-full"
          >
            {loading ? 'Verifying…' : 'Verify & Sign in'}
          </button>

          <button
            type="button"
            className="w-full text-sm underline text-gray-600"
            onClick={() => {
              setStep('request');
              setToken('');
              setMsg(null);
            }}
          >
            Use a different email
          </button>
        </form>
      )}

      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
