#!/usr/bin/env node
/**
 * DeepSeek Code — npm 全局安装入口
 * ======================================
 * 一行命令安装: npm install -g deepseek-code
 * 使用: deepseek code （不分大小写）
 *
 * 交互模式说明：
 * - 首次运行自动弹出配置向导
 * - 配置后，deepseek code 直接进入交互式对话
 * - 支持流式输出，Ctrl+C 退出
 */

// ─── 版本号 ──────────────────────────────────────────────────────────────────

const VERSION = '1.0.0'

// ─── 工具函数 ────────────────────────────────────────────────────────────────

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { createInterface } from 'readline'

const USER_CONFIG_DIR = join(homedir(), '.deepcode')
const USER_CONFIG_PATH = join(USER_CONFIG_DIR, 'config.json')

function readConfig() {
  try {
    if (existsSync(USER_CONFIG_PATH)) {
      return JSON.parse(readFileSync(USER_CONFIG_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return {}
}

function writeConfig(config) {
  if (!existsSync(USER_CONFIG_DIR)) {
    mkdirSync(USER_CONFIG_DIR, { recursive: true })
  }
  writeFileSync(USER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

function getApiKey() {
  return process.env.DEEPSEEK_API_KEY || readConfig().apiKey || ''
}

function printBanner() {
  console.log('')
  console.log('  ╔══════════════════════════════════════════╗')
  console.log('  ║        DeepSeek Code v' + VERSION + '              ║')
  console.log('  ║  基于 DeepSeek V4 的 AI 编程助手          ║')
  console.log('  ║  一行命令安装，各平台通用                  ║')
  console.log('  ╚══════════════════════════════════════════╝')
  console.log('')
}

const DEEPSEEK_WHALE = `
   ▄████████████████▄     ╭╮
 ▄███████████████████▄  ╱  ╰╮
███████████████████████ ╱    │
████████████████████████    ╱
 ▀████████████████████▀  ╱──╯`

function printWhaleBanner() {
  console.log('\x1b[38;2;79;107;237m' + DEEPSEEK_WHALE + '\x1b[0m')
  console.log('')
  console.log('  \x1b[1mDeepSeek Code\x1b[0m v' + VERSION + '  —  \x1b[38;2;79;107;237m基于 DeepSeek V4\x1b[0m')
  console.log('  ️输入 /help 查看命令，Ctrl+C 或 /exit 退出')
  console.log('')
}

function printHelp() {
  printBanner()
  console.log('使用方式: deepseek <command> [options]')
  console.log('')
  console.log('一行安装:  npm install -g deepseek-code')
  console.log('快速开始:  deepseek code')
  console.log('')
  console.log('命令:')
  console.log('  code              启动交互式编程助手 ✓')
  console.log('  config [options]  配置向导')
  console.log('  doctor            环境诊断')
  console.log('  learn [options]   项目学习')
  console.log('  analyze           Token 消费分析')
  console.log('  preheat [options] 缓存预热')
  console.log('')
  console.log('选项:')
  console.log('  --version, -v     显示版本号')
  console.log('  --help, -h        显示帮助信息')
  console.log('')
  console.log('环境变量:')
  console.log('  DEEPSEEK_API_KEY    API Key (必需)')
  console.log('  DEEPSEEK_MODEL      模型: deepseek-v4-pro / deepseek-v4-flash')
  console.log('  DEEPSEEK_BASE_URL   API 地址')
  console.log('')
}

// ─── HTTP 请求 ───────────────────────────────────────────────────────────────

async function* streamChat(apiKey, model, messages, signal) {
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_tokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '8192', 10),
    }),
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API error (${response.status}): ${text}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const payload = trimmed.slice(6)
        if (payload === '[DONE]') return

        try {
          const chunk = JSON.parse(payload)
          const delta = chunk.choices?.[0]?.delta
          if (delta?.content) {
            yield delta.content
          }
          // Final usage
          if (chunk.usage) {
            yield { _usage: chunk.usage }
          }
        } catch { /* skip */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ─── 交互式对话 REPL ─────────────────────────────────────────────────────────

async function startInteractiveChat(apiKey) {
  const config = readConfig()
  const model = process.env.DEEPSEEK_MODEL || config.model || 'deepseek-v4-flash'

  printWhaleBanner()

  const messages = [
    { role: 'system', content: `你是 DeepSeek Code，一个基于 DeepSeek V4 的 AI 编程助手。
你运行在用户的终端中，帮助用户解决编程问题。
请用中文回答。回答要简洁、准确、有帮助。` }
  ]

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[38;2;79;107;237m▶ \x1b[0m',
  })

  rl.on('SIGINT', () => {
    console.log('\n\n👋 再见！')
    process.exit(0)
  })

  rl.prompt()

  for await (const line of rl) {
    const input = line.trim()

    // Handle commands
    if (input.startsWith('/')) {
      switch (input.toLowerCase()) {
        case '/exit':
        case '/quit':
        case '/q':
          console.log('👋 再见！')
          process.exit(0)
        case '/help':
        case '/h':
          console.log('')
          console.log('  /exit, /quit, /q  退出')
          console.log('  /clear            清除对话历史')
          console.log('  /model            查看当前模型')
          console.log('  /cost             查看价格信息')
          console.log('  /help             显示帮助')
          console.log('')
          rl.prompt()
          continue
        case '/clear':
          messages.length = 1  // Keep system prompt
          console.log('✅ 对话历史已清除')
          rl.prompt()
          continue
        case '/model':
          console.log('  当前模型: ' + model)
          rl.prompt()
          continue
        case '/cost':
          console.log('  ' + getPricingInfo(model))
          rl.prompt()
          continue
        default:
          console.log('  未知命令: ' + input + '  (输入 /help 查看帮助)')
          rl.prompt()
          continue
      }
    }

    if (!input) {
      rl.prompt()
      continue
    }

    console.log('')  // spacing

    // Add user message
    messages.push({ role: 'user', content: input })

    // Stream the response
    let fullResponse = ''
    let usage = null

    try {
      process.stdout.write('\x1b[38;2;79;107;237m')
      for await (const chunk of streamChat(apiKey, model, messages, null)) {
        if (chunk._usage) {
          usage = chunk._usage
        } else {
          process.stdout.write(chunk)
          fullResponse += chunk
        }
      }
      process.stdout.write('\x1b[0m')
      console.log('')
      console.log('')
    } catch (err) {
      process.stdout.write('\x1b[0m')
      console.log('\n❌ 错误: ' + err.message)
      if (err.message.includes('401') || err.message.includes('auth')) {
        console.log('   请检查 API Key 是否正确')
        console.log('   deepseek config --api-key sk-xxx')
      }
      console.log('')
      // Remove the failed user message
      messages.pop()
      rl.prompt()
      continue
    }

    // Add assistant response
    if (fullResponse) {
      messages.push({ role: 'assistant', content: fullResponse })
    }
    else {
      messages.pop()
    }

    // Show usage
    if (usage) {
      const cost = calculateCost(usage, model)
      console.log('\x1b[90m━━━━━━━━━━━━━━━━━━━  \x1b[0m' +
        'in: ' + (usage.prompt_tokens || 0) + '  out: ' + (usage.completion_tokens || 0) +
        (usage.prompt_cache_hit_tokens ? '  cache: ' + usage.prompt_cache_hit_tokens : '') +
        (cost > 0 ? '  ' + cost : '') +
        '\x1b[90m \x1b[0m')
    }

    rl.prompt()
  }
}

// ─── 成本计算 ────────────────────────────────────────────────────────────────

function calculateCost(usage, model) {
  const isPro = model.includes('pro')
  const miss = usage.prompt_cache_miss_tokens || usage.prompt_tokens || 0
  const hit = usage.prompt_cache_hit_tokens || 0
  const output = usage.completion_tokens || 0

  if (isPro) {
    const cost = (miss / 1_000_000) * 12 + (hit / 1_000_000) * 1 + (output / 1_000_000) * 12
    return cost >= 0.01 ? '¥' + cost.toFixed(2) : (cost * 100).toFixed(1) + '分'
  } else {
    const cost = (miss / 1_000_000) * 1 + (hit / 1_000_000) * 0.2 + (output / 1_000_000) * 1
    return cost >= 0.01 ? '¥' + cost.toFixed(2) : (cost * 100).toFixed(1) + '分'
  }
}

function getPricingInfo(model) {
  if (model.includes('pro')) {
    return 'deepseek-v4-pro: 输入 ¥12/M, 输出 ¥12/M (缓存 ¥1/M)'
  }
  return 'deepseek-v4-flash: 输入 ¥1/M, 输出 ¥1/M (缓存 ¥0.2/M)'
}

// ─── 配置向导 ────────────────────────────────────────────────────────────────

async function cmdConfig(options) {
  const config = readConfig()

  if (options.show) {
    printBanner()
    console.log('当前配置:')
    console.log('──────────────────────────────────────────')
    console.log(`  API Key:        ${config.apiKey ? '✅ 已配置 (' + config.apiKey.slice(0, 8) + '...)' : '❌ 未配置'}`)
    console.log(`  模型:           ${config.model || 'deepseek-v4-flash (默认)'}`)
    console.log(`  API 地址:       ${config.baseUrl || 'https://api.deepseek.com/v1 (默认)'}`)
    console.log(`  最大 Token:     ${config.maxTokens || 8192}`)
    console.log(`  月度预算:       ${config.budget?.monthlyCap ? '¥' + config.budget.monthlyCap : '未设置'}`)
    console.log('──────────────────────────────────────────')
    return
  }

  if (options.reset) {
    writeConfig({})
    console.log('✅ 配置已重置')
    return
  }

  // Non-interactive: set values from flags
  if (options.apiKey || options.model || options.baseUrl || options.maxTokens) {
    const updates = {}
    if (options.apiKey) updates.apiKey = options.apiKey
    if (options.model) updates.model = options.model
    if (options.baseUrl) updates.baseUrl = options.baseUrl
    if (options.maxTokens) updates.maxTokens = parseInt(options.maxTokens, 10)
    writeConfig({ ...config, ...updates })
    console.log('✅ 配置已保存')
    return
  }

  // Validate
  if (options.validate) {
    const apiKey = options.apiKey || config.apiKey || process.env.DEEPSEEK_API_KEY
    if (!apiKey) { console.log('❌ API Key 未配置'); return }
    console.log('正在验证 API 连接...')
    const start = Date.now()
    try {
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'deepseek-v4-flash', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
      })
      const latency = Date.now() - start
      if (resp.ok) {
        console.log(`✅ API 连接成功 (${latency}ms)`)
      } else {
        const text = await resp.text()
        console.log(`❌ API 连接失败 (${resp.status}): ${text}`)
      }
    } catch (err) {
      console.log('❌ 连接错误: ' + err.message)
    }
    return
  }

  // Interactive mode (simplified)
  printBanner()
  console.log('DeepSeek Code 配置向导')
  console.log('──────────────────────────────────────────')
  console.log('')
  console.log('获取 API Key: https://platform.deepseek.com/api_keys')
  console.log('')
  console.log('当前: ' + (config.apiKey ? '✅ 已配置' : '❌ 未配置'))
  console.log('')
  console.log('用法:')
  console.log('  deepseek config --api-key sk-xxx')
  console.log('  deepseek config --model deepseek-v4-pro')
  console.log('  deepseek config --show')
  console.log('  deepseek config --validate')
  console.log('')
  console.log('或设置环境变量:')
  console.log('  export DEEPSEEK_API_KEY=sk-xxx')
  console.log('')
}

// ─── 环境诊断 ────────────────────────────────────────────────────────────────

async function cmdDoctor() {
  console.log('\x1b[38;2;79;107;237m' + DEEPSEEK_WHALE + '\x1b[0m')
  console.log('')
  console.log('  \x1b[1mDeepSeek Code\x1b[0m v' + VERSION + '  —  环境诊断')
  console.log('  ═══════════════════════════════════════')
  console.log('')

  const config = readConfig()
  let allPass = true

  // API Key
  const apiKey = process.env.DEEPSEEK_API_KEY || config.apiKey
  console.log((apiKey ? '  ✅' : '  ❌') + ' API Key: ' + (apiKey ? '已配置 (' + apiKey.slice(0, 8) + '...)' : '未配置'))
  if (!apiKey) allPass = false

  // Node.js
  const majorVer = parseInt(process.version.slice(1).split('.')[0], 10)
  console.log((majorVer >= 18 ? '  ✅' : '  ❌') + ' Node.js: ' + process.version)

  // Platform
  console.log('  ✅ 平台: ' + process.platform + ' (' + process.arch + ')')

  // Config
  console.log(existsSync(USER_CONFIG_PATH) ? '  ✅' : '  ⚠️ ') + ' 配置文件: ' + (existsSync(USER_CONFIG_PATH) ? USER_CONFIG_PATH : '不存在（将使用环境变量）')

  // API test
  if (apiKey) {
    console.log('')
    console.log('  正在测试 API 连接...')
    const start = Date.now()
    try {
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'deepseek-v4-flash', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
      })
      const latency = Date.now() - start
      if (resp.ok) {
        console.log('  ✅ API 连接成功 (' + latency + 'ms)')
        console.log(latency < 500 ? '     低延迟' : latency < 2000 ? '     延迟可接受' : '     高延迟，建议检查网络')
      } else {
        console.log('  ❌ API 连接失败 (' + resp.status + ')')
        allPass = false
      }
    } catch (err) {
      console.log('  ❌ API 连接错误: ' + err.message)
      allPass = false
    }
  }

  // Model info
  const model = config.model || 'deepseek-v4-flash'
  console.log('  ✅ 模型: ' + model)
  console.log('')
  console.log('  价格: ' + getPricingInfo(model))
  console.log('')

  console.log('  ═══════════════════════════════════════')
  if (allPass) {
    console.log('  总体状态: \x1b[32m✅ 一切正常\x1b[0m')
    console.log('  输入 \x1b[1mdeepseek code\x1b[0m 开始使用')
  } else {
    console.log('  总体状态: \x1b[31m❌ 存在问题\x1b[0m')
    console.log('  运行 deepseek config --api-key sk-xxx 配置')
  }
  console.log('')
}

// ─── 项目学习 ────────────────────────────────────────────────────────────────

async function cmdLearn(options) {
  printBanner()
  console.log('项目学习模式')
  console.log('')

  const projectRoot = process.cwd()
  console.log('项目: ' + projectRoot)
  console.log('正在扫描...')

  const { globSync } = await import('glob')
  const patterns = ['**/*.{ts,tsx,js,jsx,py,rs,go,java,rb,c,cpp,cs,swift,kt,vue,svelte,json,yaml,yml,md}']
  const ignore = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/target/**', '**/coverage/**']

  const files = []
  for (const pattern of patterns) {
    const matches = globSync(pattern, { cwd: projectRoot, ignore, nodir: true })
    files.push(...matches)
  }

  const totalFiles = files.length
  const langCount = {}

  for (const file of files.slice(0, 200)) {
    const ext = file.split('.').pop().toLowerCase()
    const map = { ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', py: 'Python', rs: 'Rust', go: 'Go', java: 'Java', rb: 'Ruby', cs: 'C#', swift: 'Swift', kt: 'Kotlin' }
    const lang = map[ext] || ext
    langCount[lang] = (langCount[lang] || 0) + 1
  }

  console.log('\n扫描结果:')
  console.log('  文件数: ~' + totalFiles)

  if (Object.keys(langCount).length > 0) {
    console.log('  语言: ' + Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, c]) => l + ' (' + c + ')').join(', '))
  }

  // Save index
  const indexPath = join(projectRoot, '.deepcode', 'index.json')
  if (!existsSync(join(projectRoot, '.deepcode'))) mkdirSync(join(projectRoot, '.deepcode'), { recursive: true })
  writeFileSync(indexPath, JSON.stringify({ projectRoot, indexedAt: Date.now(), summary: { totalFiles, languages: langCount } }, null, 2))
  console.log('✅ 索引已保存')
  console.log('')
}

// ─── Token 分析 ──────────────────────────────────────────────────────────────

async function cmdAnalyze() {
  printBanner()
  console.log('Token 消费分析')
  console.log('')

  const model = readConfig().model || 'deepseek-v4-flash'
  console.log('当前模型: ' + model + '\n')

  console.log('价格对比（每百万 Token）')
  console.log('──────────────────────────────────────────')
  console.log('  项目'.padEnd(20) + 'Pro (¥)'.padEnd(15) + 'Flash (¥)'.padEnd(15) + '节省')
  console.log('──────────────────────────────────────────')

  const items = [
    ['输入 (缓存命中)', 1, 0.2],
    ['输入 (缓存未命中)', 12, 1],
    ['输出', 12, 1],
  ]
  for (const [label, p, f] of items) {
    const saving = ((1 - f / p) * 100).toFixed(0)
    console.log('  ' + String(label).padEnd(20) + '¥' + String(p).padEnd(11) + '¥' + String(f).padEnd(11) + '省' + saving + '%')
  }
  console.log('──────────────────────────────────────────\n')

  const isPro = model.includes('pro')
  const price = isPro ? { hit: 1, miss: 12, out: 12 } : { hit: 0.2, miss: 1, out: 1 }

  console.log('示例（10轮对话，约 50K 输入 + 20K 输出）:')
  for (const [label, rate] of [['无缓存   (0%)', 0], ['一般优化 (50%)', 0.5], ['深度优化 (95%)', 0.95]]) {
    const hit = Math.floor(50000 * rate)
    const miss = 50000 - hit
    const cost = (hit / 1e6) * price.hit + (miss / 1e6) * price.miss + (20000 / 1e6) * price.out
    const str = cost >= 0.01 ? '¥' + cost.toFixed(4) : (cost * 100).toFixed(2) + '分'
    console.log('  ' + String(label).padEnd(18) + str)
  }
  console.log('')

  console.log('💡 省钱技巧:')
  console.log('  • 日常用 Flash，复杂任务用 Pro')
  console.log('  • 确保系统提示词超过 1024 token 触发硬盘缓存')
  console.log('  • 缓存命中与未命中价格相差 ' + (isPro ? '12 倍' : '5 倍'))
  console.log('')
}

// ─── 缓存预热 ────────────────────────────────────────────────────────────────

async function cmdPreheat(options) {
  const apiKey = getApiKey()
  if (!apiKey) { console.log('❌ API Key 未配置'); return }

  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
  console.log('\n🔥 DeepSeek Code 缓存预热\n')

  const prefix = 'You are DeepSeek Code, an AI programming assistant. Available tools: BashTool, FileReadTool, FileWriteTool, FileEditTool, GlobTool, GrepTool, WebFetchTool, WebSearchTool. Coding standards: TypeScript strict mode, type-safe code, error handling, const over let, arrow functions, template literals.'
  const tokens = Math.ceil(prefix.length / 4)
  console.log('前缀: ~' + tokens + ' tokens' + (tokens < 1024 ? ' (⚠️ 不足 1024)' : ''))

  if (tokens < 1024 && !options.force) {
    console.log('使用 --force 强制预热')
    console.log('')
    return
  }

  console.log('正在预热...')
  try {
    const start = Date.now()
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: prefix }, { role: 'user', content: '[warmup]' }], max_tokens: 1 }),
    })
    const data = await resp.json()
    const ms = Date.now() - start
    console.log('✅ 完成 (' + ms + 'ms)')
    if (data.usage) console.log('  tokens: ' + data.usage.prompt_tokens + (data.usage.prompt_cache_hit_tokens ? '  cache hit: ' + data.usage.prompt_cache_hit_tokens : ''))
    console.log('')
  } catch (err) {
    console.log('❌ 失败: ' + err.message)
  }
}

// ─── 主入口 ──────────────────────────────────────────────────────────────────

async function main() {
  const rawArgs = process.argv.slice(2)
  const command = (rawArgs[0] || '').toLowerCase()
  const rest = rawArgs.slice(1)

  // --version
  if (['--version', '-v', '-V'].includes(command)) {
    console.log(VERSION + ' (DeepSeek Code)')
    return
  }

  // --help / no args
  if (!command || ['--help', '-h', '-?', '/?'].includes(command)) {
    printHelp()
    return
  }

  // "code" / "repl" → interactive chat
  if (command === 'code' || command === 'repl' || command === 'start' || command === 'run') {
    const apiKey = getApiKey()
    if (!apiKey) {
      console.log('\n❌ 首次使用需要配置 API Key')
      console.log('   快速配置: deepseek config --api-key sk-xxx')
      console.log('   或设置:   export DEEPSEEK_API_KEY=sk-xxx')
      console.log('')
      console.log('   获取 Key: https://platform.deepseek.com/api_keys')
      console.log('')
      process.exit(1)
    }
    await startInteractiveChat(apiKey)
    return
  }

  // Route other commands
  switch (command) {
    case 'config': {
      const opts = {}
      for (let i = 0; i < rest.length; i++) {
        switch (rest[i]) {
          case '--show': opts.show = true; break
          case '--reset': opts.reset = true; break
          case '--validate': opts.validate = true; break
          case '--api-key': opts.apiKey = rest[++i]; break
          case '--model': opts.model = rest[++i]; break
          case '--base-url': opts.baseUrl = rest[++i]; break
          case '--max-tokens': opts.maxTokens = rest[++i]; break
        }
      }
      await cmdConfig(opts)
      break
    }
    case 'doctor':
      await cmdDoctor()
      break
    case 'learn':
      await cmdLearn({ refresh: rest.includes('--refresh') })
      break
    case 'analyze':
      await cmdAnalyze()
      break
    case 'preheat':
      await cmdPreheat({ force: rest.includes('--force') })
      break
    default:
      console.log('\n未知命令: ' + command)
      console.log('使用 --help 查看帮助\n')
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
