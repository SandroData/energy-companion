import { NextResponse } from 'next/server';
import axios from 'axios';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ ok: false, error: 'Missing code' }, { status: 400 });

  try {
    // Exchange code for tokens
    const res = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_at, athlete } = res.data;
    const athlete_id = athlete?.id;

    // For now, create a temp user row (later: real auth)
    const { data: user } = await supabaseAdmin
      .from('users')
      .insert({ email: `strava+${athlete_id}@example.com` })
      .select()
      .single();

    // Store connection
    await supabaseAdmin.from('connections').insert({
      user_id: user.id,
      provider: 'strava',
      access_token,
      refresh_token,
      athlete_id,
      expires_at: new Date(expires_at * 1000).toISOString(),
    });

    return NextResponse.redirect(new URL('/?connected=strava', req.url));
  } catch (err: any) {
    console.error('Strava OAuth error:', err?.response?.data || err.message);
    return NextResponse.json({ ok: false, error: 'OAuth failed' }, { status: 500 });
  }
}
