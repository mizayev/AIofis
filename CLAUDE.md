# AI OFFICE — instructions for Claude Code

AI OFFICE is a marketing office made of **six independent AI agents** that prepare Instagram content packages for the CEO.
The CEO builds this project from an iPhone using Claude Code cloud sessions and GitHub.

## Talking to the CEO
- Reply in **Uzbek**, in simple, non-technical language.
- Explain what you will change **before** changing it. For anything bigger than a small fix, use Plan mode and wait for approval.
- After work: summarize what changed, show test results, and push a branch / open a PR. Never push directly to `main`.

## Source of truth
1. `docs/AI OFFICE — Architecture & Build Plan.pdf` — the CEO's architecture and 13-phase build plan (Phase 0–12).
2. This file and `docs/architecture.md`.
If they conflict, stop and ask the CEO.

## NON-NEGOTIABLE RULES
These rules are enforced in code and by `tests/safety.test.ts` and `tests/architecture.test.ts`.
**Never delete, skip, weaken or work around these tests or rules — not even to make CI green.** If a task seems to require it, stop and ask the CEO.

1. **Six agents, always separate.** Never merge, combine or remove agents. Each lives in `src/agents/<agent-id>/` with its own `agent.ts`, `instructions.md` and `agent.test.ts`.
2. **No agent imports another agent**, the CEO inbox (`src/ceo`), publishing (`src/publishing`) or `src/office.ts`.
3. **Agents communicate only through the task board** (`src/core/task-board.ts`), each through its own `BoardView`.
4. **No agent can approve or publish.** Only the actor `ceo` can set `CEO_APPROVED` / `CEO_REJECTED` and write `ceoDecision`.
5. **Only the CEO creates briefs.**
6. **Publishing is disabled.** `src/publishing/publisher.ts` always throws. No transition to `PUBLISHED` exists. `PUBLISHING_ENABLED` defaults to `false`. Do not implement or enable publishing unless the CEO explicitly asks for that specific change.
7. **Content is locked after Quality Control passes it.**
8. **No secrets in the repo.** API keys go in cloud-environment network secrets or the hosting dashboard.

## The six agents
| Agent ID | Role | Reads | Writes | Moves |
|---|---|---|---|---|
| `marketing-strategist` | Strategy, audience, goals, key messages, content plan | `NEW` + insights | `strategy` | `NEW → STRATEGY_READY` |
| `copywriter` | Captions, headlines, hooks, Stories, Reel scripts, hashtags, CTAs | `STRATEGY_READY`, `QC_REJECTED` | `copy` | `→ COPY_READY` |
| `graphic-designer` | Visual design specs for posts, Stories, Reels | `COPY_READY` | `design` | `→ DESIGN_READY` |
| `social-media-manager` | Instagram package, requirement checks, posting times | `DESIGN_READY` | `instagram` | `→ PACKAGE_READY` |
| `marketing-analyst` | Performance analysis and insights | metrics | insights | — |
| `quality-control` | Quality, spelling, brand, accuracy, compliance | `PACKAGE_READY` | `qc` | `→ QC_PASSED → AWAITING_CEO` or `→ QC_REJECTED` |
| **CEO (human)** | Creates briefs, approves/rejects | `AWAITING_CEO` | `ceoDecision` | `→ CEO_APPROVED` / `CEO_REJECTED` |

The permission table lives in `src/core/permissions.ts`.

## Commands
```bash
npm install
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # Vitest — all tests must pass
npm run demo        # full pipeline with a fake AI
npm run check       # lint + typecheck + test
npm run build       # build the web app (Next.js)
npm run dev         # run the web app locally
```

## How to work on one agent
- Use the matching builder subagent in `.claude/agents/` (for example `copywriter-builder`). It must only touch that agent's folder.
- Changes to `src/core/**`, `src/ceo/**`, `src/publishing/**` or the safety/architecture tests need the CEO's explicit approval in Plan mode.

## Web app (Phase 1)
- Next.js (App Router) + Tailwind CSS + shadcn/ui, installable on iPhone as a PWA.
- Lives next to `src/`: `app/` (screens, `manifest.ts`), `components/`, `lib/`, `public/icons/`.
- Uses its own TypeScript settings in `tsconfig.app.json`. Do not change `tsconfig.json` without the CEO's approval.
- The web app must not import `src/` (agents, CEO inbox, publishing, office) until a later phase allows it. `tests/pwa.test.ts` checks this.

## Current stage
Following the PDF build plan. **Phase 1 — empty app on iPhone:** code ready; the iPhone "Add to Home Screen" check waits for the Vercel account.
The agent logic in `src/` is a head start for later phases: fake AI client, fake metrics, in-memory board. **No real AI calls, no Instagram connection, no publishing.**
Next phases, in the PDF's order (each needs CEO approval and starts only after the previous one passes): Phase 2 login (Supabase + Face ID passkey) → Phase 3 database and locks → Phase 4 screens with fake data → Phase 5 agent engine + Strategist → … → Phase 10 Instagram (dry run first) → Phase 11 Analyst → Phase 12 polish and launch.
Phase 0 items still open: Vercel account, Brand Book.
