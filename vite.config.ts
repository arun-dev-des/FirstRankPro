import { defineConfig } from "vite"
import path from "path"
import react from "@vitejs/plugin-react-swc"
import mkcert from "vite-plugin-mkcert"
import framer from "vite-plugin-framer"
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), mkcert(), framer(), tailwindcss()],
    build: {
        target: "ES2022",
    },
    server: {
        https: {},
        host: "0.0.0.0"
    },
    optimizeDeps: {
        include: ['framer-plugin']
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
})
