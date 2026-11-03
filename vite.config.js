import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

const UPSTREAM_ORIGIN = 'https://locket.elingo.app';
const ALLOWED_WEB_ORIGIN = 'https://locket-file.vercel.app';

function createLocketProxy() {
  return {
    '/locket': {
      target: UPSTREAM_ORIGIN,
      changeOrigin: true,
      secure: true,
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader('origin', ALLOWED_WEB_ORIGIN);
          proxyReq.setHeader('referer', `${ALLOWED_WEB_ORIGIN}/`);
        });
        proxy.on('proxyRes', (proxyRes) => {
          delete proxyRes.headers['access-control-allow-origin'];
          delete proxyRes.headers['access-control-allow-credentials'];
        });
      },
    },
    '/mediapipe': {
      target: ALLOWED_WEB_ORIGIN,
      changeOrigin: true,
      secure: true,
    },
  };
}

/**
 * Dual-Protocol HTTP + HTTPS Multiplexer on the SAME port (e.g. :3000):
 * - PC opening `http://localhost:3000` -> served over plain HTTP (zero cert warning, SecureContext=true).
 * - Phone opening `http://192.168.x.x:3000` -> auto 302-redirects to `https://192.168.x.x:3000`
 *   on the EXACT SAME port 3000 and serves TLS HTTPS so mobile `getUserMedia` camera works!
 */
function dualHttpHttpsLanPlugin() {
  const attachMultiplexer = (server) => {
    const httpServer = server?.httpServer;
    if (!httpServer) return;

    server.middlewares.use((req, res, next) => {
      const hostHeader = req.headers.host || '';
      const hostname = hostHeader.replace(/:\d+$/, '');
      const isLocalhost =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '[::1]';
      if (!req.socket?.encrypted && !isLocalhost && hostHeader) {
        res.writeHead(302, {
          Location: `https://${hostHeader}${req.url || '/'}`,
          'Cache-Control': 'no-store',
        });
        res.end();
        return;
      }
      next();
    });

    const tlsListeners = httpServer.listeners('connection').slice();
    const httpListeners = httpServer.listeners('secureConnection').slice();
    if (!tlsListeners.length || !httpListeners.length) return;

    // Extra connection listeners beyond tls.Server's primary handler (e.g. Vite socket tracker)
    const extraTrackers = tlsListeners.slice(1);

    httpServer.removeAllListeners('connection');
    httpServer.on('connection', (socket) => {
      socket.on('error', () => {});
      socket.once('readable', () => {
        const first = socket.read(1);
        if (!first) return;
        const isTls = first[0] === 0x16;
        socket.unshift(first);
        if (isTls) {
          for (const fn of tlsListeners) fn.call(httpServer, socket);
        } else {
          for (const fn of extraTrackers) fn.call(httpServer, socket);
          for (const fn of httpListeners) fn.call(httpServer, socket);
        }
      });
    });
  };

  return {
    name: 'dual-http-https-lan',
    configureServer: attachMultiplexer,
    configurePreviewServer: attachMultiplexer,
  };
}

export default defineConfig(({ mode }) => {
  const dedicatedHttpsPort = mode === 'https';
  return {
    plugins: [
      react(),
      basicSsl({ name: 'locket-photobooth-lan' }),
      ...(!dedicatedHttpsPort ? [dualHttpHttpsLanPlugin()] : []),
    ],
    server: {
      port: dedicatedHttpsPort ? 3443 : 3000,
      strictPort: false,
      host: true,
      proxy: createLocketProxy(),
    },
    preview: {
      port: 3000,
      strictPort: false,
      host: true,
      proxy: createLocketProxy(),
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
