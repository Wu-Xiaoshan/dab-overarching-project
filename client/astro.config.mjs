import { defineConfig, passthroughImageService } from 'astro/config';
import svelte from '@astrojs/svelte';
import deno from '@astrojs/deno';

export default defineConfig({
  output: 'server',
  adapter: deno({
    port: 4321,
    hostname: '0.0.0.0'
  }),
  integrations: [svelte()],
  image: {
    service: passthroughImageService()
  }
});
