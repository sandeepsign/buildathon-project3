import { OpenAI } from 'openai';
import { logger } from '../utils/logger';

export interface SentimentResult {
  score: number; // -1.0 to 1.0
  label: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0.0 to 1.0
  emotions: Record<string, number>;
  reasoning?: string;
}

export interface EmojiReaction {
  name: string;
  count: number;
}

export interface EmojiSentiment {
  overallScore: number;
  breakdown: Record<string, number>;
}

export class SentimentService {
  private openai: OpenAI;
  private emojiSentimentMap: Record<string, number>;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Basic emoji sentiment mapping
    this.emojiSentimentMap = {
      '😀': 0.8, '😃': 0.8, '😄': 0.9, '😁': 0.7, '😊': 0.8, '😍': 0.9,
      '🥰': 0.9, '😘': 0.7, '🤗': 0.6, '🤩': 0.8, '😎': 0.6, '🥳': 0.9,
      '👍': 0.6, '👏': 0.7, '🎉': 0.8, '✅': 0.5, '💪': 0.6, '🔥': 0.7,
      '😔': -0.6, '😞': -0.7, '😟': -0.5, '😢': -0.8, '😭': -0.9, '😤': -0.4,
      '😠': -0.7, '😡': -0.8, '🤬': -0.9, '😰': -0.6, '😨': -0.7, '😱': -0.8,
      '🤔': 0.1, '😐': 0.0, '😑': -0.1, '🙄': -0.3, '😒': -0.4, '😮‍💨': -0.2
    };
  }

  async analyzeMessage(message: string): Promise<SentimentResult> {
    try {
      // First try OpenAI GPT-4
      const gptResult = await this.callGPTAPI(message);
      if (gptResult) {
        return gptResult;
      }

      // Fallback to VADER-like analysis
      return await this.callVADER(message);
    } catch (error) {
      logger.error('Sentiment analysis failed:', error);
      return this.getDefaultSentiment();
    }
  }

  async analyzeEmoji(reactions: EmojiReaction[]): Promise<EmojiSentiment> {
    const breakdown: Record<string, number> = {};
    let totalScore = 0;
    let totalCount = 0;

    for (const reaction of reactions) {
      const sentimentScore = this.mapEmojiToSentiment(reaction.name);
      breakdown[reaction.name] = sentimentScore;
      totalScore += sentimentScore * reaction.count;
      totalCount += reaction.count;
    }

    return {
      overallScore: totalCount > 0 ? totalScore / totalCount : 0,
      breakdown
    };
  }

  async batchAnalyze(messages: string[]): Promise<SentimentResult[]> {
    const results: SentimentResult[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map(msg => this.analyzeMessage(msg));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push(this.getDefaultSentiment());
        }
      });

      // Small delay between batches
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  private async callGPTAPI(text: string): Promise<SentimentResult | null> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `You are a sentiment analysis expert. Analyze the sentiment of workplace messages. 
          Return a JSON response with:
          - score: number between -1.0 (very negative) and 1.0 (very positive)
          - label: "positive", "negative", or "neutral" 
          - confidence: confidence level 0.0 to 1.0
          - emotions: object with emotion names and scores (joy, anger, fear, sadness, etc.)
          - reasoning: brief explanation

          Focus on workplace context and consider team dynamics, stress indicators, and collaboration tone.`
        }, {
          role: 'user',
          content: text
        }],
        temperature: 0.1,
        max_tokens: 300
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) return null;

      return JSON.parse(responseText);
    } catch (error) {
      logger.warn('GPT API call failed:', error);
      return null;
    }
  }

  private async callVADER(text: string): Promise<SentimentResult> {
    // Simple rule-based sentiment analysis as fallback
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'love', 'amazing', 'perfect', 'thanks', 'happy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'frustrated', 'angry', 'stress', 'problem', 'issue'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) {
        score += 0.5;
        positiveCount++;
      } else if (negativeWords.includes(word)) {
        score -= 0.5;
        negativeCount++;
      }
    });

    // Normalize score
    const totalWords = words.length;
    score = Math.max(-1, Math.min(1, score / Math.max(1, totalWords * 0.1)));

    const label = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';
    const confidence = Math.min(0.8, (positiveCount + negativeCount) / totalWords * 2);

    return {
      score,
      label,
      confidence,
      emotions: {
        joy: positiveCount > 0 ? 0.6 : 0.1,
        anger: negativeCount > 0 ? 0.6 : 0.1,
        neutral: Math.abs(score) < 0.1 ? 0.8 : 0.2
      },
      reasoning: `VADER analysis: ${positiveCount} positive, ${negativeCount} negative words`
    };
  }

  private mapEmojiToSentiment(emoji: string): number {
    return this.emojiSentimentMap[emoji] || 0;
  }

  private getDefaultSentiment(): SentimentResult {
    return {
      score: 0,
      label: 'neutral',
      confidence: 0.1,
      emotions: { neutral: 1.0 },
      reasoning: 'Default sentiment due to analysis failure'
    };
  }
}