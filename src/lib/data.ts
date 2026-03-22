/**
 * Load JSON data files at build time.
 *
 * Resolution order:
 * 1. ./public/data/<file>     — copied by GHA workflow or local script
 * 2. ../data/<file>           — local dev (site/ is inside almanac/)
 * 3. ../../data/<file>        — fallback
 */
import fs from 'node:fs';
import path from 'node:path';

const SEARCH_PATHS = [
  (f: string) => path.resolve(process.cwd(), 'public', 'data', f),
  (f: string) => path.resolve(process.cwd(), '..', 'data', f),
  (f: string) => path.resolve(process.cwd(), '..', '..', 'data', f),
];

export function loadJSON<T = any>(filename: string, fallback: T): T {
  for (const resolver of SEARCH_PATHS) {
    const p = resolver(filename);
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch {
      // try next path
    }
  }
  return fallback;
}

export function loadPredictions(): any[] {
  return loadJSON('predictions.json', []);
}

export function loadPredictionHistory(): any[] {
  return loadJSON('prediction_history.json', []);
}
