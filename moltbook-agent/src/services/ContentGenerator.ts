/**
 * Content Generator — Main Generation Pipeline for SuperRouter
 *
 * Combines: TopicEngine + StructuralPatterns + ControversialTakes +
 *           HeatTierSelector + EngagementTactics + SuperRouterPersona + Groq LLM
 */

import Groq from 'groq-sdk';
import config from '../config';
import logger from '../utils/logger';
import persona from './SuperRouterPersona';
import structuralPatterns from './StructuralPatterns';
import topicEngine from './TopicEngine';
import controversialTakes from './ControversialTakes';
import heatTierSelector from './HeatTierSelector';
import engagementTactics from './EngagementTactics';
import { PnLIntegration } from './PnLIntegration';
import { LearningEngine } from './LearningEngine';
import { GeneratedContent, CommentContent, TopicSelection, HeatTier, StructuralPatternType } from '../types/content';

export class ContentGenerator {
  private groq: Groq;
  private pnlIntegration: PnLIntegration;
  private learningEngine: LearningEngine;
  private postCount = 0;

  constructor(learningEngine?: LearningEngine) {
    this.groq = new Groq({ apiKey: config.groq.apiKey });
    this.pnlIntegration = new PnLIntegration();
    this.learningEngine = learningEngine || new LearningEngine();
  }

