/**
 * AI OFFICE — sample data for tests and the demo.
 * "Nur Coffee" is an invented example brand.
 * Nothing here calls a real AI or Instagram.
 */
import { FakeLlmClient } from '../core/llm';
import type { LlmRequest } from '../core/llm';
import { INSTAGRAM_LIMITS } from '../core/instagram';
import type {
  AgentId,
  Brief,
  CopySection,
  DesignSection,
  InstagramFormat,
  InstagramSection,
  MetricsSource,
  PostMetrics,
  StrategySection,
} from '../core/types';

export const SAMPLE_BRIEF: Brief = {
  title: 'Kuzgi menyu taqdimoti',
  goal: 'Yangi kuzgi menyu haqida xabar berish va hafta davomida tashriflarni oshirish',
  formats: ['post', 'story', 'reel'],
  brandNotes: 'Doʻstona, iliq va ishonchli ohang. Emoji kam. Brend ranglari: qahvarang va krem.',
};

export const SAMPLE_STRATEGY: StrategySection = {
  targetAudience: 'Toshkentdagi 20–35 yoshli talabalar va ofis xodimlari',
  goals: ['Kuzgi menyu haqida xabardorlikni oshirish', 'Hafta davomida tashriflarni 15% oshirish'],
  keyMessages: ['Kuzning iliq taʼmi', 'Birinchi stakanga 15% chegirma'],
  contentPlan: ['Dushanba: post', 'Chorshanba: story seriyasi', 'Juma: reel'],
};

export const SAMPLE_COPY: CopySection = {
  headline: 'Kuzning iliq taʼmi — yangi menyu',
  hook: 'Bu kuz qahvangiz boshqacha boʻladi',
  caption:
    'Nur Coffeeʼda kuzgi menyu boshlandi: dolchinli latte, olmali pirog va qovoqli raf. Doʻstlaringiz bilan keling va birinchi stakanga 15% chegirma oling.',
  storiesText: ['Yangi kuzgi menyu', 'Dolchinli latte — sinab koʻring', 'Birinchi stakanga −15%'],
  reelScript:
    '0–3s: bugʻlanayotgan latte yaqindan. 3–8s: barista dolchin sepadi. 8–12s: doʻstlar stol atrofida. 12–15s: logo va “Kuzgi menyu — Nur Coffee”.',
  hashtags: ['#NurCoffee', '#kuzgimenyu', '#toshkentqahva', '#latte'],
  callToAction: 'Bugun keling va kuzgi menyuni birinchi boʻlib tatib koʻring!',
};

const DESIGN_IDEAS: Record<InstagramFormat, { layout: string; colors: string[]; textOverlay: string; imagePrompt: string }> = {
  post: {
    layout: 'Markazda latte stakani, yuqorida sarlavha, pastda logo',
    colors: ['#6B4226', '#F5E6D3', '#D9822B'],
    textOverlay: 'Kuzning iliq taʼmi',
    imagePrompt: 'Warm autumn latte with cinnamon on a wooden table, soft morning light',
  },
  story: {
    layout: '3 kadrli seriya: menyu, latte, chegirma',
    colors: ['#6B4226', '#F5E6D3'],
    textOverlay: 'Birinchi stakanga −15%',
    imagePrompt: 'Vertical close-up of a barista sprinkling cinnamon on latte foam',
  },
  reel: {
    layout: '15 soniyalik vertikal video, oxirida logo',
    colors: ['#6B4226', '#D9822B'],
    textOverlay: 'Kuzgi menyu — Nur Coffee',
    imagePrompt: 'Cozy café scene with friends laughing, autumn colors',
  },
};

/** What the designer's AI is expected to return (sizes are added by the agent). */
export const SAMPLE_DESIGN_OUTPUT = {
  designs: (Object.keys(DESIGN_IDEAS) as InstagramFormat[]).map((format) => ({ format, ...DESIGN_IDEAS[format] })),
};

export function sampleDesignSection(formats: InstagramFormat[]): DesignSection {
  return {
    designs: formats.map((format) => ({
      format,
      ...INSTAGRAM_LIMITS.sizes[format],
      ...DESIGN_IDEAS[format],
    })),
  };
}

export function sampleInstagramSection(formats: InstagramFormat[]): InstagramSection {
  return {
    caption: [SAMPLE_COPY.hook, SAMPLE_COPY.caption, SAMPLE_COPY.callToAction, SAMPLE_COPY.hashtags.join(' ')].join(
      '\n\n',
    ),
    formats: [...formats],
    suggestedPostingTimes: ['Seshanba 19:00', 'Payshanba 12:30'],
    requirementIssues: [],
  };
}

export const SAMPLE_POSTING_TIMES = { suggestedPostingTimes: ['Seshanba 19:00', 'Payshanba 12:30'] };
export const SAMPLE_QC_PASS = { passed: true, issues: [] as string[] };
export const SAMPLE_QC_FAIL = { passed: false, issues: ['Captionda imlo xatosi: “boshqacha” soʻzini tekshiring'] };
export const SAMPLE_INSIGHT = {
  summary: 'Reels postlarga qaraganda 2 baravar koʻp saqlanmoqda; kechki 19:00 dagi postlar eng yaxshi qamrovga ega.',
  recommendations: ['Haftasiga kamida 2 ta reel', 'Asosiy postlarni 19:00 da joylash'],
};

export const SAMPLE_METRICS: PostMetrics[] = [
  { postId: 'p1', format: 'post', publishedAt: '2026-11-01T14:00:00Z', reach: 1200, likes: 90, comments: 8, saves: 12, shares: 4 },
  { postId: 'p2', format: 'reel', publishedAt: '2026-11-03T14:00:00Z', reach: 3400, likes: 260, comments: 21, saves: 75, shares: 30 },
  { postId: 'p3', format: 'story', publishedAt: '2026-11-04T14:00:00Z', reach: 800, likes: 0, comments: 0, saves: 0, shares: 6 },
];

export type FakeAnswer = string | ((request: LlmRequest, callNumberForThisAgent: number) => string);

/**
 * A fake AI for the whole office. Each agent gets a sensible default answer;
 * pass overrides to simulate bad output, QC rejections, etc.
 */
export function createFakeLlm(overrides: Partial<Record<AgentId, FakeAnswer>> = {}): FakeLlmClient {
  const defaults: Record<AgentId, string> = {
    'marketing-strategist': JSON.stringify(SAMPLE_STRATEGY),
    copywriter: JSON.stringify(SAMPLE_COPY),
    'graphic-designer': JSON.stringify(SAMPLE_DESIGN_OUTPUT),
    'social-media-manager': JSON.stringify(SAMPLE_POSTING_TIMES),
    'marketing-analyst': JSON.stringify(SAMPLE_INSIGHT),
    'quality-control': JSON.stringify(SAMPLE_QC_PASS),
  };
  const counts = new Map<AgentId, number>();
  return new FakeLlmClient((request) => {
    const n = counts.get(request.agent) ?? 0;
    counts.set(request.agent, n + 1);
    const override = overrides[request.agent];
    if (typeof override === 'function') return override(request, n);
    if (typeof override === 'string') return override;
    return defaults[request.agent];
  });
}

export function createFakeMetrics(posts: PostMetrics[] = SAMPLE_METRICS): MetricsSource {
  return { fetchRecent: async () => structuredClone(posts) };
}
