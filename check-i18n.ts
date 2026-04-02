#!/usr/bin/env bun
// Check that all translation files have the same keys as en.ts

import en from './src/i18n/en';
import zh from './src/i18n/zh';

const enKeys = Object.keys(en);
const langs: Record<string, Record<string, string>> = { zh };

let hasError = false;

for (const [name, translations] of Object.entries(langs)) {
  const keys = Object.keys(translations);
  const enSet = new Set(enKeys);
  const langSet = new Set(keys);

  const missing = enKeys.filter(k => !langSet.has(k));
  if (missing.length) { console.error(`❌ ${name}: missing keys: ${missing.join(', ')}`); hasError = true; }

  const extra = keys.filter(k => !enSet.has(k));
  if (extra.length) { console.error(`⚠️  ${name}: extra keys: ${extra.join(', ')}`); hasError = true; }

  const empty = keys.filter(k => !translations[k]?.trim());
  if (empty.length) { console.error(`⚠️  ${name}: empty values: ${empty.join(', ')}`); hasError = true; }
}

if (hasError) process.exit(1);
else console.log('✅ All translations are complete and consistent.');
