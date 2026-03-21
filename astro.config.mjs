import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://yingxuh.github.io',
  base: '/almanac-site',
  vite: {
    plugins: [tailwindcss()],
  },
});
