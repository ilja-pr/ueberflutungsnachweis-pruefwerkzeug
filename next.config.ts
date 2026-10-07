import type { NextConfig } from 'next';

/**
 * Statischer Export: `npm run build` schreibt eine fertige Seite nach out/.
 * Die kann auf jeden Webserver (oder lokal mit `npm run serve`). Es gibt keinen Next-Server und keine API.
 * Liegt die Seite in einem Unterpfad (z. B. /tools/ueberflutung), vor dem Build NEXT_PUBLIC_BASE_PATH=/tools/ueberflutung setzen.
 */
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  agentRules: false,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default config;
