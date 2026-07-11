// Web書き出し(dist)後の後処理。
//  1. index.html にPWA/iOSホーム追加用のメタ情報を注入
//  2. SPA(single)のディープリンク/リロード用に 404.html を作成
//  3. GitHub Pages で _expo/ が無視されないよう .nojekyll を作成
// 実行: node scripts/postbuild-web.js  （expo export --platform web の後）
const fs = require('fs')
const path = require('path')

const DIST = path.resolve(__dirname, '..', 'dist')
// app.json の experiments.baseUrl と一致させる
const BASE = '/PuzzleVault'

const indexPath = path.join(DIST, 'index.html')
let html = fs.readFileSync(indexPath, 'utf8')

// viewport を viewport-fit=cover / ズーム無効に差し替え（ノッチ対応・ネイティブ風の操作感）
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />'
)

const injected = [
  `<link rel="manifest" href="${BASE}/manifest.json" />`,
  // Android/Chrome: ホーム追加時にスタンドアロン表示
  '<meta name="mobile-web-app-capable" content="yes" />',
  // iOS: ホーム追加時に全画面・ステータスバー透過でネイティブアプリのように表示
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="PuzzleVault" />',
  `<link rel="apple-touch-icon" href="${BASE}/icons/apple-touch-icon.png" />`,
].join('\n    ')

// 既に注入済みなら二重挿入しない
if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `    ${injected}\n  </head>`)
}

fs.writeFileSync(indexPath, html)
console.log('injected PWA meta into index.html')

// SPA ディープリンク用フォールバック
fs.copyFileSync(indexPath, path.join(DIST, '404.html'))
console.log('created 404.html')

// Jekyll 無効化
fs.writeFileSync(path.join(DIST, '.nojekyll'), '')
console.log('created .nojekyll')
