#!/usr/bin/env node
/**
 * DeepSeek Code — npm 全局安装入口
 * ======================================
 * 一行命令安装: npm install -g deepseek-code
 * 使用: deepseek code [命令]
 *
 * 这是一个自包含的 Node.js 脚本，发布到 npm 后可在各平台直接运行。
 * 无需 TypeScript 编译、无需 Bun 运行时。
 *
 * 完整 REPL 交互模式需要从 GitHub 克隆源码使用 Bun 运行，
 * 所有 CLI 命令（config/doctor/learn/analyze/preheat）无需额外依赖即可使用。
 */

// ─── 版本号 ──────────────────────────────────────────────────────────────────

const VERSION = '1.0.0'

// ─── 工具函数 ────────────────────────────────────────────────────────────────

function printBanner() {
  console.log('')
  console.log('  ╔══════════════════════════════════════════╗')
  console.log('  ║        DeepSeek Code v' + VERSION + '              ║')
  console.log('  ║  基于 DeepSeek V4 的 AI 编程助手          ║')
  console.log('  ║  一行命令安装，各平台通用                  ║')
  console.log('  ╚══════════════════════════════════════════╝')
  console.log('')
}

function printHelp() {
  printBanner()
  console.log('使用方式: deepseek <command> [options]')
  console.log('')
  console.log('一行安装:')
  console.log('  npm install -g deepseek-code')
  console.log('')
  console.log('快速开始:')
  console.log('  export DEEPSEEK_API_KEY=sk-xxx')
  console.log('  deepseek code                       启动编程助手')
  console.log('')
  console.log('命令:')
  console.log('  code              启动交互式编程助手（需要源码 + Bun）')
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
  console.log('  DEEPSEEK_API_KEY    DeepSeek API Key (必需)')
  console.log('  DEEPSEEK_MODEL      模型: deepseek-v4-pro / deepseek-v4-flash')
  console.log('  DEEPSEEK_BASE_URL   API 地址 (默认: https://api.deepseek.com/v1)')
  console.log('  DEEPSEEK_MAX_TOKENS 最大 Token (默认: 8192)')
  console.log('')
  console.log('示例:')
  console.log('  deepseek config                交互式配置')
  console.log('  deepseek config --show        查看配置')
  console.log('  deepseek doctor               环境诊断')
  console.log('  deepcoder doctor              健康检查（不分大小写）')
  console.log('  deepseek learn                学习项目')
  console.log('  DEEPSEEK_API_KEY=sk-xxx deepseek code  一行启动')
  console.log('')
}

// ─── 文件操作函数（自包含，无外部依赖） ──────────────────────────────────

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join, resolve } from 'path'

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

// ─── HTTP 请求函数（自包含，仅用原生 fetch） ─────────────────────────────

async function deepseekRequest(path, body, apiKey, signal) {
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'User-Agent': 'DeepSeekCode/1.0',
    },
    body: JSON.stringify(body),
    signal,
  })
  return response
}

async function validateApiKey(apiKey) {
  try {
    const response = await deepseekRequest('/chat/completions', {
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 1,
    }, apiKey, null)
    return response.ok
  } catch { return false }
}

