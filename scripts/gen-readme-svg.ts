#!/usr/bin/env bun
/**
 * Generate Shape Grid SVG for README by rendering the actual ShapeGrid component.
 * Injects CSS variables as a <style> block so the SVG is self-contained.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateVoicings, groupByDegree, findOptimalCombination } from '../src/chordData';
import { ShapeGrid } from '../src/ShapeGrid';

const KEY = 'D#'; // Eb
const PROG_DEGREES = [1, 5, 6, 3, 4, 1, 4, 5]; // Canon Ext.

const voicings = generateVoicings(KEY);
const grouped = groupByDegree(voicings);
const optimal = findOptimalCombination(grouped, PROG_DEGREES);

const html = renderToStaticMarkup(
  React.createElement(ShapeGrid, {
    voicings,
    optimal,
    light: false,
    totalFrets: 12,
    progressionDegrees: PROG_DEGREES,
    animated: true,
  }),
);

const svgMatch = html.match(/<svg[\s\S]*<\/svg>/);
if (!svgMatch) {
  console.error('❌ No SVG found');
  process.exit(1);
}

// Cyber theme CSS variables injected into SVG
const cyberVars = `<style>
  svg {
    --crust: #05080a; --mantle: #0a0e14; --base: #0d1117;
    --surface0: #1a1f2e; --surface1: #252b3b;
    --overlay0: #4a5568; --overlay1: #718096;
    --text: #e0f0ff; --subtext0: #8ba4c0; --subtext1: #a0c4e8;
    --blue: #00e5ff; --sapphire: #00bcd4; --lavender: #b388ff;
    --green: #00ff9f; --yellow: #ffea00; --peach: #ff6e40;
    --red: #ff1744; --mauve: #e040fb; --teal: #1de9b6;
    --color-deg-1: #ff1744; --color-deg-2: #ff6e40; --color-deg-3: #ffea00;
    --color-deg-4: #00ff9f; --color-deg-5: #00e5ff; --color-deg-6: #e040fb;
    --panel-bg: #0d1117d9; --panel-border: #00e5ff26;
    --glow-blue: #00e5ff0f; --ui-radius: 4px;
  }
  text { font-family: 'JetBrains Mono', monospace; }
</style>`;

let svg = svgMatch[0];
if (!svg.includes('xmlns')) {
  svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}
// Inject style after opening <svg> tag
svg = svg.replace(/(<svg[^>]*>)/, `$1\n${cyberVars}`);

const outPath = '../public/readme-shape-grid.svg';
await Bun.write(outPath, svg);
console.log(`✅ Generated ${outPath} (${svg.length} bytes)`);
