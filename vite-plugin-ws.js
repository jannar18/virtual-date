import { createWSHandler } from './server/ws-handler.js';

let wss = null;

export default function wsPlugin() {
  return {
    name: 'vite-plugin-ws',
    configureServer(server) {
      // Avoid duplicate WS servers on Vite restarts
      if (wss) {
        try { wss.close(); } catch {}
        wss = null;
      }
      server.httpServer.once('listening', () => {
        wss = createWSHandler(server.httpServer);
      });
    },
  };
}
