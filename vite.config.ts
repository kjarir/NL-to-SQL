import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  
  return {
    plugins: [
      react(),
      isDevelopment && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    },
    server: {
      port: 5173,
      proxy: isDevelopment ? {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      } : undefined
    },
    define: {
      'process.env.VITE_API_URL': JSON.stringify(
        isDevelopment 
          ? 'http://localhost:3000'
          : process.env.VITE_API_URL || 'https://sql-whisperer-backend.onrender.com'
      )
    }
  };
});
