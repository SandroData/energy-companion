'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

function parseHash(hash: string) {
  const out: Record<string, string> = {};
  if (!hash) return out;
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  for (const part of h.split('&')) {
    const [k, v] = part.split('=');
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return out;
}

export default function AuthCallbackPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/en';
  const [message, setMessage] = useState('Finishing sign-in…');

  useEffect(() => {
    (async () => {
      try {
        const href = window.location.href;
        const url = new URL(href);

        // A) Classic magic link (hash tokens)
        const hash = parseHash(url.hash);
        const access_token = hash['access_token'];
        const refresh_token = hash['refresh_token'];
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          setMessage('Signed in! Redirecting…');
          router.replace(next);
          return;
        }

        // B) PKCE / “code” flow (let SDK parse verifier it stored earlier)
        const res = await supabase.auth.exchangeCodeForSession(href);
        if (!res.error) {
          setMessage('Signed in! Redirecting…');
          router.replace(next);
          return;
        }

        throw new Error(res.error.message || 'No auth parameters found');
      } catch (e: any) {
        console.error('Auth callback error:', e?.message ?? e);
        setMessage(`Sign-in failed: ${e?.message ?? 'Unknown error'}`);
      }
    })();
  }, [router, next, supabase]);

  return (
    <main className="min-h-[40vh] flex items-center justify-center">
      <p className="text-sm text-gray-700">{message}</p>
    </main>
  );
}
