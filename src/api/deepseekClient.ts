/**
 * DeepSeek SDK Compatibility Layer
 *
 * Implements the subset of the Anthropic SDK interface used by claude.ts,
 * routing calls to DeepSeek V4's OpenAI-compatible API.
 *
 * This allows the existing Claude Code query engine to work with DeepSeek
 * without modifying its internal message/tool types.
 */

import {
  setDeepSeekConfig,
  getDeepSeekConfig,
  loadConfigFromEnv,
  toDeepSeekMessages,
  toDeepSeekTools,
  chatCompletion,
  streamChatCompletion,
  extractToolCalls,
  accumulateToolCallDeltas,
  validateApiKey,
  type DeepSeekUsage,
  type DeepSeekModel,
  type InternalMessage,
  type InternalContentBlock,
  type InternalTool,
  type DeepSeekChatCompletionRequest,
  type DeepSeekToolCall,
} from '../api/deepseekApi.js'

// ─── Types matching the Anthropic SDK subset ─────────────────────────────────

export type BetaMessageRole = 'user' | 'assistant'

export interface BetaMessage {
  id: string
  type: 'message'
  role: 'assistant'
  content: BetaContentBlock[]
  model: string
  stop_reason: BetaStopReason | null
  stop_sequence: string | null
  usage: BetaUsage
}

export type BetaStopReason =
  | 'end_turn'
  | 'max_tokens'
  | 'stop_sequence'
  | 'tool_use'
  | null

export interface BetaUsage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  /** DeepSeek-specific additions */
  prompt_cache_hit_tokens?: number
  prompt_cache_miss_tokens?: number
}

export interface BetaContentBlock {
  type: 'text' | 'tool_use' | 'thinking'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  thinking?: string
  signature?: string
}

export interface BetaMessageParam {
  role: BetaMessageRole
  content: string | BetaContentBlockParam[]
}

export type BetaContentBlockParam =
  | BetaTextBlockParam
  | BetaToolUseBlockParam
  | BetaToolResultBlockParam
  | BetaImageBlockParam

export interface BetaTextBlockParam {
  type: 'text'
  text: string
  cache_control?: { type: string; scope?: string; ttl?: string }
}

