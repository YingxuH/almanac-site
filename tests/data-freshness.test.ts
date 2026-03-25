/**
 * Data freshness tests for Almanac site.
 *
 * Verifies that the pipeline data files are current and consistent:
 * 1. predictions.json exists and has expected structure
 * 2. Report files exist for recent dates
 * 3. Chinese .zh.md reports exist alongside English reports
 * 4. prediction_evidence.json is deployed
 * 5. Data timestamps are not stale (within 3 days)
 * 6. Micro-predictions have valid resolution_date fields
 *
 * Run: npx vitest run tests/data-freshness.test.ts
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(__dirname, '..', 'public', 'data');
const REPORTS_DIR = path.resolve(__dirname, '..', 'src', 'content', 'reports');

describe('Pipeline data files exist', () => {
  it('predictions.json exists', () => {
    expect(fs.existsSync(path.join(DATA_DIR, 'predictions.json'))).toBe(true);
  });

  it('prediction_history.json exists', () => {
    expect(fs.existsSync(path.join(DATA_DIR, 'prediction_history.json'))).toBe(true);
  });

  it('prediction_evidence.json exists and is deployed', () => {
    expect(fs.existsSync(path.join(DATA_DIR, 'prediction_evidence.json'))).toBe(true);
  });
});

describe('Predictions data structure', () => {
  let predictions: any[];

  it('predictions.json is valid JSON array', () => {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'predictions.json'), 'utf-8');
    predictions = JSON.parse(raw);
    expect(Array.isArray(predictions)).toBe(true);
  });

  it('has at least 50 predictions', () => {
    predictions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'predictions.json'), 'utf-8'));
    expect(predictions.length).toBeGreaterThanOrEqual(50);
  });

  it('each prediction has required fields', () => {
    predictions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'predictions.json'), 'utf-8'));
    for (const p of predictions) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('claim');
      expect(p).toHaveProperty('confidence');
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('horizon');
      expect(p).toHaveProperty('type');
      expect(p).toHaveProperty('reasoning');
    }
  });

  it('each prediction has Chinese translations', () => {
    predictions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'predictions.json'), 'utf-8'));
    for (const p of predictions) {
      expect(p).toHaveProperty('claim_zh');
      expect(p.claim_zh).toBeTruthy();
      expect(p.claim_zh).not.toBe(p.claim); // Should be different from English
    }
  });

  it('confidence values are within [3, 97] bounds', () => {
    predictions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'predictions.json'), 'utf-8'));
    for (const p of predictions) {
      expect(p.confidence).toBeGreaterThanOrEqual(3);
      expect(p.confidence).toBeLessThanOrEqual(97);
    }
  });

  it('has micro-predictions with resolution_date', () => {
    predictions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'predictions.json'), 'utf-8'));
    const micros = predictions.filter(p => p.type === 'micro');
    expect(micros.length).toBeGreaterThanOrEqual(1);
    for (const m of micros) {
      expect(m).toHaveProperty('resolution_date');
      expect(m.resolution_date).toMatch(/^\d{4}-\d{2}/); // YYYY-MM format at minimum
    }
  });
});

describe('Report files', () => {
  it('reports directory exists', () => {
    expect(fs.existsSync(REPORTS_DIR)).toBe(true);
  });

  it('has at least 1 report file', () => {
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.md') && !f.includes('.zh.'));
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it('latest report is not more than 3 days old', () => {
    const files = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.endsWith('.md') && !f.includes('.zh.'))
      .sort()
      .reverse();

    if (files.length === 0) return; // Skip if no reports

    const latestDate = files[0].replace('.md', '');
    const reportDate = new Date(latestDate);
    const now = new Date();
    const diffDays = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24);

    expect(diffDays).toBeLessThan(3);
  });

  it('latest report has a Chinese translation (.zh.md)', () => {
    const enFiles = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.endsWith('.md') && !f.includes('.zh.'))
      .sort()
      .reverse();

    if (enFiles.length === 0) return;

    const latestDate = enFiles[0].replace('.md', '');
    const zhFile = `${latestDate}.zh.md`;
    expect(fs.existsSync(path.join(REPORTS_DIR, zhFile))).toBe(true);
  });

  it('Chinese report is non-empty and contains Chinese characters', () => {
    const zhFiles = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.includes('.zh.md'))
      .sort()
      .reverse();

    if (zhFiles.length === 0) return;

    const content = fs.readFileSync(path.join(REPORTS_DIR, zhFiles[0]), 'utf-8');
    expect(content.length).toBeGreaterThan(100);
    // Check for Chinese characters
    const chineseChars = content.match(/[\u4e00-\u9fff]/g) || [];
    expect(chineseChars.length).toBeGreaterThan(50);
  });
});

describe('Data consistency', () => {
  it('prediction count matches across files', () => {
    const predictions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'predictions.json'), 'utf-8'));

    // prediction_history should reference same prediction IDs
    const historyPath = path.join(DATA_DIR, 'prediction_history.json');
    if (fs.existsSync(historyPath)) {
      const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      if (Array.isArray(history) && history.length > 0) {
        const latestSnapshot = history[history.length - 1];
        if (latestSnapshot.predictions) {
          // predictions can be a dict {id: data} or array [{id, ...}]
          const preds = latestSnapshot.predictions;
          const historyIds = new Set(
            Array.isArray(preds)
              ? preds.map((p: any) => p.id)
              : Object.keys(preds).map(Number)
          );
          // At minimum, the original 50 predictions should be in history
          const originalIds = predictions.filter((p: any) => p.id <= 50).map((p: any) => p.id);
          for (const id of originalIds) {
            expect(historyIds.has(id)).toBe(true);
          }
        }
      }
    }
  });

  it('source count claim is consistent (17+)', () => {
    // Check that the about page and index page both say 17+
    const distDir = path.resolve(__dirname, '..', 'dist');
    if (!fs.existsSync(distDir)) return; // Skip if not built

    const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('17+');
    expect(indexHtml).not.toMatch(/\b15\+?\s*source/i);
  });
});
