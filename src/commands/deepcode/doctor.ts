/**
 * `deepcode doctor` — Diagnostic Command
 *
 * Checks API connectivity, cache status, configuration validity,
 * and provides optimization recommendations for DeepSeek Code.
 */

import { loadConfig, validateConfig } from '../../api/deepseekConfig.js'
import { validateApiKey, listModels } from '../../api/deepseekApi.js'
import { formatDeepSeekCost } from '../../utils/model/deepseekModels.js'

interface DoctorResult {
  status: 'healthy' | 'warning' | 'error'
  checks: HealthCheck[]
  recommendations: string[]
}

interface HealthCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  detail?: string
}

function formatStatus(status: string): string {
  switch (status) {
    case 'pass': return '✅'
    case 'warn': return '⚠️ '
    case 'fail': return '❌'
    default: return '❓'
  }
}

export async function doctorCommand(): Promise<void> {
  console.log('')
  console.log('  ╔══════════════════════════════════════════╗')
  console.log('  ║     DeepSeek Code 环境诊断               ║')
  console.log('  ║     检查配置、连接和性能状态               ║')
  console.log('  ╚══════════════════════════════════════════╝')
  console.log('')

  const checks: HealthCheck[] = []
  const recommendations: string[] = []

  // 1. Configuration check
  const config = loadConfig()
  const validation = validateConfig(config)
  checks.push({
    name: '配置文件',
    status: validation.valid ? 'pass' : 'fail',
    message: validation.valid ? '配置有效' : '配置有误',
    detail: validation.errors.join('; '),
  })
  recommendations.push(...validation.warnings.map(w => `[配置建议] ${w}`))

  // 2. API Key check
  const hasKey = !!config.apiKey
  checks.push({
    name: 'API Key',
    status: hasKey ? 'pass' : 'fail',
    message: hasKey ? '已配置' : '未配置 API Key',
  })

  // 3. API connectivity test
  if (hasKey) {
    const startTime = Date.now()
    const valid = await validateApiKey(config.apiKey!)
    const latency = Date.now() - startTime
    checks.push({
      name: 'API 连接',
      status: valid ? 'pass' : 'fail',
      message: valid
        ? `连接成功 (${latency}ms)`
        : '连接失败，请检查 API Key 和网络',
    })
    if (valid) {
      checks.push({
        name: 'API 延迟',
        status: latency < 500 ? 'pass' : latency < 2000 ? 'warn' : 'fail',
        message: `${latency}ms`,
        detail: latency < 500 ? '低延迟' : latency < 2000 ? '可接受' : '高延迟，考虑更换网络',
      })
    }

    // 4. Model availability
    try {
      const models = await listModels()
      const hasPro = models.some(m => m.includes('deepseek-v4-pro'))
      const hasFlash = models.some(m => m.includes('deepseek-v4-flash'))
      checks.push({
        name: '模型可用性',
        status: hasPro && hasFlash ? 'pass' : 'warn',
        message: `可用模型: ${models.length > 0 ? models.join(', ') : '未获取到模型列表'}`,
        detail: !hasPro ? 'deepseek-v4-pro 不可用' : undefined,
      })
    } catch {
      checks.push({
        name: '模型可用性',
        status: 'warn',
        message: '无法获取模型列表',
      })
    }
  }

  // 5. Environment
  const nodeVersion = process.version
  const platform = process.platform
  checks.push({
    name: '运行环境',
    status: 'pass',
    message: `Node.js ${nodeVersion} · ${platform}`,
  })

  // 6. Cache configuration
  if (config.cache?.enabled) {
    checks.push({
      name: '深度缓存',
      status: 'pass',
      message: `已启用 (最小前缀 ${config.cache.minPrefixTokens || 1024} tokens)`,
    })
    if (!config.cache.warmup) {
      recommendations.push('[性能建议] 开启缓存预热可提升首次请求速度: deepcode preheat')
    }
  }

  // 7. Model recommendation
  if (config.model === 'deepseek-v4-pro') {
    recommendations.push('[成本建议] 日常开发建议使用 deepseek-v4-flash，可大幅降低成本')
  }

  // Determine overall status
  const hasFail = checks.some(c => c.status === 'fail')
  const hasWarn = checks.some(c => c.status === 'warn')
  const overallStatus: DoctorResult['status'] = hasFail ? 'error' : hasWarn ? 'warning' : 'healthy'

  // Print results
  const statusLabel = overallStatus === 'healthy' ? '✅ 一切正常' : overallStatus === 'warning' ? '⚠️  需要关注' : '❌ 存在问题'
  console.log(`总体状态: ${statusLabel}\n`)

  // Group checks by status
  const failed = checks.filter(c => c.status === 'fail')
  const warnings = checks.filter(c => c.status === 'warn')
  const passed = checks.filter(c => c.status === 'pass')

  for (const check of [...failed, ...warnings, ...passed]) {
    console.log(`  ${formatStatus(check.status)} ${check.name}: ${check.message}`)
    if (check.detail) {
      console.log(`     ${check.detail}`)
    }
  }

  // Recommendations
  if (recommendations.length > 0) {
    console.log('\n📋 优化建议:')
    for (const rec of recommendations) {
      console.log(`  • ${rec}`)
    }
  }

  // Cost estimate
  if (config.model) {
    const modelName = config.model === 'deepseek-v4-pro' ? 'deepseek-v4-pro' : 'deepseek-v4-flash'
    const pricing = modelName === 'deepseek-v4-pro'
      ? { cacheHit: 1, cacheMiss: 12, output: 12 }
      : { cacheHit: 0.2, cacheMiss: 1, output: 1 }

    console.log('\n💰 价格参考:')
    console.log(`  模型: ${modelName}`)
    console.log(`  输入 (缓存命中): ¥${pricing.cacheHit}/M tokens`)
    console.log(`  输入 (缓存未命中): ¥${pricing.cacheMiss}/M tokens`)
    console.log(`  输出: ¥${pricing.output}/M tokens`)
    console.log('  上下文窗口: 1M tokens')
  }

  console.log('')
}

export default doctorCommand
