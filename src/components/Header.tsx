'use client';

import * as React from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function Header({ initialSignedIn }: { initialSignedIn: boolean }) {
  const supabase = React.useMemo(() => supabaseBrowser(), []);
  const [signedIn, setSignedIn] = React.useState(initialSignedIn);

  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/en/login'; // adjust locale if needed
  }

  return (
    <header className="w-full flex items-center justify-between px-4 py-3 border-b">
      <Link href="/en" className="font-semibold">Energy Companion</Link>
      <nav className="flex items-center gap-3">
        {signedIn ? (
          <button onClick={handleSignOut} className="text-sm px-3 py-1 rounded bg-gray-900 text-white">
            Sign out
          </button>
        ) : (
          <Link href="/en/login" className="text-sm px-3 py-1 rounded border">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
