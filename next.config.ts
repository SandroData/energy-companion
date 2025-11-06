import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts'); // 👈 point here

const nextConfig = {
  reactStrictMode: true
};

export default withNextIntl(nextConfig);
