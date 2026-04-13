import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "dist",
        sourcemap: false, // Don't expose source maps in production
        rollupOptions: {
            output: {
                // Randomize chunk names to prevent fingerprinting
                chunkFileNames: "assets/[hash].js",
                entryFileNames: "assets/[hash].js",
                assetFileNames: "assets/[hash].[ext]",
            },
        },
    },
    server: {
        // Headers for Vite dev server (when not behind Express)
        headers: {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
        },
    },
});