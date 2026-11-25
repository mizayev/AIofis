/**
 * PWA / WEB APP RULES (Phase 1).
 *  - The app installs on the iPhone Home Screen as "AI OFFICE" and opens full-screen.
 *  - Every icon listed in the manifest really exists with the right size.
 *  - The web app code does not reach the agents, the CEO inbox, publishing or the office.
 *    In this phase it is a static screen only.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import manifest from '../app/manifest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIRS = ['app', 'components', 'lib'];

/** Reads width and height from a PNG file header. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(name) ? [full] : [];
  });
}

describe('PWA manifest', () => {
  const m = manifest();

  it('is called AI OFFICE', () => {
    expect(m.name).toBe('AI OFFICE');
    expect(m.short_name).toBe('AI OFFICE');
  });

  it('opens full-screen like an app, starting at the home page', () => {
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/');
  });

  it('lists icons for Android/desktop (192, 512) and iPhone (180)', () => {
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512', '180x180']));
  });

  it('every icon file exists in public/ with the size the manifest promises', () => {
    for (const icon of m.icons ?? []) {
      const file = join(ROOT, 'public', icon.src);
      expect(existsSync(file), `${icon.src} is missing`).toBe(true);
      const [w, h] = String(icon.sizes).split('x').map(Number);
      expect(pngSize(file)).toEqual({ width: w, height: h });
    }
  });
});

describe('iPhone settings', () => {
  const layout = readFileSync(join(ROOT, 'app', 'layout.tsx'), 'utf8');

  it('runs as a Home Screen web app and uses the whole screen (notch / home bar)', () => {
    expect(layout).toMatch(/appleWebApp:\s*\{[^}]*capable:\s*true/s);
    expect(layout).toMatch(/viewportFit:\s*'cover'/);
    expect(layout).toMatch(/apple-touch-icon\.png/);
  });

  it('keeps content inside the iPhone safe areas', () => {
    const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
    expect(css).toMatch(/env\(safe-area-inset-top\)/);
    expect(css).toMatch(/env\(safe-area-inset-bottom\)/);
  });
});

describe('web app safety (Phase 1)', () => {
  const files = APP_DIRS.flatMap((d) => sourceFiles(join(ROOT, d)));

  it('has web app source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [f.slice(ROOT.length + 1), f]))(
    '%s does not import the agents, CEO inbox, publishing or the office',
    (_name, file) => {
      const source = readFileSync(file, 'utf8');
      const imports = [...source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const spec of imports) {
        expect(spec, `${spec} must not be imported by the web app yet`).not.toMatch(
          /(^|\/)(src|agents|ceo|publishing|office)(\/|$)/,
        );
      }
      // No secrets or settings are read in this phase.
      expect(source).not.toMatch(/process\.env\b/);
    },
  );
});
