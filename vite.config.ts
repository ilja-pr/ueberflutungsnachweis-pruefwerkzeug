/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Normal:   npm run dev / npm run build  → übliche Ausgabe mit getrennten Dateien in dist/
 * Portable: npm run build:portable       → EINE HTML-Datei in dist-portable/ (läuft per Doppelklick,
 *           ohne Server, auch ohne Internet; enthält auch den PDF-Leser)
 */
export default defineConfig(({ mode }) => {
  const portable = mode === 'portable';
  return {
    base: './',
    plugins: [react(), ...(portable ? [viteSingleFile()] : [])],
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  };
});
