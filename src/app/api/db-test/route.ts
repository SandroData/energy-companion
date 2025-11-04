// app/api/db-test/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({ email: `test+${Date.now()}@example.com` })
    .select()
    .single();

  if (error) {
    console.error('[db-test] error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: data });
}
