/**
 * `deepcode config` — Configuration Wizard
 *
 * Interactive setup for DeepSeek API key, model selection, and budget limits.
 * Also supports non-interactive mode via flags for CI/CD.
 */

import { loadConfig, saveUserConfig, validateConfig, reloadConfig, type DeepCodeConfig, type ModelType } from '../../api/deepseekConfig.js'
import { validateApiKey } from '../../api/deepseekApi.js'
import { formatDeepSeekCost } from '../../utils/model/deepseekModels.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConfigCommandOptions {
  apiKey?: string
  model?: string
  baseUrl?: string
  maxTokens?: string
  show?: boolean
  reset?: boolean
  validate?: boolean
}

// ─── Display ─────────────────────────────────────────────────────────────────

function printBanner(): void {
  console.log('')
  console.log('  ╔══════════════════════════════════════════╗')
  console.log('  ║       DeepSeek Code 配置向导              ║')
  console.log('  ║       一键配置，极致性价比                  ║')
  console.log('  ╚══════════════════════════════════════════╝')
  console.log('')
}

function printConfig(config: DeepCodeConfig): void {
  console.log('当前配置:')
  console.log('──────────────────────────────────────────')
  console.log(`  API Key:        ${config.apiKey ? '✅ 已配置' : '❌ 未配置'}`)
  console.log(`  模型:           ${config.model || 'deepseek-v4-flash (默认)'}`)
  console.log(`  API 地址:       ${config.baseUrl || 'https://api.deepseek.com/v1'}`)
  console.log(`  最大 Token:     ${config.maxTokens || 8192}`)
  console.log(`  缓存:          ${config.cache?.enabled ? '✅ 启用' : '❌ 禁用'}`)
  console.log(`  缓存预热:       ${config.cache?.warmup ? '✅ 开启' : '❌ 关闭'}`)
  console.log(`  语义缓存:       ${config.cache?.semanticCache ? '✅ 开启' : '❌ 关闭'}`)
  console.log(`  自动切换模型:   ${config.autoSwitch?.enabled ? '✅ 启用' : '❌ 禁用'}`)
  if (config.budget?.monthlyCap) {
    console.log(`  月度预算:       ${formatDeepSeekCost(config.budget.monthlyCap)}`)
  }
  if (config.budget?.alertThreshold) {
    console.log(`  预警阈值:       ${formatDeepSeekCost(config.budget.alertThreshold)}`)
  }
  console.log('──────────────────────────────────────────')
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function configCommand(options: ConfigCommandOptions): Promise<void> {
  // Show current config
  if (options.show) {
    const config = loadConfig()
    printConfig(config)
    return
  }

  // Reset config
  if (options.reset) {
    saveUserConfig({
      apiKey: '',
      model: 'deepseek-v4-flash',
      baseUrl: 'https://api.deepseek.com/v1',
    } as DeepCodeConfig)
    console.log('✅ 配置已重置为默认值')
    return
  }

  // Validate config
  if (options.validate) {
    const config = loadConfig()
    const result = validateConfig(config)
    printConfig(config)

    if (result.errors.length > 0) {
      console.log('\n❌ 错误:')
      for (const err of result.errors) {
        console.log(`  • ${err}`)
      }
    }
    if (result.warnings.length > 0) {
      console.log('\n⚠️  警告:')
      for (const warn of result.warnings) {
        console.log(`  • ${warn}`)
      }
    }
    if (result.valid) {
      console.log('\n✅ 配置有效')

      // Test API connection
      console.log('\n正在测试 API 连接...')
      if (config.apiKey) {
        const valid = await validateApiKey(config.apiKey)
        if (valid) {
          console.log('✅ API 连接成功')
        } else {
          console.log('❌ API 连接失败，请检查 API Key 是否正确')
        }
      }
    }
    return
  }

  // Non-interactive mode (from flags)
  const updates: Partial<DeepCodeConfig> = {}
  if (options.apiKey) updates.apiKey = options.apiKey
  if (options.model) updates.model = options.model as ModelType
  if (options.baseUrl) updates.baseUrl = options.baseUrl
  if (options.maxTokens) updates.maxTokens = parseInt(options.maxTokens, 10)

  if (Object.keys(updates).length > 0) {
    saveUserConfig(updates)
    console.log('✅ 配置已更新')
    // Reload to verify
    reloadConfig()
    printConfig(loadConfig())
    return
  }

  // Interactive mode
  printBanner()

  // Step 1: API Key
  console.log('Step 1: 输入你的 DeepSeek API Key')
  console.log('  (可在 https://platform.deepseek.com/api_keys 获取)')
  const apiKeyInput = process.env.DEEPSEEK_API_KEY || ''
  if (apiKeyInput) {
    console.log(`  检测到环境变量 DEEPSEEK_API_KEY: ${apiKeyInput.slice(0, 8)}...`)
  } else {
    console.log('  请在后续配置文件中设置 DEEPSEEK_API_KEY')
  }

  // Step 2: Model selection
  console.log('\nStep 2: 选择默认模型')
  console.log('  1) deepseek-v4-flash (默认) — 快速响应，极致性价比')
  console.log('  2) deepseek-v4-pro — 深度推理，能力最强')
  console.log('  3) Auto — 根据任务自动切换')

  // Step 3: Budget
  console.log('\nStep 3: 设置预算上限（可选）')
  console.log('  可在 ~/.deepcode/config.json 中配置预算限制')

  // Step 4: Cache
  console.log('\nStep 4: 缓存策略')
  console.log('  深度缓存:     ✅ 默认启用 (利用 DeepSeek 硬盘缓存)')
  console.log('  语义缓存:     ❌ 默认关闭 (需额外存储空间)')
  console.log('  缓存预热:     ❌ 默认关闭 (可在 CI/CD 中使用 deepcode preheat)')

  console.log('\n──────────────────────────────────────────')
  console.log('配置完成！运行 `deepcode doctor` 验证连接。')
}

/**
 * Format cost for display in config.
 */
export { formatDeepSeekCost as formatCost }

export default configCommand
