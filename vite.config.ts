import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.'
        },
        {
          src: 'public/icons/*',
          dest: 'icons'
        },
        {
          src: 'src/popup/popup.html',
          dest: 'popup',
          rename: 'popup.html'
        },
        {
          src: 'src/options/options.html',
          dest: 'options',
          rename: 'options.html'
        },
        {
          src: 'src/leak-test/leak-test.html',
          dest: 'leak-test',
          rename: 'leak-test.html'
        },
        {
          src: 'test-geolocation.html',
          dest: '.'
        },
        {
          src: 'test-language.html',
          dest: '.'
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content/content': resolve(__dirname, 'src/content/content.ts'),
        'injected/injected': resolve(__dirname, 'src/injected/injected.ts'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.ts'),
        'options/options': resolve(__dirname, 'src/options/options.ts'),
        'leak-test/leak-test': resolve(__dirname, 'src/leak-test/leak-test.ts')
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name.endsWith('.css')) {
            if (name.includes('popup')) return 'popup/popup.css';
            if (name.includes('options')) return 'options/options.css';
            if (name.includes('leak-test')) return 'leak-test/leak-test.css';
          }
          return 'assets/[name].[hash][extname]';
        }
      },
      // Prevent automatic code splitting by not sharing modules
      preserveEntrySignatures: 'strict'
    },
    target: 'esnext',
    minify: false,
    // Force Rollup to inline shared code instead of creating chunks
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
