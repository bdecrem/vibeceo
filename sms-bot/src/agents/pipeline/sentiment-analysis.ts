/**
 * Sentiment Analysis Pipeline Step
 * Analyzes sentiment of items using keyword-based or LLM-based methods
 */

import OpenAI from 'openai';
import type { NormalizedItem, SentimentAnalysisStep } from '@vibeceo/shared-types';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Simple keyword-based sentiment analysis
const POSITIVE_KEYWORDS = [
  'excellent', 'great', 'amazing', 'wonderful', 'fantastic', 'outstanding',
  'brilliant', 'impressive', 'successful', 'breakthrough', 'innovative',
  'positive', 'good', 'better', 'best', 'improved', 'advancement', 'progress',
  'achievement', 'victory', 'win', 'growth', 'increase', 'gain', 'benefit',
];

const NEGATIVE_KEYWORDS = [
  'terrible', 'awful', 'horrible', 'bad', 'poor', 'disappointing',
  'failed', 'failure', 'problem', 'issue', 'crisis', 'disaster',
  'negative', 'worse', 'worst', 'decline', 'decrease', 'loss', 'risk',
  'threat', 'danger', 'concern', 'warning', 'error', 'bug', 'flaw',
];

/**
 * Simple keyword-based sentiment analysis
 */
function analyzeSimpleSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
  const lowerText = text.toLowerCase();

  let positiveCount = 0;
  let negativeCount = 0;

  POSITIVE_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) positiveCount += matches.length;
  });

  NEGATIVE_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) negativeCount += matches.length;
  });

  const totalCount = positiveCount + negativeCount;

  if (totalCount === 0) {
    return { sentiment: 'neutral', score: 0.5 };
  }

  const sentimentScore = positiveCount / totalCount;

  let sentiment: 'positive' | 'negative' | 'neutral';
  if (sentimentScore > 0.6) {
    sentiment = 'positive';
  } else if (sentimentScore < 0.4) {
    sentiment = 'negative';
  } else {
    sentiment = 'neutral';
  }

  return { sentiment, score: sentimentScore };
}

/**
 * Advanced LLM-based sentiment analysis
 */
async function analyzeAdvancedSentiment(
  text: string,
  openai: OpenAI
): Promise<{ sentiment: 'positive' | 'negative' | 'neutral'; score: number }> {
  const prompt = `Analyze the sentiment of the following text. Respond in JSON format.

Text: ${text.substring(0, 500)}

Respond with:
{
  "sentiment": "positive" | "negative" | "neutral",
  "score": 0.0 to 1.0 (where 0 is most negative, 0.5 is neutral, 1.0 is most positive)
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a sentiment analysis expert. Analyze text and provide accurate sentiment scores.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    return {
      sentiment: result.sentiment || 'neutral',
      score: result.score || 0.5,
    };
  } catch (error: any) {
    console.error(`     ⚠️ Advanced sentiment analysis failed: ${error.message}, falling back to simple mode`);
    return analyzeSimpleSentiment(text);
  }
}

/**
 * Analyze sentiment of items
 */
export async function analyzeSentiment(
  items: NormalizedItem[],
  config: SentimentAnalysisStep
): Promise<NormalizedItem[]> {
  if (items.length === 0) {
    return [];
  }

  const { model = 'simple' } = config;

  console.log(`🧠 Analyzing sentiment for ${items.length} items (${model} mode)...`);

  try {
    let openai: OpenAI | null = null;

    if (model === 'advanced') {
      try {
        openai = getOpenAIClient();
      } catch (error: any) {
        console.log(`     ⚠️ OpenAI not available, falling back to simple mode: ${error.message}`);
      }
    }

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const textToAnalyze = `${item.title || ''} ${item.summary || ''}`.trim();

        if (!textToAnalyze) {
          return {
            ...item,
            sentiment: 'neutral' as const,
            sentimentScore: 0.5,
          };
        }

        const { sentiment, score } =
          model === 'advanced' && openai
            ? await analyzeAdvancedSentiment(textToAnalyze, openai)
            : analyzeSimpleSentiment(textToAnalyze);

        return {
          ...item,
          sentiment,
          sentimentScore: score,
        };
      })
    );

    console.log(`✅ Analyzed sentiment for ${enrichedItems.length} items`);
    return enrichedItems;
  } catch (error: any) {
    console.error(`❌ Sentiment analysis failed: ${error.message}`);
    return items;
  }
}
