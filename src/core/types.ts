/**
 * AI OFFICE — shared contract.
 *
 * Everything that travels across the task board is defined here.
 * Agents may import this file. Agents must NEVER import each other.
 */

export const AGENT_IDS = [
  'marketing-strategist',
  'copywriter',
  'graphic-designer',
  'social-media-manager',
  'marketing-analyst',
  'quality-control',
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

/** Who is acting on the board. "ceo" is the only human and the only approver. */
export type Actor = AgentId | 'ceo';

export const TASK_STATUSES = [
  'NEW',
  'STRATEGY_READY',
  'COPY_READY',
  'DESIGN_READY',
  'PACKAGE_READY',
  'QC_PASSED',
  'QC_REJECTED',
  'AWAITING_CEO',
  'CEO_APPROVED',
  'CEO_REJECTED',
  'PUBLISHED', // exists for the future, but no one can reach it in this version
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const INSTAGRAM_FORMATS = ['post', 'story', 'reel'] as const;
export type InstagramFormat = (typeof INSTAGRAM_FORMATS)[number];

/** What the CEO asks for. Only the CEO can create a brief. */
export interface Brief {
  title: string;
  goal: string;
  formats: InstagramFormat[];
  brandNotes?: string;
}

/** Written by: marketing-strategist */
export interface StrategySection {
  targetAudience: string;
  goals: string[];
  keyMessages: string[];
  contentPlan: string[];
}

/** Written by: copywriter */
export interface CopySection {
  headline: string;
  hook: string;
  caption: string;
  storiesText: string[];
  reelScript: string;
  hashtags: string[];
  callToAction: string;
}

export interface DesignSpec {
  format: InstagramFormat;
  width: number;
  height: number;
  layout: string;
  colors: string[];
  textOverlay: string;
  imagePrompt: string;
}

/** Written by: graphic-designer */
export interface DesignSection {
  designs: DesignSpec[];
}

/** Written by: social-media-manager */
export interface InstagramSection {
  caption: string;
  formats: InstagramFormat[];
  suggestedPostingTimes: string[];
  /** Empty array = every publishing requirement passed. */
  requirementIssues: string[];
}

/** Written by: quality-control */
export interface QcSection {
  passed: boolean;
  issues: string[];
  checkedAt: string;
}

/** Written by: ceo (only) */
export interface CeoDecisionSection {
  decision: 'approved' | 'rejected';
  note: string;
  decidedAt: string;
}

export interface ContentPackage {
  strategy?: StrategySection;
  copy?: CopySection;
  design?: DesignSection;
  instagram?: InstagramSection;
  qc?: QcSection;
  ceoDecision?: CeoDecisionSection;
}

export type SectionName = keyof ContentPackage;

export interface HistoryEntry {
  at: string;
  actor: Actor;
  action: 'created' | 'wrote' | 'moved';
  from?: TaskStatus;
  to?: TaskStatus;
  section?: SectionName;
  note?: string;
}

export interface Task {
  id: string;
  brief: Brief;
  status: TaskStatus;
  package: ContentPackage;
  reworkCount: number;
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Written by: marketing-analyst. Read by: marketing-strategist. */
export interface Insight {
  id: string;
  author: 'marketing-analyst';
  summary: string;
  recommendations: string[];
  createdAt: string;
}

export interface PostMetrics {
  postId: string;
  format: InstagramFormat;
  publishedAt: string;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
}

/** Where the analyst gets Instagram numbers from. Fake in this version. */
export interface MetricsSource {
  fetchRecent(): Promise<PostMetrics[]>;
}
