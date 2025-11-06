// app/api/strava/oauth/callback/route.ts
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
  const stateRaw = searchParams.get("state");

  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }

  // Extract data we passed in `state` when starting OAuth (user id + return path)
  let userIdFromState: string | undefined;
  let returnPath = "/";
  try {
    if (stateRaw) {
      const parsed = JSON.parse(decodeURIComponent(stateRaw));
      userIdFromState = parsed?.u;
      returnPath = parsed?.r ?? "/";
    }
  } catch {
    /* ignore */
  }

  try {
    // 1️⃣ Exchange code → tokens
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

    // 2️⃣ Decide which user to link
    let userId = userIdFromState;
    if (!userId) {
      // fallback: still allow temp user creation if you don’t have login yet
      const { data: tempUser, error: tempErr } = await supabaseAdmin
        .from("users")
        .insert({ email: `strava+${athlete_id}@example.com` })
        .select()
        .single();
      if (tempErr || !tempUser) throw tempErr ?? new Error("User insert failed");
      userId = tempUser.id;
    }

    // 3️⃣ Upsert connection for this user
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
        { onConflict: "user_id,provider" } // adjust to your unique index
      );
    if (connErr) throw connErr;

    // 4️⃣ Redirect back to dashboard (or last page)
    return NextResponse.redirect(
      new URL(`${returnPath}?connected=strava`, process.env.NEXT_PUBLIC_SITE_URL)
    );
  } catch (e) {
    const msg =
      (e as { response?: { data?: unknown }; message?: string })?.response?.data ??
      (e as Error)?.message ??
      "OAuth failed";
    console.error("Strava OAuth error:", msg);
    return NextResponse.json({ ok: false, error: "OAuth failed" }, { status: 500 });
  }
}
