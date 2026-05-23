import { defineConfig } from 'vite';

// base: './' gør at den byggede version virker uanset hvor den hostes
// (GitHub Pages-undermappe, itch.io, Netlify, lokalt fil-preview).
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
