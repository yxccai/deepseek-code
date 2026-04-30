/**
 * Provider detection for DeepSeek Code.
 *
 * Extends the original providers.ts with DeepSeek support.
 * When DEEPSEEK_API_KEY is set, the provider is 'deepseek'.
 * Otherwise falls back to the original Anthropic provider logic.
 */

import { isEnvTruthy } from '../utils/envUtils.js'

export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry' | 'deepseek'

export function getAPIProvider(): APIProvider {
  // DeepSeek mode takes priority when DEEPSEEK_API_KEY is set
  if (isEnvTruthy(process.env.DEEPSEEK_API_KEY) || process.env.DEEPSEEK_API_KEY) {
    return 'deepseek'
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)) {
    return 'bedrock'
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)) {
    return 'vertex'
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)) {
    return 'foundry'
  }
  return 'firstParty'
}

export function isDeepSeekMode(): boolean {
  return getAPIProvider() === 'deepseek'
}

export function getAPIProviderForStatsig(): string {
  return getAPIProvider()
}
