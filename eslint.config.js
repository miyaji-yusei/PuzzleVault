const js = require('@eslint/js')
const globals = require('globals')
const tseslint = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')
const reactPlugin = require('eslint-plugin-react')
const reactHooksPlugin = require('eslint-plugin-react-hooks')

module.exports = [
  {
    ignores: ['node_modules/', '.expo/', 'dist/', 'data/', 'eslint.config.js', 'jest.config.js', 'babel.config.js'],
  },
  js.configs.recommended,
  {
    // Node製のビルド/生成スクリプト（CommonJS）
    files: ['scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    // 'detect' は eslint-plugin-react が context.getFilename() を呼ぶため ESLint v10 で動作しない
    settings: { react: { version: '19.1.0' } },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      // react-hooks v7のrecommendedはReact Compiler向けの新規ルール群を含み大量の既存違反を生むため、
      // .eslintrc.js時代から使われていた基本ルールのみを引き継ぐ
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // TypeScriptの型チェック（@types/jest等のグローバル型を含む）でカバーされるため無効化
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'react/react-in-jsx-scope': 'off',
    },
  },
]
