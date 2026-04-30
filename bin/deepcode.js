#!/usr/bin/env node
/**
 * DeepSeek Code CLI Entry Point
 *
 * DeepSeek Code — 基于 DeepSeek V4 的 AI 编程助手
 * 一行命令安装，各平台通用：npm install -g deepseek-code
 * 使用方式：deepseek code （不分大小写）
 *
 * 环境变量配置:
 *   DEEPSEEK_API_KEY  - API Key (必需)
 *   DEEPSEEK_MODEL    - 模型: deepseek-v4-pro | deepseek-v4-flash (默认: deepseek-v4-flash)
 *   DEEPSEEK_BASE_URL - API 地址 (默认: https://api.deepseek.com/v1)
 *   DEEPSEEK_MAX_TOKENS - 最大 Token 数 (默认: 8192)
 */

// ─── Version ─────────────────────────────────────────────────────────────────

const VERSION = '1.0.0'

// ─── Shebang detection: support both Bun and Node.js ─────────────────────────

// Detect if running on Bun
const isBun = typeof Bun !== 'undefined'

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Process args: handle "deepseek code" → args[0] = "code"
  // Normalize: case-insensitive command matching
  const rawArgs = process.argv.slice(2)
  const args = rawArgs.map(a => a.toLowerCase())
  const command = args[0] || ''

  // Fast path: --version / -v / -V
  if (['--version', '-v', '-V'].includes(command)) {
    console.log(`${VERSION} (DeepSeek Code)`)
    process.exit(0)
  }

  // Fast path: help
  if (!command || ['--help', '-h'].includes(command)) {
    printHelp()
    process.exit(0)
  }

  // "code" subcommand → launch REPL (supports "deepseek code")
  // Treat "code" as equivalent to no command → enter interactive mode
  if (command === 'code') {
    const restArgs = rawArgs.slice(1)
    await startRepl(restArgs)
    return
  }

  // Command routing (case-insensitive)
  switch (command) {
    case 'config':
      await handleConfig(rawArgs.slice(1))
      return

    case 'doctor':
      await handleDoctor()
      return

    case 'learn':
      await handleLearn(rawArgs.slice(1))
      return

    case 'analyze':
      await handleAnalyze()
      return

    case 'preheat':
      await handlePreheat(rawArgs.slice(1))
      return

    case 'repl':
    case 'start':
    case 'run':
      await startRepl(rawArgs.slice(1))
      return

    default:
      // Unknown command or direct REPL launch
      // Check if DEEPSEEK_API_KEY is configured
      const { getApiKey } = await loadConfigModule()
      const apiKey = process.env.DEEPSEEK_API_KEY || getApiKey()

      if (apiKey) {
        // If we have an API key, try launching REPL with all args
        await startRepl(rawArgs)
      } else {
        console.log('')
        console.log('  ╔══════════════════════════════════════════╗')
        console.log('  ║       DeepSeek Code v' + VERSION.padEnd(26) + '║')
        console.log('  ║  基于 DeepSeek V4 的 AI 编程助手         ║')
        console.log('  ╚══════════════════════════════════════════╝')
        console.log('')
        console.log('❌ DEEPSEEK_API_KEY 未配置')
        console.log('')
        console.log('快速配置:')
        console.log('  方法1: export DEEPSEEK_API_KEY=sk-xxx && deepseek code')
        console.log('  方法2: deepseek config')
        console.log('')
        console.log('一行安装:')
        console.log('  npm install -g deepseek-code')
        console.log('')
        process.exit(1)
      }
  }
}

// ─── Lazy module loading ────────────────────────────────────────────────────

async function loadConfigModule() {
  return import('../src/api/deepseekConfig.js')
}

async function loadApiModule() {
  return import('../src/api/deepseekApi.js')
}

// ─── Command Handlers ────────────────────────────────────────────────────────

async function handleConfig(args: string[]): Promise<void> {
  const { configCommand } = await import('../src/commands/deepcode/config.js')

  const options: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    switch (arg) {
      case '--show':        options.show = true; break
      case '--reset':       options.reset = true; break
      case '--validate':    options.validate = true; break
      case '--api-key':     options.apiKey = args[++i]; break
      case '--model':       options.model = args[++i]; break
      case '--base-url':    options.baseUrl = args[++i]; break
      case '--max-tokens':  options.maxTokens = args[++i]; break
    }
  }
  await configCommand(options)
}

async function handleDoctor(): Promise<void> {
  const { doctorCommand } = await import('../src/commands/deepcode/doctor.js')
  await doctorCommand()
}

async function handleLearn(args: string[]): Promise<void> {
  const { learnCommand } = await import('../src/commands/deepcode/learn.js')
  const options: Record<string, boolean | string> = {}
  if (args.includes('--refresh')) options.refresh = true
  await learnCommand(options)
}

