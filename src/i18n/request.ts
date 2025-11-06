// src/i18n/request.ts
import {getRequestConfig} from 'next-intl/server';
import {headers} from 'next/headers';

export default getRequestConfig(async () => {
  // Always await headers() in Next 15
  const h = await headers();

  // Middleware adds this header automatically
  const locale = h.get('x-next-intl-locale') ?? 'en';

  // 👇 must *return* the locale explicitly
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
