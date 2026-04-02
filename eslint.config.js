import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import i18next from 'eslint-plugin-i18next'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { i18next },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'i18next/no-literal-string': ['warn', {
        markupOnly: true,
        ignoreAttribute: ['className', 'style', 'key', 'viewBox', 'fill', 'stroke', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'rx', 'ry', 'width', 'height', 'd', 'points', 'transform', 'textAnchor', 'dominantBaseline', 'fontFamily', 'strokeWidth', 'strokeLinejoin', 'opacity'],
      }],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
