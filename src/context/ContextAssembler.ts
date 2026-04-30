/**
 * DeepSeek Context Cache Assembler
 *
 * Optimizes prompt construction for DeepSeek V4's hard disk prefix cache.
 *
 * DeepSeek V4 caches are built on disk at the server using exact prefix matching.
 * Key rules:
 *  - Prefix must be > 1024 tokens
 *  - Must align to 128-token increments
 *  - Cache TTL: 5-10 minutes during peak hours
 *  - Cache hit tokens reported via prompt_cache_hit_tokens in usage
 *
 * Strategy:
 *  1. Static content (system prompt, tool defs) ALWAYS at the front
 *  2. Dynamic content (messages, file context) after static prefix
 *  3. Prefix length optimization to hit 128-token boundaries
 *  4. Cache warming through background prefetch requests
 */

import { logForDebugging } from '../utils/debug.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CacheStats {
  /** Total tokens in the current prompt */
  totalTokens: number
  /** Tokens in the static prefix (cacheable portion) */
  prefixTokens: number
  /** Tokens after the prefix (dynamic portion) */
  dynamicTokens: number
  /** Tokens aligned to DeepSeek's 128-token boundary */
  alignedPrefixTokens: number
  /** Whether the prefix meets the 1024-token minimum for caching */
  isCacheable: boolean
}

