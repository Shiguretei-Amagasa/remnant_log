import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHubリポジトリ名に合わせて変更してください
// 例：リポジトリ名が "remnant_log" なら "/remnant_log/"
const REPO_NAME = '/remnant_log/'

export default defineConfig({
  plugins: [react()],
  base: REPO_NAME,
})
