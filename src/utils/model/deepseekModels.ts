/**
 * DeepSeek V4 Model Definitions
 *
 * Maps DeepSeek model names to their configuration, capabilities, and pricing.
 *
 * DeepSeek V4 models:
 *   - deepseek-v4-pro:   Flagship model, best reasoning, ¥12/Mtok input (miss)
 *   - deepseek-v4-flash: Fast & cost-effective, ¥1/Mtok input (miss)
 *
 * Pricing (RMB ¥ per million tokens):
 *                    Pro              Flash
 *   Cache Hit:      ¥1/Mtok          ¥0.2/Mtok
 *   Cache Miss:     ¥12/Mtok         ¥1/Mtok
 *   Output:         ¥12/Mtok         ¥1/Mtok
 *
 * Context window: 1M tokens (both models)
 * Max output:     8K tokens
 */

import type { APIProvider } from './providers.js'

// ─── Model Name Constants ────────────────────────────────────────────────────

export const DEEPSEEK_V4_PRO = 'deepseek-v4-pro'
export const DEEPSEEK_V4_FLASH = 'deepseek-v4-flash'

export type DeepSeekModelName = typeof DEEPSEEK_V4_PRO | typeof DEEPSEEK_V4_FLASH

// ─── Model Config ────────────────────────────────────────────────────────────

export interface DeepSeekModelConfig {
  name: DeepSeekModelName
  provider: string
  contextWindow: number
  maxOutputTokens: number
  description: string
  isReasoningModel: boolean
}

export const DEEPSEEK_MODEL_CONFIGS: Record<DeepSeekModelName, DeepSeekModelConfig> = {
  [DEEPSEEK_V4_PRO]: {
    name: DEEPSEEK_V4_PRO,
    provider: 'deepseek',
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    description: 'DeepSeek V4 Pro — 旗舰模型，深度推理能力',
    isReasoningModel: false,
  },
  [DEEPSEEK_V4_FLASH]: {
    name: DEEPSEEK_V4_FLASH,
    provider: 'deepseek',
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    description: 'DeepSeek V4 Flash — 快速响应，极致性价比',
    isReasoningModel: false,
  },
}

// ─── Pricing (RMB ¥ per million tokens) ──────────────────────────────────────

export interface DeepSeekPricing {
  inputCacheHit: number
  inputCacheMiss: number
  output: number
}

export const DEEPSEEK_PRICING: Record<DeepSeekModelName, DeepSeekPricing> = {
  [DEEPSEEK_V4_PRO]: {
    inputCacheHit: 1,
    inputCacheMiss: 12,
    output: 12,
  },
  [DEEPSEEK_V4_FLASH]: {
    inputCacheHit: 0.2,
    inputCacheMiss: 1,
    output: 1,
  },
}

// ─── Model Aliases ───────────────────────────────────────────────────────────

export const DEEPSEEK_MODEL_ALIASES = {
  pro: DEEPSEEK_V4_PRO,
  flash: DEEPSEEK_V4_FLASH,
  default: DEEPSEEK_V4_FLASH,
  best: DEEPSEEK_V4_PRO,
} as const

export type DeepSeekModelAlias = keyof typeof DEEPSEEK_MODEL_ALIASES

export function resolveDeepSeekAlias(alias: string): DeepSeekModelName {
  const lower = alias.toLowerCase().trim()
  if (lower in DEEPSEEK_MODEL_ALIASES) {
    return DEEPSEEK_MODEL_ALIASES[lower as DeepSeekModelAlias]
  }
  // Direct model name
  if (lower === DEEPSEEK_V4_PRO || lower === DEEPSEEK_V4_FLASH) {
    return lower as DeepSeekModelName
  }
  return DEEPSEEK_MODEL_ALIASES.default
}

// ─── Model Utilities ─────────────────────────────────────────────────────────

export function isDeepSeekModel(model: string): boolean {
  const lower = model.toLowerCase()
  return lower.includes('deepseek-v4') || lower === 'deepseek-chat' || lower === 'deepseek-reasoner'
}

export function isProModel(model: string): boolean {
  return model.toLowerCase().includes(DEEPSEEK_V4_PRO)
}

export function isFlashModel(model: string): boolean {
  return model.toLowerCase().includes(DEEPSEEK_V4_FLASH)
}

export function getContextWindow(model: string): number {
  if (isProModel(model)) return DEEPSEEK_MODEL_CONFIGS[DEEPSEEK_V4_PRO].contextWindow
  if (isFlashModel(model)) return DEEPSEEK_MODEL_CONFIGS[DEEPSEEK_V4_FLASH].contextWindow
  return DEEPSEEK_MODEL_CONFIGS[DEEPSEEK_V4_FLASH].contextWindow
}

export function getMaxOutputTokens(model: string): number {
  if (isProModel(model)) return DEEPSEEK_MODEL_CONFIGS[DEEPSEEK_V4_PRO].maxOutputTokens
  if (isFlashModel(model)) return DEEPSEEK_MODEL_CONFIGS[DEEPSEEK_V4_FLASH].maxOutputTokens
  return 4096
}

// ─── Cost Calculation ────────────────────────────────────────────────────────

export interface DeepSeekCostInput {
  inputTokens: number
  outputTokens: number
  cacheHitTokens: number
  cacheMissTokens: number
}

export function calculateCost(
  model: string,
  tokens: DeepSeekCostInput,
): number {
  const modelName = isProModel(model) ? DEEPSEEK_V4_PRO : DEEPSEEK_V4_FLASH
  const pricing = DEEPSEEK_PRICING[modelName]
  if (!pricing) return 0

  // Cache hit on input
  const cacheHitCost = (tokens.cacheHitTokens / 1_000_000) * pricing.inputCacheHit
  // Cache miss on input
  const cacheMissCost = (tokens.cacheMissTokens / 1_000_000) * pricing.inputCacheMiss
  // Output tokens
  const outputCost = (tokens.outputTokens / 1_000_000) * pricing.output

  return cacheHitCost + cacheMissCost + outputCost
}

export function formatDeepSeekCost(costYuan: number): string {
  if (costYuan < 0.01) {
    return `¥${(costYuan * 100).toFixed(2)}分`
  }
  if (costYuan < 1) {
    return `¥${costYuan.toFixed(4)}`
  }
  return `¥${costYuan.toFixed(2)}`
}

/**
 * Get pricing description string for display.
 */
export function getPricingDescription(model: string): string {
  const modelName = isProModel(model) ? DEEPSEEK_V4_PRO : DEEPSEEK_V4_FLASH
  const pricing = DEEPSEEK_PRICING[modelName]
  if (!pricing) return ''
  return `输入: ¥${pricing.inputCacheMiss}/M (缓存¥${pricing.inputCacheHit}/M) · 输出: ¥${pricing.output}/M`
}

// ─── Provider Config (compatible with existing model configs) ────────────────

export const DEEPSEEK_V4_PRO_CONFIG = {
  firstParty: DEEPSEEK_V4_PRO,
  bedrock: DEEPSEEK_V4_PRO,
  vertex: DEEPSEEK_V4_PRO,
  foundry: DEEPSEEK_V4_PRO,
} as const

export const DEEPSEEK_V4_FLASH_CONFIG = {
  firstParty: DEEPSEEK_V4_FLASH,
  bedrock: DEEPSEEK_V4_FLASH,
  vertex: DEEPSEEK_V4_FLASH,
  foundry: DEEPSEEK_V4_FLASH,
} as const
