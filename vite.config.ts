import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages needs /mvc-portfolio/, CloudFront needs /
  // Set VITE_BASE_PATH=/ in GitHub Actions for AWS deploys
  base: process.env.VITE_BASE_PATH || '/mvc-portfolio/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
