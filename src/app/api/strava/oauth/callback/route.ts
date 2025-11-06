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
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const origin = url.origin;

  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }

  // parse state (optional: { u: userId, r: returnPath })
  let userIdFromState: string | undefined;
  let returnPath = "/";
  try {
    if (stateRaw) {
      const parsed = JSON.parse(decodeURIComponent(stateRaw));
      userIdFromState = parsed?.u;
      returnPath = parsed?.r ?? "/";
    }
  } catch {}

  try {
    // 1) exchange code -> tokens (include redirect_uri)
    const res: AxiosResponse<StravaTokenResponse> = await axios.post(
      "https://www.strava.com/oauth/token",
      {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${origin}/api/strava/oauth/callback`,
      }
    );

    const { access_token, refresh_token, expires_at, athlete } = res.data;
    const athlete_id = athlete?.id;
    if (!athlete_id) throw new Error("Missing athlete_id from Strava");

    // 2) choose user
    let userId = userIdFromState;
    if (!userId) {
      const { data: tmp, error: tmpErr } = await supabaseAdmin
        .from("users")
        .insert({ email: `strava+${athlete_id}@example.com` })
        .select()
        .single();
      if (tmpErr || !tmp) throw tmpErr ?? new Error("User insert failed");
      userId = tmp.id;
    }

    // 3) upsert on (provider, athlete_id) to refresh tokens, and (re)link to this user
    const { error: connErr } = await supabaseAdmin
      .from("connections")
      .upsert(
        {
          user_id: userId,
          provider: "strava",
          athlete_id,
          access_token,
          refresh_token,
          expires_at: new Date(expires_at * 1000).toISOString(),
        },
        { onConflict: "provider,athlete_id" }
      );
    if (connErr) throw connErr;

    // 4) redirect back
    return NextResponse.redirect(new URL(`${returnPath}?connected=strava`, origin));
  } catch (e: any) {
    const detail = e?.response?.data ?? e?.message ?? "OAuth failed";
    console.error("Strava OAuth error:", detail);
    return NextResponse.json(
      { ok: false, error: process.env.NODE_ENV !== "production" ? String(detail) : "OAuth failed" },
      { status: 500 }
    );
  }
}