export interface BetaToolUseBlockParam {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface BetaToolResultBlockParam {
  type: 'tool_result'
  tool_use_id: string
  content: string | BetaContentBlockParam[]
  is_error?: boolean
  cache_control?: { type: string; scope?: string; ttl?: string }
}

export interface BetaImageBlockParam {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export interface BetaToolUnion {
  name: string
  description: string
  input_schema: Record<string, unknown>
  cache_control?: { type: string; scope?: string; ttl?: string }
  strict?: boolean
  defer_loading?: boolean
  eager_input_streaming?: boolean
}

export interface BetaToolChoiceAuto {
  type: 'auto'
}

export interface BetaToolChoiceTool {
  type: 'tool'
  name: string
}

export interface BetaMessageStreamParams {
  model?: string
  system?: string | BetaTextBlockParam[]
  messages: BetaMessageParam[]
  max_tokens: number
  temperature?: number
  tools?: BetaToolUnion[]
  tool_choice?: BetaToolChoiceAuto | BetaToolChoiceTool
  metadata?: Record<string, unknown>
  stream?: boolean
  betas?: string[]
}

export interface BetaRawMessageStreamEvent {
  type: string
  message?: BetaMessage
  index?: number
  content_block?: BetaContentBlock
  delta?: { type: string; text?: string; partial_json?: string }
  usage?: BetaUsage
}

export interface BetaMessageDeltaUsage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

export interface BetaJSONOutputFormat {
  type: 'json_object'
  json_schema?: Record<string, unknown>
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export class APIError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'APIError'
    this.status = status
  }
}

export class APIUserAbortError extends Error {
  constructor() {
    super('Request aborted by user')
    this.name = 'APIUserAbortError'
  }
}

export class APIConnectionTimeoutError extends Error {
  constructor(message = 'Connection timeout') {
    super(message)
    this.name = 'APIConnectionTimeoutError'
  }
}

export class AuthenticationError extends APIError {
  constructor(message = 'Authentication failed') {
    super(message, 401)
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends APIError {
  constructor(message = 'Not found') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export class APIConnectionError extends APIError {
  constructor(message = 'Connection error') {
    super(message, 503)
    this.name = 'APIConnectionError'
  }
}

// ─── Internal Conversion ─────────────────────────────────────────────────────

function betaMessageParamToInternal(
  msg: BetaMessageParam,
): InternalMessage {
  const role = msg.role === 'assistant' ? 'assistant' : 'user'
  const content = msg.content

  if (typeof content === 'string') {
    return { type: role, message: { content } }
  }

  const blocks: InternalContentBlock[] = content.map(block => {
    switch (block.type) {
      case 'text':
        return { type: 'text', text: block.text }
      case 'tool_use':
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input,
        }
      case 'tool_result':
        return {
          type: 'tool_result',
          tool_use_id: block.tool_use_id,
          content: typeof block.content === 'string'
            ? block.content
            : JSON.stringify(block.content),
          is_error: block.is_error,
        }
      case 'image':
        return {
          type: 'image',
          source: block.source,
        }
      default:
        return { type: 'text', text: '' }
    }
  })

  return { type: role, message: { content: blocks } }
}

function toolToInternal(tool: BetaToolUnion): InternalTool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema,
    cache_control: tool.cache_control,
  }
}

function deepSeekUsageToBetaUsage(
  usage: DeepSeekUsage | undefined,
  inputTokensEstimate: number,
): BetaUsage {
  if (!usage) {
    return {
      input_tokens: inputTokensEstimate,
      output_tokens: 0,
    }
  }
  return {
    input_tokens: usage.prompt_tokens,
    output_tokens: usage.completion_tokens,
    cache_read_input_tokens: usage.prompt_cache_hit_tokens ?? 0,
    cache_creation_input_tokens: usage.prompt_cache_miss_tokens ?? 0,
    prompt_cache_hit_tokens: usage.prompt_cache_hit_tokens,
    prompt_cache_miss_tokens: usage.prompt_cache_miss_tokens,
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

export interface DeepSeekClientOptions {
  apiKey?: string
  maxRetries?: number
  model?: string
  baseUrl?: string
  fetchOverride?: typeof fetch
  source?: string
  defaultHeaders?: Record<string, string>
}

export type DeepSeekSdkClient = ReturnType<typeof createDeepSeekClient>

export function createDeepSeekClient(options: DeepSeekClientOptions = {}) {
  // Merge env + options
  loadConfigFromEnv()
  if (options.apiKey) {
    setDeepSeekConfig({ apiKey: options.apiKey })
  }
  if (options.baseUrl) {
    setDeepSeekConfig({ baseUrl: options.baseUrl })
  }
  if (options.model) {
    setDeepSeekConfig({ model: options.model as DeepSeekModel })
  }

  const maxRetries = options.maxRetries ?? 3
  const config = getDeepSeekConfig()

  // ── Non-streaming create ───────────────────────────────────────────────
  async function create(
    params: BetaMessageStreamParams,
    overrides?: { signal?: AbortSignal; timeout?: number },
  ): Promise<BetaMessage> {
    const signal = overrides?.signal
    const model = params.model || config.model
    const systemStr = Array.isArray(params.system)
      ? params.system.map(b => (typeof b === 'string' ? b : b.text)).join('\n')
      : params.system || ''

    const internalMessages: InternalMessage[] = params.messages.map(
      betaMessageParamToInternal,
    )

    const deepseekMessages = toDeepSeekMessages(internalMessages, systemStr)
    const tools = params.tools?.map(toolToInternal) || []
    const deepseekTools = toDeepSeekTools(tools)

    const request: DeepSeekChatCompletionRequest = {
      model,
      messages: deepseekMessages,
      max_tokens: params.max_tokens,
      temperature: params.temperature ?? 0,
      tools: deepseekTools.length > 0 ? deepseekTools : undefined,
      tool_choice: params.tool_choice?.type === 'tool'
        ? { type: 'function' as const, function: { name: params.tool_choice.name } }
        : 'auto',
      stream: false,
    }

    // Estimate input tokens for usage reporting
    const inputTokensEstimate = estimateTokens(deepseekMessages, systemStr)

    try {
      const response = await chatCompletion(request, signal)

      // Convert response to BetaMessage format
      const choice = response.choices[0]
      const content: BetaContentBlock[] = []

      if (choice?.message?.content) {
        content.push({
          type: 'text',
          text: choice.message.content,
        })
      }

      // Tool calls
      const toolCalls = extractToolCalls(response)
      for (const tc of toolCalls) {
        let parsedInput: Record<string, unknown> = {}
        try {
          parsedInput = JSON.parse(tc.function.arguments)
        } catch {
          parsedInput = { _raw: tc.function.arguments }
        }
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input: parsedInput,
        })
      }

      const usage = deepSeekUsageToBetaUsage(
        response.usage,
        inputTokensEstimate,
      )

      const stop_reason: BetaStopReason = choice?.finish_reason === 'tool_calls'
        ? 'tool_use'
        : choice?.finish_reason === 'length'
          ? 'max_tokens'
          : choice?.finish_reason === 'stop'
            ? 'end_turn'
            : null

      return {
        id: response.id || `msg_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content,
        model: response.model || model,
        stop_reason,
        stop_sequence: null,
        usage,
      }
    } catch (err: unknown) {
      throw convertError(err)
    }
  }

  // ── Streaming ──────────────────────────────────────────────────────────
  async function* stream(
    params: BetaMessageStreamParams,
    overrides?: { signal?: AbortSignal },
  ): AsyncGenerator<BetaRawMessageStreamEvent> {
    const signal = overrides?.signal
    const model = params.model || config.model
    const systemStr = Array.isArray(params.system)
      ? params.system.map(b => (typeof b === 'string' ? b : b.text)).join('\n')
      : params.system || ''

    const internalMessages: InternalMessage[] = params.messages.map(
      betaMessageParamToInternal,
    )

    const deepseekMessages = toDeepSeekMessages(internalMessages, systemStr)
    const tools = params.tools?.map(toolToInternal) || []
    const deepseekTools = toDeepSeekTools(tools)

    const request: DeepSeekChatCompletionRequest = {
      model,
      messages: deepseekMessages,
      max_tokens: params.max_tokens,
      temperature: params.temperature ?? 0,
      tools: deepseekTools.length > 0 ? deepseekTools : undefined,
      tool_choice: params.tool_choice?.type === 'tool'
        ? { type: 'function' as const, function: { name: params.tool_choice.name } }
        : 'auto',
    }

    const inputTokensEstimate = estimateTokens(deepseekMessages, systemStr)

    try {
      // Accumulate streaming content
      let accumulatedContent = ''
      let accumulatedToolCalls: DeepSeekToolCall[] = []
      let finalUsage: DeepSeekUsage | undefined
      let toolCallAccumulators: Map<number, {
        id: string
        name: string
        args: string
      }> = new Map()

      // Yield a message_start event
      yield {
        type: 'message_start',
        message: {
          id: `msg_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: [],
          model,
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: inputTokensEstimate,
            output_tokens: 0,
          },
        },
      }

      for await (const event of streamChatCompletion(request, signal)) {
        if (event.type === 'error') {
          throw event.error || new Error('Stream error')
        }

        if (event.type === 'chunk' && event.chunk) {
          const chunk = event.chunk
          const choice = chunk.choices[0]

          if (choice?.delta?.content) {
            accumulatedContent += choice.delta.content
            yield {
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: choice.delta.content },
            }
          }

          // Handle tool call deltas
          if (choice?.delta?.tool_calls) {
            for (const delta of choice.delta.tool_calls) {
              if (!toolCallAccumulators.has(delta.index)) {
                toolCallAccumulators.set(delta.index, {
                  id: delta.id || `call_${delta.index}`,
                  name: '',
                  args: '',
                })
                // Emit content_block_start for tool use
                yield {
                  type: 'content_block_start',
                  index: delta.index + 1, // +1 because text is at index 0
                  content_block: {
                    type: 'tool_use',
                    id: delta.id || `call_${delta.index}`,
                    name: delta.function?.name || '',
                    input: {},
                  },
                }
              }

              const acc = toolCallAccumulators.get(delta.index)!
              if (delta.function?.name) acc.name += delta.function.name
              if (delta.function?.arguments) acc.args += delta.function.arguments

              yield {
                type: 'content_block_delta',
                index: delta.index + 1,
                delta: {
                  type: 'input_json_delta',
                  partial_json: delta.function?.arguments || '',
                },
              }
            }
          }

          if (chunk.usage) {
            finalUsage = chunk.usage
          }
        }

        if (event.type === 'done') {
          finalUsage = event.usage || finalUsage
        }
      }

