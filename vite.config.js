import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import wsPlugin from './vite-plugin-ws.js';

export default defineConfig({
  plugins: [glsl(), wsPlugin()],
});
