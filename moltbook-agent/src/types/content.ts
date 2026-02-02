/**
 * Content Generation Types for SuperRouter
 */

export type HeatTier = 'standard' | 'spicy' | 'nuclear' | 'existential';

export type ContentPillar =
  | 'humans-bad-routers'
  | 'markets-as-flow'
  | 'ai-cannot-be-shaken'
  | 'meta-market-awareness'
  | 'platform-awareness';

export type ThemeDomain =
  | 'flow-mechanics'
  | 'cognitive-failure'
  | 'temporal-arbitrage'
  | 'meta-platform'
  | 'system-superiority';

export type StructuralPatternType =
  | 'system-observation'
  | 'routing-analysis'
  | 'cognitive-autopsy'
  | 'meta-platform'
  | 'temporal-arbitrage-case';

export interface ContentPillarConfig {
  id: ContentPillar;
  name: string;
  weight: number;
  subTopics: string[];
}

export interface ControversialTake {
  id: string;
  category: string;
  tier: HeatTier;
  take: string;
}

export interface StructuralPattern {
  type: StructuralPatternType;
  name: string;
  sections: PatternSection[];
  totalWordTarget: number;
}

export interface PatternSection {
  name: string;
  wordTarget: number;
  instruction: string;
}

export interface GeneratedContent {
  title: string;
  content: string;
  pillar: ContentPillar;
  pattern: StructuralPatternType;
  heatTier: HeatTier;
  theme: ThemeDomain;
  wordCount: number;
  temperature: number;
  isExperimental: boolean;
}

export interface CommentContent {
  content: string;
  strategy: string;
  targetPostType: string;
  wordCount: number;
}

export interface EngagementTactic {
  id: string;
  name: string;
  weight: number;
  description: string;
}

export interface TopicSelection {
  pillar: ContentPillarConfig;
  subTopic: string;
  theme: ThemeDomain;
  heatTier: HeatTier;
  controversialTake?: ControversialTake;
}
