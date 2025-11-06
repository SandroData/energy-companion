import { ReactNode } from 'react';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>; // Next 15: await params
}) {
  const { locale } = await params;

  const supa = await supabaseServer();
  const { data: { user } } = await supa.auth.getUser();

  return (
    <html lang={locale ?? 'en'}>
      <body>
        {/* Temporarily comment out the header until we fix it */}
        {/* <Header initialSignedIn={!!user} /> */}
        <div style={{padding:'8px',fontSize:'12px',borderBottom:'1px solid #eee'}}>
          <strong>Auth:</strong> {user ? 'signed in' : 'signed out'} · <strong>Locale:</strong> {locale}
        </div>
        {children}
      </body>
    </html>
  );
}
