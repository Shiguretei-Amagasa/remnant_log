import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHubリポジトリ名に合わせて変更してください
// 例：リポジトリ名が "remnant-log" なら "/remnant-log/"
const REPO_NAME = '/remnant-log/'

export default defineConfig({
  plugins: [react()],
  base: REPO_NAME,
})
