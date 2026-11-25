// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules', 'dist', 'coverage', '.next', 'out', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/agents/**/*.ts'],
    ignores: ['src/agents/**/*.test.ts'],
    rules: {
      // Agents must stay independent. tests/architecture.test.ts enforces the full rule set.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['../*/agent', '../*/agent.*'], message: 'Agents must never import another agent. Use the task board.' },
            { group: ['**/ceo/**', '**/publishing/**', '**/office'], message: 'Agents cannot reach the CEO inbox, publishing or the office.' },
            { group: ['**/core/task-board'], message: 'Agents use their BoardView from core/agent, not the board itself.' },
          ],
        },
      ],
    },
  },
);