// ─── 命令实现 ────────────────────────────────────────────────────────────────

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
    console.log(`  缓存:          ${config.cache?.enabled !== false ? '✅ 启用' : '❌ 禁用'}`)
    console.log(`  月度预算:       ${config.budget?.monthlyCap ? '¥' + config.budget.monthlyCap : '未设置'}`)
    console.log('──────────────────────────────────────────')
    return
  }

  if (options.reset) {
    writeConfig({})
    console.log('✅ 配置已重置')
    return
  }

  if (options.validate) {
    const apiKey = options.apiKey || config.apiKey || process.env.DEEPSEEK_API_KEY
    const issues = []

    if (!apiKey) {
      console.log('❌ DEEPSEEK_API_KEY 未配置')
      console.log('   请运行: deepseek config --api-key sk-xxx')
      return
    }

    console.log('正在验证配置...')
    console.log('')
    console.log(`  API Key:    ${apiKey.slice(0, 8)}...`)
    console.log(`  模型:       ${config.model || 'deepseek-v4-flash'}`)
    console.log(`  API 地址:   ${config.baseUrl || 'https://api.deepseek.com/v1'}`)
    console.log('')
    console.log('正在测试 API 连接...')
    const startTime = Date.now()
    const valid = await validateApiKey(apiKey)
    const latency = Date.now() - startTime

    if (valid) {
      console.log(`  ✅ API 连接成功 (${latency}ms)`)
      console.log('')
      console.log('✅ 配置有效，一切正常')
    } else {
      console.log('  ❌ API 连接失败')
      console.log('    请检查:')
      console.log('    • API Key 是否正确')
      console.log('    • 网络能否访问 api.deepseek.com')
      console.log('    • 是否需要配置代理')
    }
    return
  }

  // Non-interactive mode
  if (options.apiKey || options.model || options.baseUrl || options.maxTokens) {
    const updates = {}
    if (options.apiKey) updates.apiKey = options.apiKey
    if (options.model) updates.model = options.model
    if (options.baseUrl) updates.baseUrl = options.baseUrl
    if (options.maxTokens) updates.maxTokens = parseInt(options.maxTokens, 10)
    writeConfig({ ...config, ...updates })
    console.log('✅ 配置已保存到 ' + USER_CONFIG_PATH)
    return
  }

  // Interactive mode
  printBanner()
  console.log('DeepSeek Code 配置向导')
  console.log('══════════════════════════════════════════')
  console.log('')
  console.log('Step 1: API Key')
  console.log('  获取地址: https://platform.deepseek.com/api_keys')
  console.log('')
  console.log('  当前: ' + (config.apiKey ? '✅ 已配置 (' + config.apiKey.slice(0, 8) + '...)' : '❌ 未配置'))
  console.log('')
  console.log('Step 2: 默认模型')
  console.log('  1) deepseek-v4-flash (推荐) — ¥0.2~1/M 输入，快速响应')
  console.log('  2) deepseek-v4-pro      — ¥1~12/M 输入，最强推理')
  console.log('')
  console.log('  当前: ' + (config.model || 'deepseek-v4-flash'))
  console.log('')
  console.log('Step 3: 预算上限（可选）')
  console.log('  在 ~/.deepcode/config.json 中配置 budget.monthlyCap')
  console.log('')
  console.log('──────────────────────────────────────────')
  console.log('')
  if (!config.apiKey && !process.env.DEEPSEEK_API_KEY) {
    console.log('💡 快速配置:')
    console.log('  deepseek config --api-key sk-xxx')
    console.log('  deepseek config --model deepseek-v4-pro')
    console.log('')
    console.log('或设置环境变量:')
    console.log('  export DEEPSEEK_API_KEY=sk-xxx')
    console.log('')
  } else {
    console.log('✅ 配置完成！运行 deepseek doctor 验证连接。')
    console.log('')
  }
}

async function cmdDoctor() {
  printBanner()
  console.log('环境诊断')
  console.log('══════════════════════════════════════════')
  console.log('')

  const config = readConfig()
  let allPass = true

  // 1. API Key
  const apiKey = process.env.DEEPSEEK_API_KEY || config.apiKey
  if (apiKey) {
    console.log('  ✅ API Key: 已配置 (' + apiKey.slice(0, 8) + '...)')
  } else {
    console.log('  ❌ API Key: 未配置')
    console.log('     请运行: deepseek config --api-key sk-xxx')
    allPass = false
  }

  // 2. Node.js version
  const nodeVer = process.version
  const majorVer = parseInt(nodeVer.slice(1).split('.')[0], 10)
  if (majorVer >= 18) {
    console.log('  ✅ Node.js: ' + nodeVer)
  } else {
    console.log('  ❌ Node.js: ' + nodeVer + ' (需要 >= 18)')
    allPass = false
  }

  // 3. Platform
  console.log('  ✅ 平台: ' + process.platform + ' (' + process.arch + ')')

  // 4. Config file
  if (existsSync(USER_CONFIG_PATH)) {
    console.log('  ✅ 配置文件: ' + USER_CONFIG_PATH)
  } else {
    console.log('  ⚠️  配置文件: 不存在（将使用环境变量）')
  }

  // 5. API connection test
  if (apiKey) {
    console.log('')
    console.log('  正在测试 API 连接...')
    const startTime = Date.now()
    try {
      const valid = await validateApiKey(apiKey)
      const latency = Date.now() - startTime
      if (valid) {
        console.log('  ✅ API 连接: 成功 (' + latency + 'ms)')
        if (latency < 500) {
          console.log('     延迟: 低延迟 ✅')
        } else if (latency < 2000) {
          console.log('     延迟: 可接受 ⚠️')
        } else {
          console.log('     延迟: 较高 ⚠️ 建议检查网络')
        }
      } else {
        console.log('  ❌ API 连接: 失败')
        console.log('     请检查 API Key 和网络连接')
        allPass = false
      }
    } catch (err) {
      console.log('  ❌ API 连接: 错误 - ' + err.message)
      allPass = false
    }
  }

  // 6. Model
  const model = config.model || 'deepseek-v4-flash'
  if (['deepseek-v4-pro', 'deepseek-v4-flash'].includes(model)) {
    console.log('  ✅ 模型: ' + model)
  } else {
    console.log('  ⚠️  模型: ' + model + '（非标准模型名）')
  }

  // 7. Pricing info
  console.log('')
  console.log('价格参考')
  console.log('──────────────────────────────────────────')
  const isPro = model === 'deepseek-v4-pro'
  console.log('  模型: ' + model)
  console.log('  输入: ' + (isPro ? '¥12' : '¥1') + '/M token（缓存命中: ¥' + (isPro ? '1' : '0.2') + '/M）')
  console.log('  输出: ' + (isPro ? '¥12' : '¥1') + '/M token')
  console.log('  上下文: 1M tokens')
  console.log('')

  // Summary
  console.log('══════════════════════════════════════════')
  if (allPass) {
    console.log('总体状态: ✅ 一切正常，可以开始使用！')
    console.log('  输入 deepseek code 启动编程助手')
  } else {
    console.log('总体状态: ❌ 存在问题需要修复')
  }
  console.log('')
}

