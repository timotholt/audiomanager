import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    solid(),
    {
        name: 'index-html-rewrite',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                // If the user requests the root '/', serve 'index-solid.html' instead of 'index.html'
                if (req.url === '/') {
                    req.url = '/index-solid.html';
                }
                next();
            });
        }
    }
  ],
  root: '.',
  build: {
    outDir: 'dist-ui-solid',
    rollupOptions: {
      input: {
        main: 'index-solid.html'
      }
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/jobs': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      }
    },
  },
});
