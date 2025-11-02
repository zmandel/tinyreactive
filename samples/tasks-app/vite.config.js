import { defineConfig } from 'vite';

export default defineConfig({
  // build options: outDir is relative to the project root (this folder)
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