export interface AssembledPrompt {
  /** System prompt blocks in order */
  systemPrompt: string[]
  /** Messages in order */
  messages: unknown[]
  /** The static prefix text (for cache key tracking) */
  staticPrefix: string
  /** Estimated token count of the static prefix */
  staticPrefixTokens: number
  /** Cache metadata */
  cacheStats: CacheStats
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum prefix tokens for DeepSeek cache to activate */
export const CACHE_MIN_PREFIX_TOKENS = 1024

/** DeepSeek cache alignment increment */
export const CACHE_ALIGNMENT = 128

/** Token estimation ratio (chars per token, roughly 4 chars = 1 token for Chinese+English) */
const CHARS_PER_TOKEN = 4

// ─── Token Estimation ────────────────────────────────────────────────────────

/**
 * Estimate token count from text.
 * DeepSeek uses a different tokenizer than Anthropic,
 * but for cache alignment purposes this approximation is sufficient.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Align token count to DeepSeek's 128-token boundary.
 * DeepSeek requires cache to be built in 128-token increments.
 * We round UP to ensure we're past the boundary.
 */
export function alignToBoundary(tokens: number): number {
  if (tokens <= 0) return 0
  return Math.ceil(tokens / CACHE_ALIGNMENT) * CACHE_ALIGNMENT
}

/**
 * Calculate how many padding tokens are needed to reach the next boundary.
 */
export function paddingToBoundary(tokens: number): number {
  const aligned = alignToBoundary(tokens)
  return aligned - tokens
}

// ─── Prefix Assembly ─────────────────────────────────────────────────────────

/**
 * Assemble the static prefix that should be consistent across requests.
 * This includes system prompts, tool definitions, and static examples.
 *
 * @param systemPromptBlocks Ordered array of system prompt strings
 * @returns Static prefix text and its estimated token count
 */
export function assembleStaticPrefix(
  systemPromptBlocks: string[],
): { text: string; tokens: number } {
  const text = systemPromptBlocks.join('\n\n')
  const tokens = estimateTokens(text)
  return { text, tokens }
}

/**
 * Check if the static prefix meets DeepSeek's minimum length requirement.
 * If not, consider adding padding or expanding system prompts.
 */
export function isPrefixCacheable(prefixTokens: number): boolean {
  return prefixTokens >= CACHE_MIN_PREFIX_TOKENS
}

/**
 * Calculate the effective cacheable portion of the prefix.
 * Returns the number of prefix tokens that are aligned and meet the minimum.
 */
export function getEffectiveCacheTokens(prefixTokens: number): number {
  if (prefixTokens < CACHE_MIN_PREFIX_TOKENS) return 0
  return alignToBoundary(prefixTokens)
}

// ─── Prompt Assembly ─────────────────────────────────────────────────────────

/**
 * Assemble a complete prompt with cache-optimized prefix structure.
 *
 * Structure:
 *   [STATIC PREFIX - cacheable]
 *     - System prompt
 *     - Tool definitions
 *     - Static context
 *   [BOUNDARY]
 *   [DYNAMIC CONTENT - not cached]
 *     - Recent messages
 *     - Current file context
 *     - User input
 *
 * @param staticBlocks Ordered system prompt blocks (go in cache prefix)
 * @param dynamicBlocks Dynamic context blocks (after cache boundary)
 * @returns Assembled prompt with cache stats
 */
export function assemblePrompt(
  staticBlocks: string[],
  dynamicBlocks: string[],
): AssembledPrompt {
  const { text: staticPrefix, tokens: rawPrefixTokens } =
    assembleStaticPrefix(staticBlocks)
  const dynamicText = dynamicBlocks.join('\n\n')
  const dynamicTokens = estimateTokens(dynamicText)

  const effectiveCacheTokens = getEffectiveCacheTokens(rawPrefixTokens)
  const alignedPrefixTokens = alignToBoundary(rawPrefixTokens)

  const cacheStats: CacheStats = {
    totalTokens: rawPrefixTokens + dynamicTokens,
    prefixTokens: rawPrefixTokens,
    dynamicTokens,
    alignedPrefixTokens,
    isCacheable: isPrefixCacheable(rawPrefixTokens),
  }

  logForDebugging(
    `[DeepSeek Cache] Prefix: ${rawPrefixTokens}tok, ` +
    `Aligned: ${alignedPrefixTokens}tok, ` +
    `Dynamic: ${dynamicTokens}tok, ` +
    `Cacheable: ${cacheStats.isCacheable}, ` +
    `Effective cache: ${effectiveCacheTokens}tok`,
  )

  return {
    systemPrompt: staticBlocks,
    messages: dynamicBlocks,
    staticPrefix,
    staticPrefixTokens: rawPrefixTokens,
    cacheStats,
  }
}

// ─── Cache Warmth Prediction ─────────────────────────────────────────────────

/**
 * Predict whether a given prefix will hit the cache based on its size.
 * This is a heuristic since actual cache state depends on server TTL.
 */
export function predictCacheHit(stats: CacheStats): {
  willHit: boolean
  confidence: 'high' | 'medium' | 'low'
  reason: string
} {
  if (!stats.isCacheable) {
    return {
      willHit: false,
      confidence: 'high',
      reason: `Prefix too short (${stats.prefixTokens} < ${CACHE_MIN_PREFIX_TOKENS} min)`,
    }
  }

  // Larger prefixes are more likely to hit
  const prefixRatio = stats.prefixTokens / stats.totalTokens
  if (prefixRatio > 0.8) {
    return {
      willHit: true,
      confidence: 'high',
      reason: `High static ratio (${(prefixRatio * 100).toFixed(0)}% static)`,
    }
  }
  if (prefixRatio > 0.5) {
    return {
      willHit: true,
      confidence: 'medium',
      reason: `Moderate static ratio (${(prefixRatio * 100).toFixed(0)}% static)`,
    }
  }

  return {
    willHit: false,
    confidence: 'low',
    reason: `Low static ratio (${(prefixRatio * 100).toFixed(0)}% static)`,
  }
}

// ─── Cache Warming ───────────────────────────────────────────────────────────

/**
 * Generate a cache warming request payload.
 * This sends the static prefix to build the cache without processing a full query.
 */
export function buildWarmupRequest(
  staticPrefix: string,
  model: string,
): {
  model: string
  messages: Array<{ role: string; content: string }>
  max_tokens: number
} {
  return {
    model,
    messages: [
      { role: 'system', content: staticPrefix },
      { role: 'user', content: '[cache warmup]' },
    ],
    max_tokens: 1,
  }
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface CacheAnalysis {
  currentStats: CacheStats
  prediction: ReturnType<typeof predictCacheHit>
  suggestions: string[]
}

/**
 * Analyze cache performance and provide optimization suggestions.
 */
export function analyzeCache(stats: CacheStats): CacheAnalysis {
  const prediction = predictCacheHit(stats)
  const suggestions: string[] = []

  if (!stats.isCacheable) {
    const deficit = CACHE_MIN_PREFIX_TOKENS - stats.prefixTokens
    suggestions.push(
      `增加系统提示词长度至少 ${deficit} token 以达到 1024 token 的最小缓存要求`,
    )
  }

  if (paddingToBoundary(stats.prefixTokens) > 0) {
    suggestions.push(
      `前缀需要填充 ${paddingToBoundary(stats.prefixTokens)} token 以对齐 128-token 边界`,
    )
  }

  if (stats.dynamicTokens > stats.prefixTokens) {
    suggestions.push(
      '动态内容超过静态内容，考虑将更多上下文移到静态前缀部分',
    )
  }

  return { currentStats: stats, prediction, suggestions }
}

export default {
  estimateTokens,
  alignToBoundary,
  assembleStaticPrefix,
  isPrefixCacheable,
  assemblePrompt,
  predictCacheHit,
  buildWarmupRequest,
  analyzeCache,
}
