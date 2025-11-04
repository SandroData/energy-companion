import { NextResponse } from "next/server";
import axios, { AxiosResponse } from "axios";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

  try {
    const res: AxiosResponse<StravaTokenResponse> = await axios.post(
      "https://www.strava.com/oauth/token",
      {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }
    );

    const { access_token, refresh_token, expires_at, athlete } = res.data;
    const athlete_id = athlete?.id;

    // temp user (we'll swap to real auth later)
    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .insert({ email: `strava+${athlete_id}@example.com` })
      .select()
      .single();
    if (userErr || !user) throw userErr ?? new Error("User insert failed");

    const { error: connErr } = await supabaseAdmin.from("connections").insert({
      user_id: user.id,
      provider: "strava",
      access_token,
      refresh_token,
      athlete_id,
      expires_at: new Date(expires_at * 1000).toISOString(),
    });
    if (connErr) throw connErr;

    return NextResponse.redirect(new URL("/?connected=strava", req.url));
  } catch (e) {
    const msg =
      (e as { response?: { data?: unknown }; message?: string })?.response?.data ??
      (e as Error)?.message ??
      "OAuth failed";
    console.error("Strava OAuth error:", msg);
    return NextResponse.json({ ok: false, error: "OAuth failed" }, { status: 500 });
  }
}

