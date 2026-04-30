/**
 * DeepSeek Code API Module
 *
 * Re-exports all DeepSeek API adapter components.
 * This is the primary import for DeepSeek API functionality.
 */

export {
  setDeepSeekConfig,
  getDeepSeekConfig,
  loadConfigFromEnv,
  chatCompletion,
  streamChatCompletion,
  toDeepSeekMessages,
  toDeepSeekTools,
  extractToolCalls,
  accumulateToolCallDeltas,
  validateApiKey,
  listModels,
  DeepSeekHTTPError,
} from './deepseekApi.js'

export type {
  DeepSeekModel,
  DeepSeekConfig,
  DeepSeekMessage,
  DeepSeekContentBlock,
  DeepSeekTextBlock,
  DeepSeekToolCallBlock,
  DeepSeekToolResultBlock,
  DeepSeekImageBlock,
  DeepSeekToolDefinition,
  DeepSeekChatCompletionRequest,
  DeepSeekChatCompletionResponse,
  DeepSeekChunk,
  DeepSeekChoice,
  DeepSeekChunkChoice,
  DeepSeekToolCall,
  DeepSeekToolCallDelta,
  DeepSeekUsage,
  DeepSeekStreamEvent,
  InternalMessage,
  InternalContentBlock,
  InternalTool,
} from './deepseekApi.js'

export {
  createDeepSeekClient,
  getDeepSeekClient,
  type DeepSeekClientOptions,
  type DeepSeekSdkClient,
  // Error types matching Anthropic SDK
  APIError,
  APIUserAbortError,
  APIConnectionTimeoutError,
  AuthenticationError,
  NotFoundError,
  APIConnectionError,
} from './deepseekClient.js'

export type {
  BetaMessage,
  BetaContentBlock,
  BetaUsage,
  BetaMessageParam,
  BetaContentBlockParam,
  BetaToolUnion,
  BetaToolChoiceAuto,
  BetaToolChoiceTool,
  BetaMessageStreamParams,
  BetaRawMessageStreamEvent,
  BetaMessageDeltaUsage,
  BetaStopReason,
} from './deepseekClient.js'
