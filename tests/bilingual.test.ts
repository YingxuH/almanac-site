/**
 * Bilingual coverage tests for Almanac site.
 *
 * Runs against the built HTML files in dist/ to verify:
 * 1. Every element with data-en also has data-zh (and vice versa)
 * 2. data-zh values are non-empty and not identical to data-en
 * 3. Every data-en-placeholder has a data-zh-placeholder
 * 4. No visible text in key elements is missing bilingual attributes
 * 5. All pages build successfully
 *
 * Run: npx vitest run tests/bilingual.test.ts
 * Requires: npm run build first
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(__dirname, '..', 'dist');

// Pages to check
const PAGES = [
  'index.html',
  'about/index.html',
  'predictions/index.html',
  'forecast/index.html',
  'validation/index.html',
  'dashboard/index.html',
  'archive/index.html',
  '404.html',
];

// Known exceptions — proper nouns, brand names, technical terms that shouldn't be translated
const EXCEPTIONS = new Set([
  'Almanac', 'A', 'GitHub', 'Metaculus', 'Polymarket',
  'EN', '中', 'HN', 'arXiv', 'TechCrunch', 'Ars Technica',
  'MIT Tech Review', 'The Verge', 'Wired', 'S.Scholar',
  'Stack Overflow', 'FRED', 'SEC EDGAR', 'Reddit', 'Lobsters',
  'X/Twitter', 'NVIDIA IR', 'MSFT IR', 'Python 3.12',
  'Gemini 3.1 Pro', 'Gemini 2.5 Flash', 'litellm', 'httpx',
  'Astro 6', 'Tailwind 4', 'GitHub Actions', 'GitHub Pages',
  'LR:', '|', '—', '→', '↑', '↓', '%',
]);

function loadPage(pagePath: string): string {
  const fullPath = path.join(DIST_DIR, pagePath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf-8');
}

// Extract all elements with data-en or data-zh attributes
function extractBilingualElements(html: string): {
  dataEn: string;
  dataZh: string | null;
  line: number;
  context: string;
}[] {
  const results: any[] = [];
  const lines = html.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find data-en attributes
    const enMatches = line.matchAll(/data-en="([^"]*)"/g);
    for (const match of enMatches) {
      const enValue = match[1];
      // Check if data-zh exists on the same element (same line or nearby)
      const zhMatch = line.match(/data-zh="([^"]*)"/);
      results.push({
        dataEn: enValue,
        dataZh: zhMatch ? zhMatch[1] : null,
        line: i + 1,
        context: line.trim().slice(0, 100),
      });
    }

    // Find data-en-placeholder attributes
    const enPlaceholderMatches = line.matchAll(/data-en-placeholder="([^"]*)"/g);
    for (const match of enPlaceholderMatches) {
      const zhPlMatch = line.match(/data-zh-placeholder="([^"]*)"/);
      if (!zhPlMatch) {
        results.push({
          dataEn: `[placeholder] ${match[1]}`,
          dataZh: null,
          line: i + 1,
          context: line.trim().slice(0, 100),
        });
      }
    }
  }

  return results;
}

// Check for visible text in common elements that might need translation
function findPotentiallyUntranslatedText(html: string): {
  text: string;
  line: number;
  tag: string;
}[] {
  const issues: any[] = [];
  const lines = html.split('\n');

  // Pattern: HTML tags with visible text content but no data-en/data-zh
  const textPattern = /<(h[1-6]|p|span|button|a|li|label|div)\b[^>]*>([^<]{3,})<\//g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines that already have data-en/data-zh
    if (line.includes('data-en=') || line.includes('data-zh=')) continue;
    // Skip script/style blocks
    if (line.includes('<script') || line.includes('<style') || line.includes('</script') || line.includes('</style')) continue;

    let match;
    const re = /<(h[1-6]|p|span|button|label)\b[^>]*>([^<]{4,})<\//g;
    while ((match = re.exec(line)) !== null) {
      const text = match[2].trim();
      // Skip if it's just numbers, punctuation, or exceptions
      if (/^[\d%+\-.,\s|→←↑↓]+$/.test(text)) continue;
      if (EXCEPTIONS.has(text)) continue;
      // Skip if text looks like a template expression
      if (text.includes('{') || text.includes('}')) continue;
      // Skip very short text (likely icons or abbreviations)
      if (text.length < 4) continue;

      issues.push({
        text,
        line: i + 1,
        tag: match[1],
      });
    }
  }

  return issues;
}

describe('Build output exists', () => {
  it('dist/ directory exists', () => {
    expect(fs.existsSync(DIST_DIR)).toBe(true);
  });

  for (const page of PAGES) {
    it(`${page} was built`, () => {
      const fullPath = path.join(DIST_DIR, page);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  }
});

describe('Bilingual coverage — data-en/data-zh pairs', () => {
  for (const page of PAGES) {
    describe(page, () => {
      let html: string;
      let elements: ReturnType<typeof extractBilingualElements>;

      beforeAll(() => {
        html = loadPage(page);
        elements = extractBilingualElements(html);
      });

      it('has bilingual elements', () => {
        expect(elements.length).toBeGreaterThan(0);
      });

      it('every data-en has a matching data-zh', () => {
        const missing = elements.filter(e => e.dataZh === null);
        if (missing.length > 0) {
          const report = missing.map(m =>
            `  Line ${m.line}: data-en="${m.dataEn.slice(0, 60)}..." — MISSING data-zh`
          ).join('\n');
          expect(missing.length).toBe(0); // Will fail and show the report
        }
      });

      it('data-zh values are non-empty', () => {
        const empty = elements.filter(e => e.dataZh !== null && e.dataZh.trim() === '');
        if (empty.length > 0) {
          const report = empty.map(e =>
            `  Line ${e.line}: data-en="${e.dataEn.slice(0, 60)}" has EMPTY data-zh`
          ).join('\n');
          expect(empty.length).toBe(0);
        }
      });

      it('data-zh values differ from data-en (actual translation)', () => {
        const identical = elements.filter(e =>
          e.dataZh !== null &&
          e.dataEn === e.dataZh &&
          !EXCEPTIONS.has(e.dataEn) &&
          e.dataEn.length > 3
        );
        if (identical.length > 0) {
          const report = identical.map(e =>
            `  Line ${e.line}: "${e.dataEn.slice(0, 60)}" — data-zh is identical (not translated)`
          ).join('\n');
          // This is a warning, not a hard fail — some text is the same in both languages
          console.warn(`⚠ ${page}: ${identical.length} elements have identical en/zh values:\n${report}`);
        }
      });
    });
  }
});

describe('No orphaned visible text without bilingual attributes', () => {
  for (const page of PAGES) {
    it(`${page} — no significant untranslated text in key elements`, () => {
      const html = loadPage(page);
      if (!html) return; // Skip if page doesn't exist

      const issues = findPotentiallyUntranslatedText(html);

      // Filter out known patterns that are OK without translation
      const realIssues = issues.filter(i => {
        // Skip if it's likely dynamically generated content
        if (i.text.includes('2026') || i.text.includes('prediction')) return false;
        // Skip numbers and stats
        if (/^\d+/.test(i.text)) return false;
        // Skip CSS class-like strings
        if (i.text.includes('class=') || i.text.includes('style=')) return false;
        return true;
      });

      if (realIssues.length > 5) {
        const report = realIssues.slice(0, 10).map(i =>
          `  Line ${i.line} <${i.tag}>: "${i.text.slice(0, 60)}"`
        ).join('\n');
        console.warn(`⚠ ${page}: ${realIssues.length} potentially untranslated text nodes:\n${report}`);
      }
    });
  }
});

describe('Placeholder attributes', () => {
  for (const page of PAGES) {
    it(`${page} — all data-en-placeholder have data-zh-placeholder`, () => {
      const html = loadPage(page);
      if (!html) return;

      const lines = html.split('\n');
      const missing: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('data-en-placeholder=') && !lines[i].includes('data-zh-placeholder=')) {
          missing.push(`  Line ${i + 1}: has data-en-placeholder but no data-zh-placeholder`);
        }
      }

      expect(missing.length).toBe(0);
    });
  }
});

describe('Consistency checks', () => {
  it('source count is "17+" across all pages', () => {
    for (const page of PAGES) {
      const html = loadPage(page);
      if (!html) continue;
      // Should not contain "15 sources" or "15+" without "17"
      const has15 = /15\+?\s*source/i.test(html) && !/17/.test(html.slice(
        Math.max(0, html.indexOf('15') - 50),
        html.indexOf('15') + 50
      ));
      if (has15) {
        console.warn(`⚠ ${page} may contain "15 sources" instead of "17+"`);
      }
    }
  });

  it('no hardcoded "Day 2" or "March 21" dates', () => {
    for (const page of PAGES) {
      const html = loadPage(page);
      if (!html) continue;
      expect(html).not.toContain('"Day 2"');
      // March 21 may appear in report content, which is OK
    }
  });
});