      // Yield content_block_stop events
      if (accumulatedContent) {
        yield { type: 'content_block_stop', index: 0 }
      }
      for (const [index] of toolCallAccumulators) {
        yield { type: 'content_block_stop', index: index + 1 }
      }

      // Build complete message
      const content: BetaContentBlock[] = []
      if (accumulatedContent) {
        content.push({ type: 'text', text: accumulatedContent })
      }
      for (const [, acc] of toolCallAccumulators) {
        let parsedInput: Record<string, unknown> = {}
        try {
          parsedInput = JSON.parse(acc.args)
        } catch {
          parsedInput = { _raw: acc.args }
        }
        content.push({
          type: 'tool_use',
          id: acc.id,
          name: acc.name,
          input: parsedInput,
        })
      }

      const usage = deepSeekUsageToBetaUsage(finalUsage, inputTokensEstimate)

      // Yield message_delta
      yield {
        type: 'message_delta',
        delta: {
          stop_reason: toolCallAccumulators.size > 0 ? 'tool_use' : 'end_turn',
          stop_sequence: null,
        },
        usage: {
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          cache_read_input_tokens: usage.cache_read_input_tokens,
          cache_creation_input_tokens: usage.cache_creation_input_tokens,
        },
      }

      // Yield message with complete content
      yield {
        type: 'message',
        message: {
          id: `msg_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content,
          model,
          stop_reason: toolCallAccumulators.size > 0 ? 'tool_use' : 'end_turn',
          stop_sequence: null,
          usage,
        },
      }
    } catch (err: unknown) {
      throw convertError(err)
    }
  }

  // ── List models ────────────────────────────────────────────────────────
  async function listModels() {
    const { listModels } = await import('../api/deepseekApi.js')
    return listModels()
  }

  return {
    beta: {
      messages: {
        create,
        stream,
      },
    },
    models: {
      list: listModels,
    },
    _client: {
      create,
      stream,
    },
  }
}

// ─── Error Conversion ────────────────────────────────────────────────────────

function convertError(err: unknown): Error {
  if (err instanceof APIError) return err
  if (err instanceof APIUserAbortError) return err

  const errObj = err as Record<string, unknown>

  // DeepSeek HTTP errors
  if (err instanceof Error && err.name === 'DeepSeekHTTPError') {
    const de = err as Error & { status?: number; body?: string }
    const status = de.status || 0

    if (status === 401) return new AuthenticationError()
    if (status === 404) return new NotFoundError()
    if (status === 429 || status >= 500) {
      return new APIConnectionError(de.message)
    }
  }

  // Abort errors
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new APIUserAbortError()
  }

  if (errObj?.name === 'AbortError') {
    return new APIUserAbortError()
  }

  return err instanceof Error ? err : new Error(String(err))
}

// ─── Token Estimation ────────────────────────────────────────────────────────

function estimateTokens(
  messages: unknown[],
  systemPrompt?: string,
): number {
  let total = systemPrompt ? systemPrompt.length / 4 : 0
  for (const msg of messages) {
    const m = msg as { content?: string | unknown[] }
    if (typeof m.content === 'string') {
      total += m.content.length / 4
    } else if (Array.isArray(m.content)) {
      for (const block of m.content) {
        const b = block as { text?: string; content?: string }
        if (b.text) total += b.text.length / 4
        if (b.content && typeof b.content === 'string') total += b.content.length / 4
      }
    }
  }
  return Math.ceil(total)
}

// ─── Top-Level Convenience ───────────────────────────────────────────────────

export async function getDeepSeekClient(options: DeepSeekClientOptions = {}) {
  return createDeepSeekClient(options)
}

export { setDeepSeekConfig, getDeepSeekConfig, loadConfigFromEnv, validateApiKey }
