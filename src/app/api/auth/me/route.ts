import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  const supa = await supabaseServer();
  const { data: { user }, error } = await supa.auth.getUser();
  return NextResponse.json({ user, error });
}
