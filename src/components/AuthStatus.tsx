// src/components/AuthStatus.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export function AuthStatus({ email }: { email?: string | null }) {
  const supabase = React.useMemo(() => supabaseBrowser(), []);

  if (!email) {
    return (
      <Link href="/en/login" className="text-sm underline">
        Sign in
      </Link>
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();         // clears local + cookie via @supabase/ssr
    window.location.href = '/en/login';     // make server render “signed out” on next request
  }

  return (
    <button onClick={handleSignOut} className="text-sm underline">
      Sign out ({email})
    </button>
  );
}
