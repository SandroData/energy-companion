'use client';

import * as React from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SyncButton() {
  const supabase = createClientComponentClient();

  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  // On mount: check if current user already has a Strava connection
  React.useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'strava')
        .maybeSingle();

      if (!error && data) setIsConnected(true);
    })();
  }, [supabase]);

  async function connectToStrava() {
    setMsg(null);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in first.');
        return;
      }

      // Always defined in the browser (local: http://localhost:3000, prod: your https domain)
      const siteUrl = window.location.origin;

      // Make sure we have the public client id at build-time
      const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
      if (!clientId) {
        alert('Missing NEXT_PUBLIC_STRAVA_CLIENT_ID env var.');
        return;
      }

      // Pass current user id + a return path
      const state = encodeURIComponent(JSON.stringify({ u: user.id, r: '/dashboard' }));

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${siteUrl}/api/strava/oauth/callback`,
        response_type: 'code',
        scope: 'activity:read_all',
        state,
      });

      // Off we go to Strava
      window.location.href = `https://www.strava.com/oauth/authorize?${params.toString()}`;
    } finally {
      // (The page will navigate away; this is just for completeness during local dev)
      setLoading(false);
    }
  }

  async function runSync() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Sync failed');
      setMsg(`Imported ${body.imported} activities`);
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {!isConnected && (
        <button
          onClick={connectToStrava}
          disabled={loading}
          className="px-3 py-1 rounded bg-orange-500 text-white text-sm"
        >
          {loading ? 'Connecting…' : 'Connect Strava'}
        </button>
      )}

      {isConnected && (
        <button
          onClick={runSync}
          disabled={loading}
          className="px-3 py-1 rounded bg-gray-900 text-white text-sm"
        >
          {loading ? 'Syncing…' : 'Sync Strava'}
        </button>
      )}

      {msg && <span className="text-xs text-gray-600">{msg}</span>}
    </div>
  );
}
