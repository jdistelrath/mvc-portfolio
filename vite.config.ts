import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages needs /mvc-portfolio/, CloudFront needs /
  // BUILD_TARGET=aws in GitHub Actions for AWS deploys
  base: process.env.BUILD_TARGET === 'aws' ? '/' : '/mvc-portfolio/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
