module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // zustand v5 の ESM ビルドが import.meta を含むため、Web クライアント
          // バンドルで SyntaxError となり JS 全体が実行されない。この変換で
          // import.meta を Expo のレジストリ実装に置き換える（server 環境では
          // 元々デフォルト有効。native は CJS 解決のため実質影響なし）。
          unstable_transformImportMeta: true,
        },
      ],
    ],
  }
}
