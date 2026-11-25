/**
 * ARCHITECTURE RULES — these tests must never be deleted or weakened.
 *  - Exactly six agents, each in its own folder with agent.ts, instructions.md, agent.test.ts.
 *  - An agent never imports another agent, the CEO inbox, the publisher or the office.
 *  - Agent code only uses the allowed parts of src/core.
 *  - Agent code never mentions CEO-only statuses or PUBLISHED.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AGENT_IDS } from '../src/core/types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AGENTS_DIR = join(ROOT, 'src', 'agents');

const agentFolders = readdirSync(AGENTS_DIR).filter((name) => statSync(join(AGENTS_DIR, name)).isDirectory());

/** Core modules agent CODE may use. */
const ALLOWED_CORE_FOR_AGENT_CODE = new Set([
  'src/core/agent',
  'src/core/types',
  'src/core/llm',
  'src/core/json',
  'src/core/instagram',
  'src/core/permissions',
]);
/** Agent TESTS may additionally use the board and test helpers. */
const ALLOWED_EXTRA_FOR_AGENT_TESTS = new Set(['src/core/task-board', 'src/dev/fixtures', 'src/dev/testing']);

// Matches: import x from '…' | import type { x } from '…' | import '…' | export { x } from '…' | export * from '…' | import('…')
const IMPORT_RE =
  /(?:^|\n)\s*import\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|(?:^|\n)\s*export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s*from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(IMPORT_RE)].map((m) => m[1] ?? m[2] ?? m[3] ?? '').filter(Boolean);
}

/** Turns "../../core/types" (seen from a file) into "src/core/types". */
function toRepoPath(fromFile: string, specifier: string): string {
  return relative(ROOT, resolve(dirname(fromFile), specifier)).split('\\').join('/').replace(/\.(ts|js)$/, '');
}

function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? filesIn(full) : full.endsWith('.ts') ? [full] : [];
  });
}

describe('AI OFFICE architecture', () => {
  it('has exactly the six agents, no more, no less', () => {
    expect([...agentFolders].sort()).toEqual([...AGENT_IDS].sort());
  });

  for (const agent of AGENT_IDS) {
    describe(agent, () => {
      const folder = join(AGENTS_DIR, agent);

      it('has its own module, instructions and tests', () => {
        for (const file of ['agent.ts', 'instructions.md', 'agent.test.ts']) {
          expect(existsSync(join(folder, file))).toBe(true);
        }
        expect(readFileSync(join(folder, 'instructions.md'), 'utf8').trim().length).toBeGreaterThan(200);
      });

      it('imports only what it is allowed to', () => {
        for (const file of filesIn(folder)) {
          const isTest = file.endsWith('.test.ts');
          for (const spec of importsOf(file)) {
            if (!spec.startsWith('.')) {
              // Bare imports: Node built-ins for code; vitest too for tests.
              const ok = spec.startsWith('node:') || (isTest && spec === 'vitest');
              expect(ok, `${relative(ROOT, file)} imports "${spec}"`).toBe(true);
              continue;
            }
            const target = toRepoPath(file, spec);
            const ownFolder = `src/agents/${agent}/`;
            const allowed =
              target.startsWith(ownFolder) ||
              ALLOWED_CORE_FOR_AGENT_CODE.has(target) ||
              (isTest && ALLOWED_EXTRA_FOR_AGENT_TESTS.has(target));
            expect(allowed, `${relative(ROOT, file)} must not import "${target}"`).toBe(true);
          }
        }
      });

      it('never mentions CEO-only statuses or PUBLISHED in its code', () => {
        const code = readFileSync(join(folder, 'agent.ts'), 'utf8');
        for (const forbidden of ["'CEO_APPROVED'", "'CEO_REJECTED'", "'PUBLISHED'", "'ceoDecision'"]) {
          expect(code.includes(forbidden), `${agent}/agent.ts mentions ${forbidden}`).toBe(false);
        }
      });
    });
  }

  it('the orchestrator has no board access', () => {
    const code = readFileSync(join(ROOT, 'src', 'core', 'orchestrator.ts'), 'utf8');
    expect(code.includes('task-board')).toBe(false);
  });
});