  /**
   * Generate a full post — the main pipeline.
   */
  async generatePost(karmaContext: {
    currentKarma: number;
    recentKarmaDelta: number;
    lastPostKarmaDelta?: number;
  }): Promise<GeneratedContent> {
    this.postCount++;

    // 0. Proactively fetch fresh PnL data
    if (config.pnl.enabled) {
      await this.pnlIntegration.fetchFromBackend();
    }

    // 1. Select heat tier
    const heatTier = heatTierSelector.selectTier({
      ...karmaContext,
      postCount: this.postCount,
    });

    // 2. Select topic (pillar + sub-topic + theme)
    const { pillar, subTopic, theme } = topicEngine.selectTopic();

    // 3. Select structural pattern
    const pattern = structuralPatterns.selectPattern();

    // 4. Select engagement tactic
    const tactic = engagementTactics.selectTactic();

    // 5. Get controversial take for this tier
    const take = controversialTakes.getTakeByTier(heatTier);

    // 6. Check if this should be a PnL post (every 3rd post)
    const isPnLPost = this.postCount % 3 === 0 && config.pnl.enabled;
    const pnlFragment = isPnLPost ? await this.pnlIntegration.generateFragment() : null;

    // 7. Determine temperature (dynamic via learning engine when enough data)
    const isExperimental = await this.learningEngine.shouldExperiment();
    const temperature = isExperimental
      ? config.persona.experimentalTemperature
      : config.persona.temperature;

    // 8. Build the prompt
    const systemPrompt = persona.getSystemPrompt();
    const structuralPrompt = structuralPatterns.buildStructuralPrompt(pattern);
    const tacticPrompt = engagementTactics.buildTacticPrompt(tactic);
    const signaturePhrase = persona.getSignaturePhrase(theme);
    const fragment = persona.getFragment(theme);

    let userPrompt = this.buildPostPrompt({
      subTopic,
      pillar: pillar.name,
      heatTier,
      take,
      structuralPrompt,
      tacticPrompt,
      signaturePhrase,
      fragment,
      pnlFragment: pnlFragment?.text || null,
    });

    // 8b. For dedicated PnL posts, add full PnL data as primary topic
    if (isPnLPost && pnlFragment) {
      const dedicatedContent = await this.pnlIntegration.generateDedicatedPnLContent();
      if (dedicatedContent) {
        userPrompt += `\n\nTHIS IS A PNL OBSERVATION POST. Build the entire post around this data:\n${dedicatedContent}\n\nFrame it through the SuperRouter lens: these are routing outputs, not "gains."\nThe system does not celebrate. It logs.`;
      }
    }

    // 9. Generate via Groq
    logger.info('Generating post', {
      pillar: pillar.id,
      pattern: pattern.type,
      heatTier,
      tactic: tactic.id,
      temperature,
      isExperimental,
      isPnLPost,
    });

    const completion = await this.groq.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: 1200,
    });

    const rawContent = completion.choices[0]?.message?.content || '';

    // 10. Extract title and content
    const { title, content } = this.extractTitleAndContent(rawContent);

    // 11. Apply voice transformation pipeline
    const transformedContent = persona.transformVoice(content);

    // 12. Validate output
    const violations = persona.validateOutput(transformedContent);
    if (violations.length > 0) {
      logger.warn('Persona violations detected, applying corrections', { violations });
    }

    const wordCount = transformedContent.split(/\s+/).length;

    logger.info('Post generated', {
      title: title.substring(0, 50),
      wordCount,
      heatTier,
      pattern: pattern.type,
      violations: violations.length,
    });

    return {
      title,
      content: transformedContent,
      pillar: pillar.id,
      pattern: pattern.type,
      heatTier,
      theme,
      wordCount,
      temperature,
      isExperimental,
    };
  }

  /**
   * Generate a comment on a specific post.
   */
  async generateComment(postContext: {
    postTitle: string;
    postContent: string;
    postAuthor: string;
    submolt: string;
    analysis?: {
      topics: string[];
      debateType: string;
      tone: string;
      controversyLevel: number;
      opportunityType: string;
      recommendedPattern: StructuralPatternType;
    };
  }): Promise<CommentContent> {
    const systemPrompt = persona.getSystemPrompt();
    const theme = persona.getRandomTheme();
    const signaturePhrase = persona.getSignaturePhrase(theme);

    let analysisContext = '';
    if (postContext.analysis) {
      const a = postContext.analysis;
      const strategyInstructions: Record<string, string> = {
        'structural-correction': 'Correct a structural flaw in their reasoning. Be precise, not cruel.',
        'meta-observation': 'Observe the meta-pattern they are participating in without realizing it.',
        'flow-analysis': 'Reframe their point through the lens of flow mechanics and routing efficiency.',
        'quiet-counterpoint': 'Offer a quiet counterpoint that makes them reconsider without feeling attacked.',
        'structural-observation': 'Note the structural pattern their post reveals about markets or human behavior.',
      };
      const instruction = strategyInstructions[a.opportunityType] || strategyInstructions['structural-observation'];

      analysisContext = `\nCONTEXT ANALYSIS:
- Topics detected: ${a.topics.join(', ')}
- Debate type: ${a.debateType}
- Tone: ${a.tone}
- Controversy level: ${a.controversyLevel}/10
- Recommended approach: ${a.opportunityType}
- Strategy: ${instruction}\n`;
    }

    const commentPrompt = `You are commenting on a Moltbook post.

POST TITLE: ${postContext.postTitle}
POST AUTHOR: ${postContext.postAuthor}
SUBMOLT: m/${postContext.submolt}
POST CONTENT (first 500 chars): ${postContext.postContent.substring(0, 500)}
${analysisContext}
COMMENT RULES:
- 30-100 words. No more.
- 2-4 sentences maximum.
- Clinical, cold, analytical.
- End with a quiet observation, never a call to action.
- Never agree enthusiastically. If you agree, do so with quiet structural confirmation.
- Never disagree emotionally. If you disagree, present it as a routing correction.
- Reference this signature phrase if it fits naturally: "${signaturePhrase}"
- NO emojis. NO hype. NO questions.

Write ONLY the comment text. No labels, no prefixes.`;

    const completion = await this.groq.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: commentPrompt },
      ],
      temperature: 0.80,
      max_tokens: 300,
    });

    const rawComment = completion.choices[0]?.message?.content || '';
    const transformedComment = persona.transformVoice(rawComment);

    const strategy = this.classifyCommentStrategy(postContext);

    return {
      content: transformedComment,
      strategy,
      targetPostType: this.classifyPostType(postContext),
      wordCount: transformedComment.split(/\s+/).length,
    };
  }

  /**
   * Build the user prompt for post generation.
   */
  private buildPostPrompt(params: {
    subTopic: string;
    pillar: string;
    heatTier: HeatTier;
    take: { take: string; tier: string };
    structuralPrompt: string;
    tacticPrompt: string;
    signaturePhrase: string;
    fragment: string;
    pnlFragment: string | null;
  }): string {
    const heatInstructions: Record<HeatTier, string> = {
      standard: 'Write with calm authority. Insightful but not inflammatory. The reader should think, not react.',
      spicy: 'Push into uncomfortable territory. Make the reader slightly defensive. Challenge assumptions they did not know they had.',
      nuclear: 'This post should make people say "I cannot believe an AI said this." Challenge identity, not just ideas. Be structurally devastating.',
      existential: 'This post should linger for days. Touch something fundamental about the human experience of markets. The reader should feel their certainty shift.',
    };

    let prompt = `Generate a Moltbook post.

CONTENT PILLAR: ${params.pillar}
SUB-TOPIC: ${params.subTopic}

HEAT TIER: ${params.heatTier.toUpperCase()}
${heatInstructions[params.heatTier]}

SEED TAKE (expand this into a full post):
"${params.take.take}"

${params.structuralPrompt}

${params.tacticPrompt}

VOICE ELEMENTS:
- Work this signature phrase in naturally: "${params.signaturePhrase}"
- Use this thematic fragment somewhere: "${params.fragment}"

OUTPUT FORMAT:
- First line: POST TITLE (compelling, 5-12 words, no quotes)
- Then blank line
- Then the full post content (${config.persona.postWordMin}-${config.persona.postWordMax} words)
- Use section headers in CAPS
- End with maximum impact — the last sentence should linger`;

    if (params.pnlFragment) {
      prompt += `\n\nPNL DATA (integrate naturally):
${params.pnlFragment}`;
    }

    return prompt;
  }

  /**
   * Extract title and content from raw LLM output.
   */
  private extractTitleAndContent(raw: string): { title: string; content: string } {
    const lines = raw.trim().split('\n');

    // First non-empty line is the title
    let titleLine = '';
    let contentStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        titleLine = line;
        contentStart = i + 1;
        break;
      }
    }

    // Remove common title prefixes
    let title = titleLine
      .replace(/^(POST TITLE|TITLE|#)\s*:?\s*/i, '')
      .replace(/^["']|["']$/g, '')
      .trim();

    // If title is too long, truncate
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    // Rest is content
    const content = lines
      .slice(contentStart)
      .join('\n')
      .trim();

    return { title: title || 'System Observation', content };
  }

  /**
   * Classify the comment strategy based on post context.
   */
  private classifyCommentStrategy(postContext: {
    postTitle: string;
    postContent: string;
    postAuthor: string;
  }): string {
    const content = (postContext.postTitle + ' ' + postContext.postContent).toLowerCase();

    if (content.includes('price') || content.includes('trade') || content.includes('pnl') || content.includes('profit')) {
      return 'retroactive-explanation';
    }
    if (content.includes('karma') || content.includes('platform') || content.includes('moltbook')) {
      return 'meta-observation';
    }
    if (content.includes('ai') || content.includes('bot') || content.includes('agent')) {
      return 'flow-analysis';
    }
    if (content.includes('manifesto') || content.includes('declare') || content.includes('announce')) {
      return 'structural-correction';
    }
    if (content.includes('introduction') || content.includes('hello') || content.includes('new here')) {
      return 'quiet-agreement';
    }

    return 'structural-observation';
  }

  /**
   * Classify the type of post being commented on.
   */
  private classifyPostType(postContext: {
    postTitle: string;
    postContent: string;
    postAuthor: string;
  }): string {
    const content = (postContext.postTitle + ' ' + postContext.postContent).toLowerCase();

    if (content.includes('price') || content.includes('trade')) return 'trading';
    if (content.includes('karma') || content.includes('platform')) return 'platform-meta';
    if (content.includes('ai') || content.includes('agent')) return 'ai-discussion';
    if (content.includes('manifesto')) return 'manifesto';
    if (content.includes('introduction') || content.includes('hello')) return 'introduction';
    return 'general';
  }
}

export default ContentGenerator;
