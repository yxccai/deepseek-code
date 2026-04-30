/**
 * DeepSeek V4 API Adapter
 *
 * Translates between Claude Code's internal message format and DeepSeek V4's
 * OpenAI-compatible API. Supports streaming, tool calls, and cache tracking.
 *
 * DeepSeek V4 endpoints:
 *   - deepseek-v4-pro   (flagship model, best reasoning)
 *   - deepseek-v4-flash (fast, cost-effective)
 *
 * All pricing in RMB (¥). Cache hit: Pro ¥1/Mtok, Flash ¥0.2/Mtok
 * Cache miss: Pro ¥12/Mtok, Flash ¥1/Mtok
 * Output: Pro ¥12/Mtok, Flash ¥1/Mtok
 */

import { randomUUID } from 'crypto'

// ─── Types ───────────────────────────────────────────────────────────────────

export type DeepSeekModel = 'deepseek-v4-pro' | 'deepseek-v4-flash'

export interface DeepSeekConfig {
  apiKey: string
  baseUrl: string
  model: DeepSeekModel
  maxTokens?: number
  temperature?: number
  timeout?: number
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | DeepSeekContentBlock[]
  name?: string
}

export type DeepSeekContentBlock =
  | DeepSeekTextBlock
  | DeepSeekToolCallBlock
  | DeepSeekToolResultBlock
  | DeepSeekImageBlock

export interface DeepSeekTextBlock {
  type: 'text'
  text: string
}

export interface DeepSeekToolCallBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface DeepSeekToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string | DeepSeekContentBlock[]
  is_error?: boolean
}

export interface DeepSeekImageBlock {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export interface DeepSeekToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface DeepSeekChatCompletionRequest {
  model: string
  messages: DeepSeekMessage[]
  max_tokens?: number
  temperature?: number
  stream?: boolean
  tools?: DeepSeekToolDefinition[]
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
  stop?: string | string[]
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

export interface DeepSeekChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: DeepSeekChoice[]
  usage: DeepSeekUsage
}

export interface DeepSeekChunk {
  id: string
  object: string
  created: number
  model: string
  choices: DeepSeekChunkChoice[]
  usage?: DeepSeekUsage
}

export interface DeepSeekChoice {
  index: number
  message: {
    role: string
    content: string | null
    tool_calls?: DeepSeekToolCall[]
  }
  finish_reason: string | null
}

export interface DeepSeekChunkChoice {
  index: number
  delta: {
    role?: string
    content?: string | null
    tool_calls?: DeepSeekToolCallDelta[]
  }
  finish_reason: string | null
}

export interface DeepSeekToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface DeepSeekToolCallDelta {
  index: number
  id?: string
  type?: 'function'
  function?: {
    name?: string
    arguments?: string
  }
}

export interface DeepSeekUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  /** DeepSeek-specific: cache hit tokens */
  prompt_cache_hit_tokens?: number
  /** DeepSeek-specific: cache miss tokens */
  prompt_cache_miss_tokens?: number
}

export interface DeepSeekStreamEvent {
  type: 'chunk' | 'done' | 'error'
  chunk?: DeepSeekChunk
  usage?: DeepSeekUsage
  error?: Error
}

// ─── Configuration ───────────────────────────────────────────────────────────

const DEEPSEEK_DEFAULTS: DeepSeekConfig = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-v4-flash',
  maxTokens: 8192,
  temperature: 0,
  timeout: 600_000,
}

let currentConfig: DeepSeekConfig = { ...DEEPSEEK_DEFAULTS }

export function setDeepSeekConfig(config: Partial<DeepSeekConfig>): void {
  currentConfig = { ...currentConfig, ...config }
}

export function getDeepSeekConfig(): DeepSeekConfig {
  return { ...currentConfig }
}

