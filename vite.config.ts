import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    appType: 'spa',
    plugins: [
      tailwindcss(),
      {
        name: 'admin-redirect',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/admin') {
              req.url = '/admin/';
            }
            next();
          });
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
