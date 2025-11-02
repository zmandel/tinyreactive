import { defineConfig } from 'vite';

export default defineConfig({
  // Set this only if index.html is in src
  root: 'src',
  build: {
    // When root is 'src', emit dist to the project root
    outDir: '../dist',
    emptyOutDir: true
  }
});