async function cmdLearn(options) {
  printBanner()
  console.log('项目学习模式')
  console.log('══════════════════════════════════════════')
  console.log('')

  const projectRoot = process.cwd()
  console.log('项目: ' + projectRoot)

  // Build index by scanning source files
  const { globSync } = await import('glob')
  console.log('正在扫描源代码文件...')
  console.log('')

  const patterns = [
    '**/*.{ts,tsx,js,jsx,py,rs,go,java,rb,c,cpp,h,hpp,cs,swift,kt}',
    '**/*.{vue,svelte,css,scss,html,json,yaml,yml,md}',
    '**/Dockerfile',
  ]
  const ignore = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/target/**']

  const allFiles = []
  for (const pattern of patterns) {
    const matches = globSync(pattern, { cwd: projectRoot, ignore, nodir: true })
    allFiles.push(...matches)
  }

  const totalFiles = allFiles.length
  let totalTokens = 0
  const langCount = {}
  const allExports = new Set()

  function extToLang(file) {
    const ext = file.split('.').pop().toLowerCase()
    const map = { ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
      py: 'Python', rs: 'Rust', go: 'Go', java: 'Java', rb: 'Ruby', c: 'C', cpp: 'C++',
      cs: 'C#', swift: 'Swift', kt: 'Kotlin', vue: 'Vue', svelte: 'Svelte',
      css: 'CSS', scss: 'SCSS', html: 'HTML', json: 'JSON', md: 'Markdown',
      yaml: 'YAML', yml: 'YAML' }
    return map[ext] || ext
  }

  // Quick scan without reading all files
  const sampleFiles = allFiles.slice(0, 50)
  for (const file of sampleFiles) {
    const lang = extToLang(file)
    langCount[lang] = (langCount[lang] || 0) + 1

    try {
      const content = readFileSync(join(projectRoot, file), 'utf-8')
      totalTokens += Math.ceil(content.length / 4)

      // Extract exports/functions
      const funcs = content.match(/(?:export\s+)?(?:async\s+)?(?:function|class|const)\s+(\w+)/g)
      if (funcs) {
        for (const f of funcs) {
          const name = f.split(/\s+/).pop()
          if (name && name.length > 1) allExports.add(name)
        }
      }
    } catch { /* skip */ }
  }

  // Save index
  const indexPath = join(projectRoot, '.deepcode', 'index.json')
  const indexDir = join(projectRoot, '.deepcode')
  if (!existsSync(indexDir)) mkdirSync(indexDir, { recursive: true })

  const index = {
    projectRoot,
    indexedAt: Date.now(),
    summary: {
      totalFiles: allFiles.length,
      totalTokens,
      languages: langCount,
      scannedFiles: sampleFiles.length,
      keyAPIs: [...allExports].sort().slice(0, 50),
    }
  }
  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8')

  // Display results
  console.log('扫描结果:')
  console.log('  📁 项目文件: ~' + totalFiles + ' 个源代码文件')
  console.log('  📊 预估 Token: ~' + totalTokens.toLocaleString())
  console.log('')

  if (Object.keys(langCount).length > 0) {
    console.log('  语言分布:')
    for (const [lang, count] of Object.entries(langCount).sort((a, b) => b[1] - a[1])) {
      console.log('    • ' + lang + ': ' + count + ' 个文件')
    }
    console.log('')
  }

  if (allExports.size > 0) {
    console.log('  关键 API:')
    const apis = [...allExports].sort().slice(0, 20)
    for (const api of apis) {
      console.log('    • ' + api)
    }
    console.log('')
  }

  console.log('✅ 索引已保存到 ' + indexPath)
  console.log('')
}

