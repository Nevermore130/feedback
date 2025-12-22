import { GoogleGenAI, Type } from "@google/genai";
import { Category, Sentiment } from "../types.js";

const apiKey = process.env.GOOGLE_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export interface AnalysisResult {
  sentiment: Sentiment;
  category: Category;
  tags: string[];
  summary: string;
}

export interface BatchAnalysisItem {
  id: string;
  content: string;
}

// ============================================
// Single Item Analysis Cache (LRU with TTL)
// ============================================
interface CacheEntry {
  result: AnalysisResult;
  timestamp: number;
}

class AnalysisCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 5000, ttlHours = 24) {
    this.maxSize = maxSize;
    this.ttl = ttlHours * 60 * 60 * 1000;
  }

  private hashContent(content: string): string {
    // Simple hash for content deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  get(content: string): AnalysisResult | null {
    const key = this.hashContent(content);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  set(content: string, result: AnalysisResult): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entries
      const keysToDelete = Array.from(this.cache.keys()).slice(0, 100);
      keysToDelete.forEach(k => this.cache.delete(k));
    }
    const key = this.hashContent(content);
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 'N/A', // Could track hits/misses
    };
  }
}

// Global cache instance
const analysisCache = new AnalysisCache();

// ============================================
// Batch Analysis - Core Optimization
// ============================================

/**
 * Analyze multiple feedbacks in a single API call
 * This is the KEY optimization - reduces N API calls to 1
 */
async function analyzeBatchInSingleCall(
  items: BatchAnalysisItem[]
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();

  if (items.length === 0) return results;

  // Build numbered list of feedbacks
  const feedbackList = items
    .map((item, idx) => `[${idx + 1}] ${item.content.slice(0, 500)}`) // Truncate long content
    .join('\n\n');

  const prompt = `Analyze the following ${items.length} user feedbacks for a mobile application.

For EACH feedback, provide:
1. sentiment: "Positive", "Negative", or "Neutral"
2. category: "Bug Report", "Feature Request", "UX/UI", "Performance", or "Other"
3. tags: 2-4 relevant tags (Chinese preferred)
4. summary: One concise sentence summary in Chinese

Feedbacks:
${feedbackList}

Return a JSON array with ${items.length} objects, one for each feedback in order.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sentiment: {
                type: Type.STRING,
                enum: [Sentiment.POSITIVE, Sentiment.NEGATIVE, Sentiment.NEUTRAL],
              },
              category: {
                type: Type.STRING,
                enum: [Category.BUG, Category.FEATURE, Category.UX_UI, Category.PERFORMANCE, Category.OTHER],
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              summary: {
                type: Type.STRING,
              },
            },
            required: ["sentiment", "category", "tags", "summary"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const parsed = JSON.parse(text) as AnalysisResult[];

    // Map results back to IDs
    items.forEach((item, idx) => {
      if (parsed[idx]) {
        results.set(item.id, parsed[idx]);
        // Cache individual result
        analysisCache.set(item.content, parsed[idx]);
      }
    });

  } catch (error) {
    console.error("Batch analysis failed:", error);
    // Return empty results, caller will use defaults
  }

  return results;
}

/**
 * High-performance batch analysis for large datasets (100-1000+ items)
 * Target: Complete 1000 items in ~5 seconds
 *
 * Strategy:
 * 1. Check cache first - skip already analyzed items
 * 2. Group remaining items into chunks of 30 (optimal for token limits)
 * 3. Execute chunks in parallel (max 10 concurrent)
 * 4. Each chunk = 1 API call analyzing 30 items
 *
 * Math: 1000 items / 30 per chunk = ~34 chunks
 *       34 chunks / 10 parallel = 3.4 rounds
 *       Each round ~1.5s = total ~5s
 */
export async function analyzeInBatch(
  items: BatchAnalysisItem[],
  options: {
    chunkSize?: number;      // Items per API call (default: 30)
    concurrency?: number;    // Parallel API calls (default: 10)
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<Map<string, AnalysisResult>> {
  const {
    chunkSize = 30,
    concurrency = 10,
    onProgress,
  } = options;

  const results = new Map<string, AnalysisResult>();
  const uncachedItems: BatchAnalysisItem[] = [];

  // Step 1: Check cache
  for (const item of items) {
    const cached = analysisCache.get(item.content);
    if (cached) {
      results.set(item.id, cached);
    } else {
      uncachedItems.push(item);
    }
  }

  console.log(`[AI Analysis] Cache hit: ${results.size}/${items.length}, need to analyze: ${uncachedItems.length}`);

  if (uncachedItems.length === 0) {
    onProgress?.(items.length, items.length);
    return results;
  }

  // Step 2: Split into chunks
  const chunks: BatchAnalysisItem[][] = [];
  for (let i = 0; i < uncachedItems.length; i += chunkSize) {
    chunks.push(uncachedItems.slice(i, i + chunkSize));
  }

  console.log(`[AI Analysis] Processing ${chunks.length} chunks with concurrency ${concurrency}`);

  // Step 3: Process chunks in parallel batches
  let completed = results.size;

  for (let i = 0; i < chunks.length; i += concurrency) {
    const parallelChunks = chunks.slice(i, i + concurrency);
    const startTime = Date.now();

    const chunkPromises = parallelChunks.map(chunk => analyzeBatchInSingleCall(chunk));
    const chunkResults = await Promise.all(chunkPromises);

    // Merge results
    for (const chunkResult of chunkResults) {
      chunkResult.forEach((value, key) => {
        results.set(key, value);
      });
      completed += chunkResult.size;
    }

    const elapsed = Date.now() - startTime;
    console.log(`[AI Analysis] Batch ${Math.floor(i / concurrency) + 1}: ${parallelChunks.length} chunks in ${elapsed}ms`);

    onProgress?.(completed, items.length);
  }

  return results;
}

/**
 * Single item analysis (with caching)
 */
export async function analyzeFeedbackWithGemini(feedbackText: string): Promise<AnalysisResult> {
  if (!feedbackText || feedbackText.trim().length === 0) {
    return {
      sentiment: Sentiment.NEUTRAL,
      category: Category.UNCLASSIFIED,
      tags: [],
      summary: 'Empty feedback'
    };
  }

  // Check cache first
  const cached = analysisCache.get(feedbackText);
  if (cached) {
    return cached;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following user feedback for a mobile application.

Tasks:
1. sentiment: "Positive", "Negative", or "Neutral"
2. category: "Bug Report", "Feature Request", "UX/UI", "Performance", or "Other"
3. tags: 3-5 relevant tags
4. summary: One concise sentence summary in Chinese

Feedback: "${feedbackText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: {
              type: Type.STRING,
              enum: [Sentiment.POSITIVE, Sentiment.NEGATIVE, Sentiment.NEUTRAL],
            },
            category: {
              type: Type.STRING,
              enum: [Category.BUG, Category.FEATURE, Category.UX_UI, Category.PERFORMANCE, Category.OTHER],
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            summary: {
              type: Type.STRING,
            },
          },
          required: ["sentiment", "category", "tags", "summary"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const result = JSON.parse(text) as AnalysisResult;

    // Cache result
    analysisCache.set(feedbackText, result);

    return result;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      sentiment: Sentiment.PENDING,
      category: Category.UNCLASSIFIED,
      tags: [],
      summary: ''
    };
  }
}

/**
 * Get default analysis result for items that couldn't be analyzed
 */
export function getDefaultAnalysis(): AnalysisResult {
  return {
    sentiment: Sentiment.PENDING,
    category: Category.UNCLASSIFIED,
    tags: [],
    summary: ''
  };
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return analysisCache.getStats();
}
