#!/usr/bin/env node

/**
 * Ingest simulation.yaml files from jimmy-teaching-dataset and convert to JSON.
 *
 * Usage:
 *   node scripts/ingest-simulations.mjs [teaching-dataset-path]
 *
 * Defaults to:
 *   /Users/jimmy/yaojunxiong-jimmy-teaching-dataset
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { load } from 'js-yaml';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const outputDir = join(projectRoot, 'src', 'data', 'minna', 'simulation');

const teachingDatasetPath = process.argv[2] || '/Users/jimmy/yaojunxiong-jimmy-teaching-dataset';
const lessonsDir = join(teachingDatasetPath, 'lessons');

if (!existsSync(lessonsDir)) {
  console.error(`Teaching dataset not found at: ${lessonsDir}`);
  console.error('Usage: node scripts/ingest-simulations.mjs [teaching-dataset-path]');
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const lessonDirs = readdirSync(lessonsDir).filter(d => d.startsWith('lesson-'));
let ingested = 0;

for (const dir of lessonDirs) {
  const yamlPath = join(lessonsDir, dir, 'simulation.yaml');
  if (!existsSync(yamlPath)) continue;

  try {
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    const data = load(yamlContent);
    const jsonPath = join(outputDir, `${dir}.json`);
    writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  ✓ ${dir} → ${dir}.json`);
    ingested++;
  } catch (err) {
    console.error(`  ✗ ${dir}: ${err.message}`);
  }
}

console.log(`\nIngested ${ingested} simulation files to ${outputDir}`);
