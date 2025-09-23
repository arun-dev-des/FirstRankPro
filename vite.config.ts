import { defineConfig } from "vite"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import mkcert from "vite-plugin-mkcert"
import framer from "vite-plugin-framer"

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
