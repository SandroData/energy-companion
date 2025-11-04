export default function Home() {
  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? process.env.STRAVA_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', process.env.STRAVA_REDIRECT_URI!);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'activity:read_all');

  return (
    <main className="min-h-screen flex items-center justify-center">
      <a
        href={authUrl.toString()}
        className="rounded px-4 py-2 bg-orange-600 text-white"
      >
        Connect Strava
      </a>
    </main>
  );
}