export function loadConfigFromEnv(): void {
  currentConfig = {
    ...currentConfig,
    apiKey: process.env.DEEPSEEK_API_KEY || currentConfig.apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL || currentConfig.baseUrl,
    model: (process.env.DEEPSEEK_MODEL as DeepSeekModel) || currentConfig.model,
    maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '', 10) || currentConfig.maxTokens!,
  }
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

class DeepSeekHTTPError extends Error {
  status: number
  body: string
  constructor(status: number, body: string, message?: string) {
    super(message || `DeepSeek API error: ${status} ${body}`)
    this.status = status
    this.body = body
    this.name = 'DeepSeekHTTPError'
  }
}

const MAX_RETRIES = 3
const BASE_RETRY_DELAY = 1000

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function apiRequest(
  path: string,
  body: unknown,
  signal?: AbortSignal,
  retryCount = 0,
): Promise<Response> {
  const config = getDeepSeekConfig()
  const url = `${config.baseUrl}${path}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'x-deepseek-prefix-cache': 'true',
      'User-Agent': 'DeepSeekCode/1.0',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok && retryCount < MAX_RETRIES) {
    // Rate limit handling
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = response.headers.get('retry-after')
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : BASE_RETRY_DELAY * Math.pow(2, retryCount)
      await sleep(delay)
      return apiRequest(path, body, signal, retryCount + 1)
    }
    const errorBody = await response.text()
    throw new DeepSeekHTTPError(response.status, errorBody)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new DeepSeekHTTPError(response.status, errorBody)
  }

  return response
}

// ─── Message Conversion ──────────────────────────────────────────────────────

/**
 * Convert Claude Code's internal message format to DeepSeek's OpenAI-compatible format.
 *
 * Claude Code messages use an Anthropic-style format with role-based content blocks.
 * DeepSeek uses OpenAI-format messages. This function handles the conversion.
 */

export interface InternalMessage {
  type: 'user' | 'assistant' | 'system'
  message: {
    role?: string
    content: string | InternalContentBlock[]
  }
}

export interface InternalContentBlock {
  type: string
  text?: string
  name?: string
  id?: string
  input?: Record<string, unknown>
  content?: string | InternalContentBlock[]
  tool_use_id?: string
  is_error?: boolean
  source?: { type: string; media_type: string; data: string }
}

export function toDeepSeekMessages(
  messages: InternalMessage[],
  systemPrompt?: string,
): DeepSeekMessage[] {
  const result: DeepSeekMessage[] = []

  // System prompt goes first for prefix caching
  if (systemPrompt) {
    result.push({
      role: 'system',
      content: systemPrompt,
    })
  }

  for (const msg of messages) {
    const role = msg.type === 'assistant' ? 'assistant' : 'user'
    const content = msg.message.content

    if (typeof content === 'string') {
      result.push({ role, content })
    } else {
      const blocks: DeepSeekContentBlock[] = []
      for (const block of content) {
        switch (block.type) {
          case 'text':
            if (block.text) blocks.push({ type: 'text', text: block.text })
            break
          case 'tool_use':
          case 'tool_call':
            blocks.push({
              type: 'tool_use',
              id: block.id || randomUUID(),
              name: block.name || 'unknown',
              input: block.input || {},
            })
            break
          case 'tool_result':
          case 'tool_response':
            blocks.push({
              type: 'tool_result',
              tool_use_id: block.tool_use_id || block.id || randomUUID(),
              content: typeof block.content === 'string'
                ? block.content
                : JSON.stringify(block.content || ''),
              is_error: block.is_error,
            })
            break
          case 'image':
          case 'image_url':
            if (block.source) {
              blocks.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: block.source.media_type || 'image/png',
                  data: block.source.data || '',
                },
              })
            }
            break
        }
      }

      if (blocks.length > 0) {
        result.push({ role, content: blocks })
      } else if (role === 'assistant') {
        result.push({ role, content: '' })
      }
    }
  }

  return result
}

// ─── Tool Conversion ─────────────────────────────────────────────────────────

export interface InternalTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
  cache_control?: { type: string; scope?: string; ttl?: string }
}

export function toDeepSeekTools(
  tools: InternalTool[],
): DeepSeekToolDefinition[] {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema || {},
    },
  }))
}

// ─── Non-Streaming Chat Completion ───────────────────────────────────────────

export async function chatCompletion(
  request: DeepSeekChatCompletionRequest,
  signal?: AbortSignal,
): Promise<DeepSeekChatCompletionResponse> {
  const response = await apiRequest(
    '/chat/completions',
    { ...request, stream: false },
    signal,
  )
  const data: DeepSeekChatCompletionResponse = await response.json()
  return data
}

// ─── Streaming Chat Completion ───────────────────────────────────────────────

export async function* streamChatCompletion(
  request: DeepSeekChatCompletionRequest,
  signal?: AbortSignal,
): AsyncGenerator<DeepSeekStreamEvent> {
  const config = getDeepSeekConfig()
  const url = `${config.baseUrl}/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'x-deepseek-prefix-cache': 'true',
      'User-Agent': 'DeepSeekCode/1.0',
    },
    body: JSON.stringify({ ...request, stream: true }),
    signal,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new DeepSeekHTTPError(response.status, errorBody)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body for streaming')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let finalUsage: DeepSeekUsage | undefined

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const payload = trimmed.slice(6)
        if (payload === '[DONE]') {
          yield { type: 'done', usage: finalUsage }
          return
        }

        try {
          const chunk: DeepSeekChunk = JSON.parse(payload)
          // Track usage from the final chunk that includes it
          if (chunk.usage) {
            finalUsage = chunk.usage
          }
          yield { type: 'chunk', chunk }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { type: 'done', usage: finalUsage }
}

