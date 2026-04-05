import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  preview: {
    host: "0.0.0.0",
    port: 80,
    allowedHosts: ["barbeariadofoguinho.online", "www.barbeariadofoguinho.online"]
  }
});
