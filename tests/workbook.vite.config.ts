import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{outDir:'../../outputs/workbook-validation',emptyOutDir:true,rollupOptions:{input:'tests/workbook-performance.html'}}});