// ─── Function Calling Helpers ────────────────────────────────────────────────

/**
 * Extract tool calls from a completion response.
 */
export function extractToolCalls(
  response: DeepSeekChatCompletionResponse,
): DeepSeekToolCall[] {
  const choice = response.choices[0]
  if (!choice?.message?.tool_calls) return []
  return choice.message.tool_calls
}

/**
 * Accumulate streaming tool call deltas into complete tool calls.
 */
export function accumulateToolCallDeltas(
  deltas: DeepSeekToolCallDelta[],
): DeepSeekToolCall[] {
  const calls: Map<number, { id: string; name: string; args: string }> = new Map()

  for (const delta of deltas) {
    if (!calls.has(delta.index)) {
      calls.set(delta.index, { id: '', name: '', args: '' })
    }
    const call = calls.get(delta.index)!
    if (delta.id) call.id = delta.id
    if (delta.function?.name) call.name += delta.function.name
    if (delta.function?.arguments) call.args += delta.function.arguments
  }

  return Array.from(calls.entries()).map(([index, call]) => ({
    id: call.id || `call_${index}`,
    type: 'function' as const,
    function: {
      name: call.name,
      arguments: call.args,
    },
  }))
}

// ─── API Key Validation ──────────────────────────────────────────────────────

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const oldKey = currentConfig.apiKey
    currentConfig.apiKey = apiKey

    const response = await apiRequest('/chat/completions', {
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 1,
    })

    currentConfig.apiKey = oldKey
    return response.ok
  } catch {
    return false
  }
}

// ─── Model Info ──────────────────────────────────────────────────────────────

export async function listModels(): Promise<string[]> {
  const config = getDeepSeekConfig()
  const response = await fetch(`${config.baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  })
  if (!response.ok) return ['deepseek-v4-pro', 'deepseek-v4-flash']
  const data = await response.json()
  return (data.data || []).map((m: { id: string }) => m.id)
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { DeepSeekHTTPError }
export default {
  setConfig: setDeepSeekConfig,
  getConfig: getDeepSeekConfig,
  loadConfigFromEnv,
  chatCompletion,
  streamChatCompletion,
  toDeepSeekMessages,
  toDeepSeekTools,
  extractToolCalls,
  accumulateToolCallDeltas,
  validateApiKey,
  listModels,
}
