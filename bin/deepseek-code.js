#!/usr/bin/env node
/**
 * DeepSeek Code — npm 全局安装入口
 * ======================================
 * 一行命令安装: npm install -g @yxccai/deepseek-code
 * 使用: deepseek code （不分大小写）
 *
 * 两种运行模式：
 * 1. 完整 REPL 模式（需要 Bun）→ 保留 Claude Code 全部功能
 *    文件编辑、终端命令、工具调用、Git 操作等
 * 2. CLI 命令模式（Node.js）→ 管理配置和诊断
 *    config / doctor / learn / analyze / preheat
 */

// ─── 版本号 ──────────────────────────────────────────────────────────────────

const VERSION = '1.0.1'

// ─── 模块导入 ────────────────────────────────────────────────────────────────

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { spawn, execSync } from 'child_process'
import { homedir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PACKAGE_ROOT = resolve(__dirname, '..')

// ─── 路径检测 ────────────────────────────────────────────────────────────────

const SRC_REPL = resolve(PACKAGE_ROOT, 'src', 'replLauncher.js')
const BIN_DEEPCODE = resolve(__dirname, 'deepcode.js')
const USER_CONFIG_DIR = join(homedir(), '.deepcode')
const USER_CONFIG_PATH = join(USER_CONFIG_DIR, 'config.json')

import { join } from 'path'

function hasSourceFiles() {
  // Check relative to package (dev/npm)
  if (existsSync(SRC_REPL)) return true
  // Check current working directory (user cloned repo)
  if (existsSync(resolve(process.cwd(), 'src', 'replLauncher.js'))) return true
  return false
}

function getPackageRoot() {
  if (existsSync(SRC_REPL)) return PACKAGE_ROOT
  if (existsSync(resolve(process.cwd(), 'src', 'replLauncher.js'))) return process.cwd()
  return null
}

function findBun() {
  try {
    const bunPath = execSync('where bun 2>nul || which bun 2>/dev/null', { encoding: 'utf-8' }).trim()
    return bunPath || null
  } catch {
    return null
  }
}

// ─── 读取配置 ────────────────────────────────────────────────────────────────

function readConfig() {
  try {
    if (existsSync(USER_CONFIG_PATH)) {
      return JSON.parse(readFileSync(USER_CONFIG_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return {}
}

function writeConfig(config) {
  if (!existsSync(USER_CONFIG_DIR)) mkdirSync(USER_CONFIG_DIR, { recursive: true })
  writeFileSync(USER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

function getApiKey() {
  return process.env.DEEPSEEK_API_KEY || readConfig().apiKey || ''
}

// ─── 打印横幅 ────────────────────────────────────────────────────────────────

const _BLUE = '\x1b[38;2;79;107;237m'
const _RESET = '\x1b[0m'
const _BOLD = '\x1b[1m'

function printHelp() {
  console.log('')
  console.log('  ╔══════════════════════════════════════════╗')
  console.log('  ║        DeepSeek Code v' + VERSION + '              ║')
  console.log('  ║  基于 DeepSeek V4 的 AI 编程助手          ║')
  console.log('  ║  一行命令安装，各平台通用                  ║')
  console.log('  ╚══════════════════════════════════════════╝')
  console.log('')
  console.log('安装:  npm install -g @yxccai/deepseek-code')
  console.log('使用:  deepseek code')
  console.log('')
  console.log('命令:')
  console.log('  code              启动完整交互式编程助手')
  console.log('                    (文件编辑/终端/工具/Git 等全部功能)')
  console.log('  config [options]  配置向导')
  console.log('  doctor            环境诊断')
  console.log('  learn [options]   项目学习')
  console.log('  analyze           Token 消费分析')
  console.log('  preheat [options] 缓存预热')
  console.log('')
  console.log('选项:')
  console.log('  --version, -v     显示版本号')
  console.log('  --help, -h        显示帮助')
  console.log('')
  console.log('环境变量:')
  console.log('  DEEPSEEK_API_KEY    API Key (必需)')
  console.log('  DEEPSEEK_MODEL      模型: deepseek-v4-pro / deepseek-v4-flash')
  console.log('')
}

// ─── 完整 REPL 启动 ──────────────────────────────────────────────────────────

function launchFullRepl(args) {
  const bunPath = findBun()

  if (!bunPath) {
    console.log('')
    console.log('  ' + _BLUE + '╔══════════════════════════════════════════╗' + _RESET)
    console.log('  ' + _BLUE + '║        DeepSeek Code v' + VERSION + '              ║' + _RESET)
    console.log('  ' + _BLUE + '║  基于 DeepSeek V4 的 AI 编程助手          ║' + _RESET)
    console.log('  ' + _BLUE + '╚══════════════════════════════════════════╝' + _RESET)
    console.log('')
    console.log('完整交互模式需要安装 Bun 运行时：')
    console.log('')
    console.log('  npm install -g bun')
    console.log('  deepseek code')
    console.log('')
    console.log('或者从 GitHub 克隆完整仓库：')
    console.log('  git clone https://github.com/yxccai/deepseek-code.git')
    console.log('  cd deepseek-code')
    console.log('  bun install')
    console.log('  bun run bin/deepcode.js')
    console.log('')
    console.log('当前可用的子命令（无需 Bun）：')
    console.log('  deepseek doctor     环境诊断')
    console.log('  deepseek config     配置向导')
    console.log('  deepseek analyze    Token 分析')
    console.log('')
    process.exit(1)
  }

  // Check for API key
  if (!process.env.DEEPSEEK_API_KEY && !getApiKey()) {
    console.log('')
    console.log('❌ DEEPSEEK_API_KEY 未配置')
    console.log('')
    console.log('请先配置 API Key:')
    console.log('  方法1: set DEEPSEEK_API_KEY=sk-xxx')
    console.log('  方法2: deepseek config --api-key sk-xxx')
    console.log('')
    console.log('获取 Key: https://platform.deepseek.com/api_keys')
    console.log('')
    process.exit(1)
  }

  // Find source files
  const root = getPackageRoot()
  if (!root) {
    console.log('')
    console.log('完整交互模式需要完整源代码。')
    console.log('请从 GitHub 克隆后运行：')
    console.log('  git clone https://github.com/yxccai/deepseek-code.git')
    console.log('  cd deepseek-code')
    console.log('  bun install')
    console.log('  deepseek code')
    console.log('')
    process.exit(1)
  }

  // Set environment for DeepSeek mode
  const config = readConfig()
  process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || config.apiKey || ''
  if (config.model) process.env.DEEPSEEK_MODEL = config.model

  console.log('')
  console.log('  ' + _BLUE + '╔══════════════════════════════════════════╗' + _RESET)
  console.log('  ' + _BLUE + '║        DeepSeek Code v' + VERSION + '              ║' + _RESET)
  console.log('  ' + _BLUE + '║  基于 DeepSeek V4  — 全部功能完整保留     ║' + _RESET)
  console.log('  ' + _BLUE + '╚══════════════════════════════════════════╝' + _RESET)
  console.log('  模型: ' + (config.model || 'deepseek-v4-flash'))
  console.log('  模式: 完整 REPL（文件编辑/终端/工具/Git 全部可用）')
  console.log('')

  // Launch the full REPL via Bun from the source root
  const targetBin = resolve(root, 'bin', 'deepcode.js')
  const child = spawn(bunPath, [targetBin, ...(args.length > 0 ? args : [])], {
    stdio: 'inherit',
    env: { ...process.env },
    cwd: root,
  })

  child.on('exit', (code) => process.exit(code ?? 0))
}

// ─── CLI 命令（纯 Node.js，无依赖） ─────────────────────────────────────────

async function cmdConfig(options) {
  const config = readConfig()

  if (options.show) {
    console.log('\n当前配置:')
    console.log('─'.repeat(40))
    console.log('  API Key:  ' + (config.apiKey ? '✅ (' + config.apiKey.slice(0, 8) + '...)' : '❌ 未配置'))
    console.log('  模型:      ' + (config.model || 'deepseek-v4-flash'))
    console.log('  API 地址:  ' + (config.baseUrl || 'https://api.deepseek.com/v1'))
    console.log('')
    return
  }
  if (options.reset) { writeConfig({}); console.log('✅ 已重置'); return }

  if (options.apiKey || options.model) {
    const updates = {}
    if (options.apiKey) updates.apiKey = options.apiKey
    if (options.model) updates.model = options.model
    writeConfig({ ...config, ...updates })
    console.log('✅ 配置已保存')
    return
  }

  if (options.validate) {
    const key = options.apiKey || config.apiKey || process.env.DEEPSEEK_API_KEY
    if (!key) { console.log('❌ 未配置 API Key'); return }
    console.log('正在验证...')
    const start = Date.now()
    try {
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: 'deepseek-v4-flash', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
      })
      const ms = Date.now() - start
      console.log(resp.ok ? '✅ 连接成功 (' + ms + 'ms)' : '❌ 失败 (' + resp.status + ')')
    } catch (err) { console.log('❌ 错误: ' + err.message) }
    return
  }

  console.log('\nDeepSeek Code 配置\n' + '─'.repeat(40))
  console.log('当前: ' + (config.apiKey ? '✅ 已配置' : '❌ 未配置'))
  console.log('')
  console.log('使用方式:')
  console.log('  deepseek config --api-key sk-xxx')
  console.log('  deepseek config --model deepseek-v4-pro')
  console.log('  deepseek config --show')
  console.log('  deepseek config --validate')
  console.log('')
  console.log('或在环境变量: set DEEPSEEK_API_KEY=sk-xxx')
  console.log('')
}

async function cmdDoctor() {
  const config = readConfig()
  const apiKey = process.env.DEEPSEEK_API_KEY || config.apiKey
  let allOk = true

  console.log(_BLUE + '\n         ╱│╲')
  console.log('        ╱ │ ╲')
  console.log('   ▄███████████████████████')
  console.log(' ▄████████████████████████████')
  console.log(' ██████ ' + '\x1b[97;48;2;79;107;237m●\x1b[38;2;79;107;237m' + ' ████████████████████████')
  console.log(' ███████████████████████████████')
  console.log('  ▀████████████████████████████████    ▄▄')
  console.log('    ▀██████████████████████████████  ▄▀▀▀')
  console.log('      ▀▀██████████████████████████▄█')
  console.log('           ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀' + _RESET)
  console.log('')
  console.log('  ' + _BOLD + 'DeepSeek Code' + _RESET + ' v' + VERSION + '  —  环境诊断')
  console.log('  ' + '─'.repeat(40))
  console.log('')

  console.log((apiKey ? '  ✅' : '  ❌') + ' API Key: ' + (apiKey ? '已配置' : '未配置'))
  console.log('  ✅ Node.js: ' + process.version)
  console.log('  ✅ 平台: ' + process.platform)
  console.log('  ✅ Bun: ' + (findBun() ? '已安装' : '未安装（npm install -g bun）'))
  console.log('  ✅ 完整源码: ' + (hasSourceFiles() ? '可用' : '不可用（功能受限）'))
  if (hasSourceFiles()) console.log('  ✅ 完整 REPL: ' + (findBun() ? '可启动' : '需安装 Bun'))
  console.log('')

  if (apiKey) {
    console.log('  正在测试 API...')
    const start = Date.now()
    try {
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({ model: 'deepseek-v4-flash', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
      })
      const ms = Date.now() - start
      console.log(resp.ok ? '  ✅ API 连接成功 (' + ms + 'ms)' : '  ❌ API 连接失败')
    } catch (err) { console.log('  ❌ 错误: ' + err.message); allOk = false }
  }

  console.log('')
  console.log('  ' + '─'.repeat(40))
  if (allOk && findBun() && apiKey) {
    console.log('  ' + _BOLD + '✅ 一切正常！输入 deepseek code 启动' + _RESET)
  } else {
    console.log('  ' + _BOLD + '⚠️  部分条件未满足' + _RESET)
    if (!apiKey) console.log('  配置: deepseek config --api-key sk-xxx')
    if (!findBun()) console.log('  安装 Bun: npm install -g bun')
  }
  console.log('')
}

async function cmdLearn() {
  const projectRoot = process.cwd()
  console.log('\n📚 项目学习\n')
  console.log('扫描: ' + projectRoot)

  const { globSync } = await import('glob')
  const patterns = ['**/*.{ts,tsx,js,jsx,py,rs,go,java,rb,c,cpp,cs,swift,kt,json,yaml,yml,md,vue,svelte}']
  const ignore = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/target/**', '**/coverage/**']

  const files = []
  for (const p of patterns) {
    const m = globSync(p, { cwd: projectRoot, ignore, nodir: true })
    files.push(...m)
  }

  const langMap = { ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', py: 'Python', rs: 'Rust', go: 'Go', java: 'Java' }
  const langs = {}
  for (const f of files.slice(0, 500)) {
    const ext = f.split('.').pop()
    const lang = langMap[ext] || ext
    langs[lang] = (langs[lang] || 0) + 1
  }

  console.log('  文件数: ~' + files.length)
  console.log('  语言: ' + Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, c]) => l + '(' + c + ')').join(' '))

  const indexPath = join(projectRoot, '.deepcode', 'index.json')
  if (!existsSync(join(projectRoot, '.deepcode'))) mkdirSync(join(projectRoot, '.deepcode'), { recursive: true })
  writeFileSync(indexPath, JSON.stringify({ projectRoot, indexedAt: Date.now(), summary: { totalFiles: files.length, languages: langs } }, null, 2))
  console.log('✅ 索引已保存\n')
}

function cmdAnalyze() {
  console.log('\n📊 Token 分析\n')
  console.log('价格对比（每百万 Token）:')
  console.log('  ┌──────────────────────┬──────────┬──────────┬────────┐')
  console.log('  │ 项目                 │ Pro (¥)  │ Flash(¥) │ 节省   │')
  console.log('  ├──────────────────────┼──────────┼──────────┼────────┤')
  console.log('  │ 输入 (缓存命中)      │   1      │   0.2    │ 80%    │')
  console.log('  │ 输入 (缓存未命中)    │  12      │   1      │ 92%    │')
  console.log('  │ 输出                 │  12      │   1      │ 92%    │')
  console.log('  └──────────────────────┴──────────┴──────────┴────────┘')
  console.log('')
  console.log('示例（10轮对话，50K输入+20K输出）:')
  for (const [label, rate] of [['无缓存   (0%) ', 0], ['一般优化 (50%)', 0.5], ['深度优化 (95%)', 0.95]]) {
    const hit = Math.floor(50000 * rate)
    const cost = (hit / 1e6) * 0.2 + ((50000 - hit) / 1e6) * 1 + (20000 / 1e6) * 1
    console.log('  ' + label + '  ¥' + cost.toFixed(4))
  }
  console.log('')
  console.log('💡 缓存命中比未命中便宜 5 倍（Flash）~ 12 倍（Pro）')

  const config = readConfig()
  if (config.cache?.enabled !== false) {
    console.log('  当前缓存: ✅ 已启用')
    console.log('  确保系统提示词 > 1024 tokens 以触发硬盘缓存')
  }
  console.log('')
}

async function cmdPreheat(options) {
  const apiKey = getApiKey()
  if (!apiKey) { console.log('❌ 未配置 API Key'); return }

  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
  console.log('\n🔥 缓存预热\n')

  const prefix = 'You are DeepSeek Code, an AI programming assistant based on DeepSeek V4.'
  const tokens = Math.ceil(prefix.length / 4)
  console.log('前缀: ~' + tokens + ' tokens' + (tokens < 1024 ? ' (不足 1024)' : ''))

  if (tokens < 1024 && !options.force) { console.log('使用 --force 强制\n'); return }

  try {
    const start = Date.now()
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: prefix }, { role: 'user', content: '[warmup]' }], max_tokens: 1 }),
    })
    const data = await resp.json()
    console.log('✅ ' + (Date.now() - start) + 'ms')
    if (data.usage) console.log('  tokens: ' + data.usage.prompt_tokens)
  } catch (err) { console.log('❌ ' + err.message) }
  console.log('')
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
  // --help
  if (!command || ['--help', '-h'].includes(command)) {
    printHelp()
    return
  }

  // "code" → launch full REPL via Bun
  if (['code', 'repl'].includes(command)) {
    launchFullRepl(rest)
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
        }
      }
      await cmdConfig(opts)
      break
    }
    case 'doctor': await cmdDoctor(); break
    case 'learn': await cmdLearn({ refresh: rest.includes('--refresh') }); break
    case 'analyze': cmdAnalyze(); break
    case 'preheat': await cmdPreheat({ force: rest.includes('--force') }); break
    default:
      console.log('\n未知命令: ' + command + '\n使用 --help 查看帮助\n')
  }
}

main().catch(err => { console.error('Error:', err.message); process.exit(1) })
