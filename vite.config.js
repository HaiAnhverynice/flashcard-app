import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change 'flashcard-app' to your GitHub repo name
// e.g. if your repo is github.com/yourname/my-quiz → base: '/my-quiz/'
export default defineConfig({
  plugins: [react()],
  base: '/flashcard-app/',
})