async function handleAnalyze(): Promise<void> {
  const { analyzeCommand } = await import('../src/commands/deepcode/analyze.js')
  await analyzeCommand()
}

async function handlePreheat(args: string[]): Promise<void> {
  const { preheatCommand } = await import('../src/commands/deepcode/preheat.js')
  const options: Record<string, boolean | string> = {}
  if (args.includes('--force')) options.force = true
  await preheatCommand(options)
}

// ─── REPL Mode ───────────────────────────────────────────────────────────────

async function startRepl(args: string[]): Promise<void> {
  const { loadConfigFromEnv, setDeepSeekConfig } = await loadApiModule()
  const { loadConfig, getApiKey } = await loadConfigModule()

  // Load configuration from all sources
  loadConfigFromEnv()
  const config = loadConfig()
  const apiKey = process.env.DEEPSEEK_API_KEY || config.apiKey || ''

  if (!apiKey) {
    console.log('\n❌ DEEPSEEK_API_KEY 未配置')
    console.log('请运行: deepseek config')
    console.log('或设置: export DEEPSEEK_API_KEY=sk-xxx\n')
    process.exit(1)
  }

  // Initialize DeepSeek config
  setDeepSeekConfig({
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL || config.baseUrl || 'https://api.deepseek.com/v1',
    model: (process.env.DEEPSEEK_MODEL || config.model || 'deepseek-v4-flash') as 'deepseek-v4-pro' | 'deepseek-v4-flash',
  })

  console.log('')
  console.log(`  ╔══════════════════════════════════════════╗`)
  console.log(`  ║        DeepSeek Code v${VERSION}              ║`)
  console.log(`  ║  基于 DeepSeek V4 的 AI 编程助手          ║`)
  console.log(`  ╚══════════════════════════════════════════╝`)
  console.log(`  模型: ${config.model || 'deepseek-v4-flash'}`)
  console.log(`  API:  ${config.baseUrl || 'https://api.deepseek.com/v1'}`)
  console.log('')

  // Attempt to launch the full REPL
  // Falls back to a simple interactive mode if the REPL isn't available
  try {
    // Set environment for child processes
    process.env.DEEPSEEK_API_KEY = apiKey
    if (config.model) process.env.DEEPSEEK_MODEL = config.model

    // Try importing the real Claude Code REPL launcher
    // This works when running from source with Bun
    const { launchRepl } = await import('../src/replLauncher.js')
    await launchRepl(args)
  } catch (err) {
    // REPL not available (e.g., running from npm without full source)
    console.log('交互模式需要完整的源代码环境。')
    console.log('请从 GitHub 克隆完整仓库:')
    console.log('  git clone https://github.com/yourusername/deepseek-code.git')
    console.log('  cd deepseek-code && bun install && bun run bin/deepcode.js')
    console.log('')
    console.log('或者使用子命令:')
    console.log('  deepseek doctor   环境诊断')
    console.log('  deepseek learn    项目学习')
    console.log('  deepseek analyze  Token 分析')
    console.log('')
  }
}

// ─── Help ────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║     DeepSeek Code v${VERSION}                  ║
  ║     一行命令安装，各平台通用               ║
  ╚══════════════════════════════════════════╝

使用方式: deepseek <command> [options]

快速开始:
  npm install -g deepseek-code          # 安装
  export DEEPSEEK_API_KEY=sk-xxx       # 配置 Key
  deepseek code                         # 启动编程助手

命令:
  code [options]     启动交互式编程助手（默认）
  config [options]   配置向导 — 设置 API Key、模型、预算
  doctor             环境诊断 — 检查连接和性能状态
  learn [options]    项目学习 — 扫描并建立知识索引
  analyze            Token 消费深度分析
  preheat [options]  缓存预热 — 构建 DeepSeek 硬盘缓存

选项:
  --version, -v      显示版本号
  --help, -h         显示帮助信息

环境变量:
  DEEPSEEK_API_KEY    DeepSeek API Key (必需)
  DEEPSEEK_MODEL      模型: deepseek-v4-pro / deepseek-v4-flash
  DEEPSEEK_BASE_URL   API 地址 (默认: https://api.deepseek.com/v1)
  DEEPSEEK_MAX_TOKENS  最大 Token 数 (默认: 8192)

示例:
  deepseek config                      交互式配置
  deepseek config --api-key sk-xxx     静默配置
  deepseek config --model deepseek-v4-pro  选择模型
  deepseek doctor                      健康检查
  deepseek learn                       学习项目
  deepseek learn --refresh             重新索引
  deepseek analyze                     查看成本分析
  deepseek preheat                     预热缓存
  deepseek preheat --force             强制预热
  DEEPSEEK_API_KEY=sk-xxx deepseek code  一行启动
`)
}

// ─── Entry ───────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
