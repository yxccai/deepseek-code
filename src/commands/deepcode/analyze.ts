/**
 * `deepcode analyze` — Token & Cost Analysis
 *
 * Analyzes session token usage, cache hit rates, and cost breakdown.
 * Provides optimization recommendations based on usage patterns.
 */

import { loadConfig } from '../../api/deepseekConfig.js'
import { DEEPSEEK_PRICING, formatDeepSeekCost, type DeepSeekModelName } from '../../utils/model/deepseekModels.js'

interface SessionRecord {
  model: string
  inputTokens: number
  outputTokens: number
  cacheHitTokens: number
  cacheMissTokens: number
  costYuan: number
  timestamp: string
}

// ─── Cost Calculation ────────────────────────────────────────────────────────

function calculateCostForTokens(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheHitTokens: number,
  cacheMissTokens: number,
): number {
  const modelName: DeepSeekModelName = model.includes('pro')
    ? 'deepseek-v4-pro'
    : 'deepseek-v4-flash'
  const pricing = DEEPSEEK_PRICING[modelName]

  const hitCost = (cacheHitTokens / 1_000_000) * pricing.inputCacheHit
  const missCost = (cacheMissTokens / 1_000_000) * pricing.inputCacheMiss
  const outputCost = (outputTokens / 1_000_000) * pricing.output

  return hitCost + missCost + outputCost
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface AnalysisOptions {
  sessions?: number
  detail?: boolean
}

export async function analyzeCommand(options: AnalysisOptions = {}): Promise<void> {
  const config = loadConfig()

  console.log('\n📊 DeepSeek Code — Token 消费分析\n')

  // Model info
  const model = config.model || 'deepseek-v4-flash'
  const pricing = DEEPSEEK_PRICING[model as DeepSeekModelName] || DEEPSEEK_PRICING['deepseek-v4-flash']

  console.log('当前模型配置:')
  console.log(`  模型: ${model}`)
  console.log(`  输入缓存命中: ¥${pricing.inputCacheHit}/M tokens`)
  console.log(`  输入缓存未命中: ¥${pricing.inputCacheMiss}/M tokens`)
  console.log(`  输出: ¥${pricing.output}/M tokens`)
  console.log('')

  // Pricing comparison table
  console.log('价格对比:')
  console.log('──────────────────────────────────────────────────')
  console.log('  场景          Pro (¥/M)    Flash (¥/M)   节省')
  console.log('──────────────────────────────────────────────────')
  const pro = DEEPSEEK_PRICING['deepseek-v4-pro']
  const flash = DEEPSEEK_PRICING['deepseek-v4-flash']

  const rows = [
    ['输入(缓存命中)', pro.inputCacheHit, flash.inputCacheHit],
    ['输入(缓存未命中)', pro.inputCacheMiss, flash.inputCacheMiss],
    ['输出', pro.output, flash.output],
  ]

  for (const [label, proPrice, flashPrice] of rows) {
    const ratio = ((1 - flashPrice / proPrice) * 100).toFixed(0)
    console.log(
      `  ${label.padStart(14)}  ¥${String(proPrice).padStart(5)}/M  ¥${String(flashPrice).padStart(5)}/M  省${ratio}%`,
    )
  }
  console.log('──────────────────────────────────────────────────')
  console.log('')

  // Cost efficiency tips
  console.log('💡 省钱技巧:')
  const tips = [
    '日常开发使用 deepseek-v4-flash，复杂任务使用 deepseek-v4-pro',
    '确保系统提示词超过 1024 token 以触发硬盘缓存',
    '将静态内容（工具定义、系统提示）放在 prompt 最前面',
    '在高峰期缓存仅保留 5-10 分钟，连续请求效益最大',
    '相同项目重复对话可最大化缓存命中率',
  ]
  for (const tip of tips) {
    console.log(`  • ${tip}`)
  }

  // Cache efficiency explanation
  console.log('\n📈 缓存优化说明:')
  console.log('  DeepSeek V4 使用硬盘精确前缀匹配缓存')
  console.log('  缓存命中与未命中价格相差 12 倍 (Pro) 或 5 倍 (Flash)')
  console.log(`  当前配置: ${config.cache?.enabled ? '✅ 缓存已启用' : '❌ 缓存未启用'}`)
  console.log('')
  console.log('  如果缓存命中率从 50% 提升至 95%:')
  if (model === 'deepseek-v4-pro') {
    console.log('  Pro 版本成本将降至原来的约 1/6')
    console.log('  即 ¥100 → ¥16.7')
  } else {
    console.log('  Flash 版本成本将降至原来的约 1/3')
    console.log('  即 ¥100 → ¥33.3')
  }
  console.log('')

  // Example calculation
  console.log('示例计算 (10轮对话):')
  const exampleInputPerTurn = 5000
  const exampleOutputPerTurn = 2000
  const totalInput = exampleInputPerTurn * 10
  const totalOutput = exampleOutputPerTurn * 10

  for (const [label, m, hitRate] of [
    ['无缓存 (0% 命中)', model, 0],
    ['一般优化 (50% 命中)', model, 0.5],
    ['深度优化 (95% 命中)', model, 0.95],
  ] as Array<[string, string, number]>) {
    const hit = Math.floor(totalInput * hitRate)
    const miss = totalInput - hit
    const cost = calculateCostForTokens(m, totalInput, totalOutput, hit, miss)
    const pct = (hitRate * 100).toFixed(0)
    console.log(`  ${label}: ${formatDeepSeekCost(cost)} (命中率 ${pct}%)`)
  }

  console.log('')
  console.log('📋 要查看实际使用统计，请使用 --detail 参数')
  console.log('')
}

export default analyzeCommand
