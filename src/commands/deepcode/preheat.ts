/**
 * `deepcode preheat` — Cache Warming
 *
 * Sends background requests to build DeepSeek's hard disk cache.
 * By sending the static prompt prefix ahead of time, subsequent requests
 * benefit from cache hits starting from the first real query.
 *
 * DeepSeek V4 cache rules:
 *  - Needs prefix > 1024 tokens
 *  - Cache TTL: 5-10 min (peak)
 *  - Aligned to 128-token boundaries
 */

import { loadConfig, getApiKey } from '../../api/deepseekConfig.js'
import { setDeepSeekConfig, chatCompletion } from '../../api/deepseekApi.js'
import { buildWarmupRequest, assembleStaticPrefix, estimateTokens, CACHE_MIN_PREFIX_TOKENS } from '../../context/ContextAssembler.js'

export interface PreheatOptions {
  projectRoot?: string
  model?: string
  force?: boolean
}

/**
 * Build a static prefix from common system prompt components.
 * In production, this would load the actual system prompts used by the session.
 */
function buildWarmupPrefix(): string[] {
  return [
    // DeepSeek Code system prompt prefix
    `你是 DeepSeek Code，一个基于 DeepSeek V4 的 AI 编程助手。
你运行在用户的终端中，可以读取文件、编辑代码、执行命令。

你的核心能力：
1. 代码阅读和分析
2. 文件编辑和修改
3. 终端命令执行
4. Git 操作
5. Web 搜索和抓取

在回答时请注意：
- 使用中文或用户使用的语言回答
- 所有的文件编辑都需要确认后再执行
- 对于危险操作，需要用户确认后方可进行`,

    // Tool definitions preamble
    `可用工具：
- BashTool: 执行终端命令
- FileReadTool: 读取文件内容
- FileWriteTool: 创建或覆盖文件
- FileEditTool: 修改文件（基于字符串替换）
- GlobTool: 文件模式匹配搜索
- GrepTool: 基于 ripgrep 的内容搜索
- WebFetchTool: 获取 URL 内容
- WebSearchTool: 网络搜索`,

    // Coding standards
    `编码规范：
- 遵循项目的现有代码风格
- 使用 TypeScript 严格模式
- 编写类型安全的代码
- 添加必要的错误处理
- 优先使用 const 而非 let
- 使用箭头函数而非 function 关键字
- 使用模板字符串替代字符串拼接
- 默认不添加注释，除非逻辑不显而易见`,

    // Response format
    `输出格式：
- 使用 Markdown 格式回复
- 代码块使用三个反引号包裹并标注语言
- 对于修改建议，提供清晰的 before/after 对比
- 对于复杂操作，分步骤说明`,
  ]
}

export async function preheatCommand(options: PreheatOptions = {}): Promise<void> {
  const projectRoot = options.projectRoot || process.cwd()
  const model = options.model || 'deepseek-v4-flash'
  const apiKey = getApiKey()

  console.log('\n🔥 DeepSeek Code — 缓存预热\n')

  if (!apiKey) {
    console.log('❌ 错误: 未配置 API Key，请先运行 `deepcode config`')
    return
  }

  // Configure API
  setDeepSeekConfig({ apiKey, model: model as 'deepseek-v4-pro' | 'deepseek-v4-flash' })

  // Build warmup prefix
  const blocks = buildWarmupPrefix()
  const { text: prefix, tokens } = assembleStaticPrefix(blocks)

  console.log(`项目目录: ${projectRoot}`)
  console.log(`预热模型: ${model}`)
  console.log(`前缀大小: ${tokens} tokens`)
  console.log(`最小要求: ${CACHE_MIN_PREFIX_TOKENS} tokens`)

  if (tokens < CACHE_MIN_PREFIX_TOKENS) {
    console.log(`\n⚠️  警告: 前缀仅 ${tokens} tokens，小于 ${CACHE_MIN_PREFIX_TOKENS} 的最小缓存要求`)
    console.log('   缓存可能无法建立。考虑增加系统提示词长度。')
    if (!options.force) {
      console.log('\n使用 --force 参数强制预热')
      return
    }
  }

  console.log('\n正在发送预热请求...')

  const warmupRequest = buildWarmupRequest(prefix, model)

  try {
    const startTime = Date.now()
    const response = await chatCompletion(warmupRequest)
    const duration = Date.now() - startTime

    if (response.usage) {
      const { prompt_tokens, prompt_cache_hit_tokens, prompt_cache_miss_tokens } = response.usage
      console.log(`\n✅ 预热完成 (${duration}ms):`)
      console.log(`  输入 tokens: ${prompt_tokens}`)
      if (prompt_cache_hit_tokens) {
        console.log(`  缓存命中: ${prompt_cache_hit_tokens}`)
      }
      if (prompt_cache_miss_tokens) {
        console.log(`  缓存建立: ${prompt_cache_miss_tokens}`)
      }
    } else {
      console.log(`\n✅ 预热请求完成 (${duration}ms)`)
    }

    console.log('\n💡 缓存已建立，后续请求将从中获益')
    console.log('   注意: DeepSeek 缓存 TTL 为 5-10 分钟')
    console.log('   如需持续缓存，建议每 5 分钟发送一次预热请求')
    console.log('')

  } catch (err) {
    console.log(`\n❌ 预热失败: ${err instanceof Error ? err.message : String(err)}`)
    console.log('请检查网络连接和 API Key 是否正确')
  }
}

export default preheatCommand