async function cmdAnalyze() {
  printBanner()
  console.log('Token 消费分析')
  console.log('══════════════════════════════════════════')
  console.log('')

  const config = readConfig()
  const model = config.model || 'deepseek-v4-flash'

  console.log('当前模型: ' + model)
  console.log('')

  // Pricing comparison
  console.log('价格对比（每百万 Token）')
  console.log('──────────────────────────────────────────')
  console.log('  项目'.padEnd(20) + 'Pro (¥)'.padEnd(15) + 'Flash (¥)')
  console.log('──────────────────────────────────────────')

  const pricing = {
    pro: { hit: 1, miss: 12, output: 12 },
    flash: { hit: 0.2, miss: 1, output: 1 }
  }

  const items = [
    ['输入 (缓存命中)', pricing.pro.hit, pricing.flash.hit],
    ['输入 (缓存未命中)', pricing.pro.miss, pricing.flash.miss],
    ['输出', pricing.pro.output, pricing.flash.output],
  ]

  for (const [label, p, f] of items) {
    const saving = ((1 - f / p) * 100).toFixed(0)
    console.log(
      '  ' + label.padEnd(20) +
      '¥' + String(p).padEnd(10) +
      '¥' + String(f).padEnd(10) +
      '省' + saving + '%'
    )
  }
  console.log('──────────────────────────────────────────')
  console.log('')

  // Cache benefit example
  console.log('缓存优化收益（10轮对话示例）')
  console.log('──────────────────────────────────────────')
  const isPro = model === 'deepseek-v4-pro'
  const p = isPro ? pricing.pro : pricing.flash

  for (const [label, hitRate] of [['无缓存', 0], ['一般优化', 0.5], ['深度优化', 0.95]]) {
    const inputTokens = 50000 // 5K per turn × 10 turns
    const outputTokens = 20000
    const hit = Math.floor(inputTokens * hitRate)
    const miss = inputTokens - hit

    const cost = (hit / 1_000_000) * p.hit + (miss / 1_000_000) * p.miss + (outputTokens / 1_000_000) * p.output
    const costStr = cost < 0.01 ? (cost * 100).toFixed(2) + '分' : '¥' + cost.toFixed(4)
    console.log('  ' + label.padEnd(16) + costStr + '  (命中率 ' + (hitRate * 100) + '%)')
  }
  console.log('──────────────────────────────────────────')
  console.log('')

  // Tips
  console.log('省钱技巧')
  console.log('──────────────────────────────────────────')
  const tips = [
    '日常开发用 deepseek-v4-flash，复杂任务用 deepseek-v4-pro',
    '确保系统提示词超过 1024 token 以触发硬盘缓存',
    '静态内容（工具定义、系统提示）放在 prompt 最前面',
    '相同项目重复对话可最大化缓存命中率',
    '缓存命中与未命中价格相差 ' + (isPro ? '12 倍' : '5 倍'),
  ]
  for (const tip of tips) {
    console.log('  💡 ' + tip)
  }
  console.log('')
}

