import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Tauri dev server port. Kept at 1420 to match the default tauri-create template
// and the .claude/launch.json entry used by the Claude Preview MCP.
const port = 1420

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port,
    strictPort: true,
    host: '127.0.0.1',
  },
  // Vite envs beginning with VITE_ are exposed to the client. We flip
  // VITE_BROWSER_MODE at build/dev time to switch TauriHost ↔ BrowserHost.
  clearScreen: false,
})
