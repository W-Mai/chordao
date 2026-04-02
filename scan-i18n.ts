#!/usr/bin/env bun
/**
 * Scan all .tsx files for hardcoded user-facing strings not wrapped in t().
 * Outputs JSON list of { file, line, text } for review.
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import en from './src/i18n/en';

const SRC = './src';
const knownValues = new Set(Object.values(en));

// Patterns to skip: imports, classNames, style keys, SVG attributes, technical strings
const SKIP_PATTERNS = [
  /^[a-z]/, // starts with lowercase (likely code identifier)
  /^[#.\/]/, // CSS selectors, paths
  /^var\(/, // CSS variables
  /^\d/, // numbers
  /^[{([]/, // code
  /className/, /style/, /key=/, /import /, /from '/, /console\./,
  /^(true|false|null|undefined)$/,
  /^(px|rem|em|vh|vw|%|auto|none|inherit|flex|grid|block|hidden|absolute|relative|fixed)$/,
  /^(middle|end|start|center|bold|normal|monospace|uppercase)$/,
  /^(transparent|currentColor)$/,
  /^[A-Z][a-z]*$/, // Single capitalized word likely a component/variable
  /^[×○●◼⬤━♪↑→=]/, // symbols used in SVG
  /^\w+[-:]\w/, // CSS-like or technical
];

function shouldSkip(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length <= 1) return true;
  if (knownValues.has(trimmed)) return true;
  return SKIP_PATTERNS.some(p => p.test(trimmed));
}

// Extract string literals from JSX text content and string props that look user-facing
function scanFile(filePath: string): { file: string; line: number; text: string }[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: { file: string; line: number; text: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip import/comment lines
    if (/^\s*(import |\/\/|\/\*|\*)/.test(line)) continue;

    // Find JSX text content: >text< (between tags)
    const jsxTextMatches = line.matchAll(/>([^<>{]+)</g);
    for (const m of jsxTextMatches) {
      const text = m[1].trim();
      if (text && !shouldSkip(text) && !text.includes('{')) {
        results.push({ file: filePath, line: i + 1, text });
      }
    }

    // Find string props that look like labels: title="...", label="...", placeholder="..."
    const propMatches = line.matchAll(/(?:title|label|placeholder|alt)=["']([^"']+)["']/g);
    for (const m of propMatches) {
      const text = m[1].trim();
      if (text && !shouldSkip(text)) {
        results.push({ file: filePath, line: i + 1, text });
      }
    }
  }

  return results;
}

function getAllTsx(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'i18n') files.push(...getAllTsx(full));
    else if (entry.name.endsWith('.tsx')) files.push(full);
  }
  return files;
}

const allFiles = getAllTsx(SRC);
const allResults: { file: string; line: number; text: string }[] = [];

for (const f of allFiles) {
  allResults.push(...scanFile(f));
}

if (allResults.length === 0) {
  console.log('✅ No unhardcoded user-facing strings found.');
} else {
  console.log(`⚠️  Found ${allResults.length} potentially unhardcoded strings:\n`);
  for (const r of allResults) {
    console.log(`  ${r.file}:${r.line}  "${r.text}"`);
  }

  // Write to temp file for form processing
  const outPath = '/tmp/i18n-scan-results.json';
  writeFileSync(outPath, JSON.stringify(allResults, null, 2));
  console.log(`\nResults saved to ${outPath}`);
}
