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

export function loadPersonaVotes(): Record<string, any> {
  return loadJSON('persona_votes.json', {});
}

export function loadSiteMeta(): any {
  return loadJSON('site_meta.json', { days_live: 7, total_pipeline_runs: 7, predictions_count: 55, total_signals_processed: 1400 });
}

export function loadPredictionTrajectories(): Record<number, { points: { date: string; confidence: number }[]; events: any[] }> {
  try {
    const history = loadJSON('prediction_history.json', []);
    const evidence = loadJSON('prediction_evidence.json', {});

    const trajectories: Record<number, { points: { date: string; confidence: number }[]; events: any[] }> = {};

    // Build time-series points from history snapshots
    const histArr = Array.isArray(history) ? history : [];
    for (const snapshot of histArr) {
      if (!snapshot || !snapshot.predictions) continue;
      const predsArr = Array.isArray(snapshot.predictions) ? snapshot.predictions : [];
      for (const pred of predsArr) {
        if (!pred || !pred.id) continue;
        if (!trajectories[pred.id]) trajectories[pred.id] = { points: [], events: [] };
        trajectories[pred.id].points.push({ date: snapshot.date || '', confidence: pred.confidence || 0 });
      }
    }

    // Attach evidence events
    const evObj = (evidence && typeof evidence === 'object' && !Array.isArray(evidence)) ? evidence : {};
    const evEntries = Object.entries(evObj);
    for (let i = 0; i < evEntries.length; i++) {
      const [pid, entries] = evEntries[i];
      const id = parseInt(pid);
      if (!trajectories[id] || !Array.isArray(entries)) continue;
      for (let j = 0; j < (entries as any[]).length; j++) {
        const entry = (entries as any[])[j];
        if (!entry || !Array.isArray(entry.signals)) continue;
        for (const signal of entry.signals) {
          trajectories[id].events.push({
            date: entry.date || '',
            delta: entry.delta || 0,
            title: signal.title || '',
            direction: signal.direction || 'up',
          });
        }
      }
    }

    return trajectories;
  } catch {
    return {};
  }
}
