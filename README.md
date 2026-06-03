# remnant log

感情の痕跡を、場所に刻む。

## セットアップ

```bash
npm install
npm run dev
```

## GitHub Pages へのデプロイ手順

### 1. vite.config.js を編集

```js
const REPO_NAME = '/あなたのリポジトリ名/'
```

### 2. GitHubにpush

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/ユーザー名/リポジトリ名.git
git push -u origin main
```

### 3. GitHub Pages を有効化

リポジトリの Settings → Pages → Source を **GitHub Actions** に設定

pushするたびに自動でデプロイされます。

## URL

```
https://ユーザー名.github.io/リポジトリ名/
```
