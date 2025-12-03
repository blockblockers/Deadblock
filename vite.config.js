import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    
    // Generate source maps for debugging (disable in production)
    sourcemap: false,
    
    // Optimize chunks
    rollupOptions: {
      output: {
        // Ensure single chunk for Capacitor
        manualChunks: undefined
      }
    },
    
    // Target modern browsers for smaller bundle
    target: 'es2020',
    
    // Minification
    minify: 'esbuild'
  },
  
  // Development server
  server: {
    port: 3000,
    host: true, // Allow access from network (for mobile testing)
    strictPort: true
  },
  
  // Preview server
  preview: {
    port: 3000,
    host: true
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      // Add any path aliases here if needed
      // '@': '/src',
    }
  },
  
  // Define environment variables
  define: {
    // You can add build-time constants here
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react'
    ],
    // Exclude Capacitor packages from pre-bundling (loaded at runtime)
    exclude: [
      '@capacitor/core',
      '@capacitor/app',
      '@capacitor/haptics',
      '@capacitor/keyboard',
      '@capacitor/status-bar',
      '@capacitor/splash-screen',
      '@capacitor/preferences'
    ]
  }
})
