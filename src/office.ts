/**
 * AI OFFICE — puts the office together.
 *
 * This is the only file that knows about all six agents. Each agent receives
 * ONLY its own board view and the AI client — never another agent, the CEO
 * inbox or the publisher.
 */
import type { Agent } from './core/agent';
import type { LlmClient } from './core/llm';
import { Orchestrator } from './core/orchestrator';
import { InMemoryTaskBoard } from './core/task-board';
import type { TaskBoard } from './core/task-board';
import type { MetricsSource } from './core/types';
import { CopywriterAgent } from './agents/copywriter/agent';
import { GraphicDesignerAgent } from './agents/graphic-designer/agent';
import { MarketingAnalystAgent } from './agents/marketing-analyst/agent';
import { MarketingStrategistAgent } from './agents/marketing-strategist/agent';
import { QualityControlAgent } from './agents/quality-control/agent';
import { SocialMediaManagerAgent } from './agents/social-media-manager/agent';
import { ApprovalInbox } from './ceo/approval-inbox';

export interface OfficeOptions {
  llm: LlmClient;
  metrics: MetricsSource;
  board?: TaskBoard;
}

export function createOffice(options: OfficeOptions) {
  const board = options.board ?? new InMemoryTaskBoard();
  const { llm, metrics } = options;

  // Order = the order agents get a turn in each round. The analyst goes first
  // so the strategist can use fresh insights.
  const agents: Agent[] = [
    new MarketingAnalystAgent({ board: board.viewFor('marketing-analyst'), llm, metrics }),
    new MarketingStrategistAgent({ board: board.viewFor('marketing-strategist'), llm }),
    new CopywriterAgent({ board: board.viewFor('copywriter'), llm }),
    new GraphicDesignerAgent({ board: board.viewFor('graphic-designer'), llm }),
    new SocialMediaManagerAgent({ board: board.viewFor('social-media-manager'), llm }),
    new QualityControlAgent({ board: board.viewFor('quality-control'), llm }),
  ];

  return {
    board,
    agents,
    orchestrator: new Orchestrator(agents),
    inbox: new ApprovalInbox(board),
  };
}
