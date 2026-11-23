import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    // Windows locks (Chrome Cookies, open brand images) kill Vite watchers (EBUSY).
    watch: {
      ignored: [
        "**/tmp-chrome-*/**",
        "**/tmp-wc-*.json",
        "**/tmp-wc-*.txt",
        "**/tmp-ext-*.json",
        "**/public/sw-brands/**",
      ],
    },
  },
});
