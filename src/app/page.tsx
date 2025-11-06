'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootForward() {
  const router = useRouter();

  useEffect(() => {
    const next = '/en'; // default landing locale
    const qs = window.location.search;   // e.g. ?code=...
    const hash = window.location.hash;   // e.g. #access_token=...

    if (qs.includes('code=') || hash.includes('access_token=')) {
      // Preserve BOTH query and hash; also pass your "next" target
      const joiner = qs ? '&' : '?';
      window.location.replace(`/auth/callback${qs}${hash}${joiner}next=${encodeURIComponent(next)}`);
    } else {
      // No auth params – just go to the default locale
      router.replace(next);
    }
  }, [router]);

  return null;
}
