// PWA/iOSホームアイコンを assets/icon.png から生成する。
// 実行: node scripts/gen-pwa-icons.js
const path = require('path')
const fs = require('fs')
const { generateImageAsync } = require('@expo/image-utils')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'assets/icon.png')
const OUT = path.join(ROOT, 'public/icons')

const targets = [
  { name: 'icon-192.png', width: 192, height: 192 },
  { name: 'icon-512.png', width: 512, height: 512 },
  { name: 'apple-touch-icon.png', width: 180, height: 180 },
]

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  for (const t of targets) {
    const { source } = await generateImageAsync(
      { projectRoot: ROOT },
      {
        src: SRC,
        name: t.name,
        width: t.width,
        height: t.height,
        resizeMode: 'cover',
        // iOSのホームアイコンは透過非対応。透過部分をテーマ背景色で塗る
        backgroundColor: '#0E0E10',
        removeTransparency: true,
      }
    )
    fs.writeFileSync(path.join(OUT, t.name), source)
    console.log('wrote', t.name, source.length, 'bytes')
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