async function cmdPreheat(options) {
  printBanner()
  console.log('缓存预热')
  console.log('══════════════════════════════════════════')
  console.log('')

  const apiKey = getApiKey()
  if (!apiKey) {
    console.log('❌ 错误: DEEPSEEK_API_KEY 未配置')
    console.log('')
    process.exit(1)
  }

  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
  console.log('模型: ' + model)

  // Build warmup prefix
  const prefix = [
    'You are DeepSeek Code, an AI programming assistant based on DeepSeek V4.',
    'You run in the user\'s terminal and can read files, edit code, and execute commands.',
    '',
    'Available tools:',
    '- BashTool: Execute shell commands',
    '- FileReadTool: Read file contents',
    '- FileWriteTool: Create or overwrite files',
    '- FileEditTool: Modify files using string replacement',
    '- GlobTool: File pattern matching search',
    '- GrepTool: ripgrep-based content search',
    '- WebFetchTool: Fetch URL contents',
    '- WebSearchTool: Web search',
  ].join('\n')

  const tokens = Math.ceil(prefix.length / 4)
  console.log('前缀长度: ~' + tokens + ' tokens')

  if (tokens < 1024) {
    console.log('')
    console.log('⚠️  前缀不足 1024 token，缓存可能无法建立')
    if (!options.force) {
      console.log('使用 --force 参数强制预热')
      console.log('')
      return
    }
  }

  console.log('')
  console.log('正在发送预热请求...')

  try {
    const startTime = Date.now()
    const response = await deepseekRequest('/chat/completions', {
      model,
      messages: [
        { role: 'system', content: prefix },
        { role: 'user', content: '[warmup]' }
      ],
      max_tokens: 1,
    }, apiKey, null)

    const duration = Date.now() - startTime

    if (response.ok) {
      const data = await response.json()
      console.log('✅ 预热完成 (' + duration + 'ms)')
      if (data.usage) {
        console.log('  prompt_tokens: ' + data.usage.prompt_tokens)
        if (data.usage.prompt_cache_hit_tokens) console.log('  缓存命中: ' + data.usage.prompt_cache_hit_tokens)
        if (data.usage.prompt_cache_miss_tokens) console.log('  缓存建立: ' + data.usage.prompt_cache_miss_tokens)
      }
      console.log('')
      console.log('💡 缓存 TTL 约 5-10 分钟，后续请求将从中获益')
    } else {
      const text = await response.text()
      console.log('❌ 预热失败 (' + response.status + '): ' + text)
    }
  } catch (err) {
    console.log('❌ 预热失败: ' + err.message)
  }
  console.log('')
}

// ─── 命令行入口 ──────────────────────────────────────────────────────────────

async function main() {
  const rawArgs = process.argv.slice(2)
  // Case-insensitive first arg
  const command = (rawArgs[0] || '').toLowerCase()
  const rest = rawArgs.slice(1)

  // --version / -v
  if (['--version', '-v', '-V'].includes(command)) {
    console.log(VERSION + ' (DeepSeek Code)')
    return
  }

  // --help / -h / no args
  if (!command || ['--help', '-h', '-?', '/?'].includes(command)) {
    printHelp()
    return
  }

  // "code" → REPL mode (need source + Bun)
  if (command === 'code' || command === 'repl') {
    printBanner()
    console.log('交互模式需要完整的源代码环境。')
    console.log('')
    console.log('方式1: 从 GitHub 克隆完整仓库')
    console.log('  git clone https://github.com/yourusername/deepseek-code.git')
    console.log('  cd deepseek-code')
    console.log('  npm install')
    console.log('  export DEEPSEEK_API_KEY=sk-xxx')
    console.log('  node bin/deepseek-code.js')
    console.log('')
    console.log('方式2: 使用 Bun 运行（推荐，支持完整 REPL）')
    console.log('  git clone https://github.com/yourusername/deepseek-code.git')
    console.log('  cd deepseek-code')
    console.log('  bun install')
    console.log('  DEEPSEEK_API_KEY=sk-xxx bun run bin/deepseek-code.js')
    console.log('')
    console.log('子命令（无需完整源码）:')
    console.log('  deepseek doctor     健康检查')
    console.log('  deepseek learn      项目学习')
    console.log('  deepseek analyze    成本分析')
    console.log('  deepseek preheat    缓存预热')
    console.log('')
    return
  }

  // Route commands
  switch (command) {
    case 'config': {
      const opts = {}
      for (let i = 0; i < rest.length; i++) {
        switch (rest[i]) {
          case '--show':      opts.show = true; break
          case '--reset':     opts.reset = true; break
          case '--validate':  opts.validate = true; break
          case '--api-key':   opts.apiKey = rest[++i]; break
          case '--model':     opts.model = rest[++i]; break
          case '--base-url':  opts.baseUrl = rest[++i]; break
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
      // Unknown command → treat as REPL attempt
      printBanner()
      console.log('未知命令: ' + command)
      console.log('')
      console.log('可用命令:')
      console.log('  deepseek code          启动编程助手')
      console.log('  deepseek config        配置向导')
      console.log('  deepseek doctor        环境诊断')
      console.log('  deepseek learn         项目学习')
      console.log('  deepseek analyze       Token 分析')
      console.log('  deepseek preheat       缓存预热')
      console.log('')
      console.log('或者使用 --help 查看帮助')
      console.log('')
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
