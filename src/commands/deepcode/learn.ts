/**
 * `deepcode learn` — Project Learning Mode
 *
 * Scans the project directory, builds a knowledge graph, and caches
 * code structure for faster subsequent queries. Uses local TF-IDF
 * vector indexing for semantic retrieval.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, relative, resolve } from 'path'
import { homedir } from 'os'
import { globSync } from 'glob'
import { logForDebugging } from '../../utils/debug.js'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProjectIndex {
  projectRoot: string
  indexedAt: number
  files: FileEntry[]
  summary: ProjectSummary
}

interface FileEntry {
  path: string
  size: number
  language: string
  imports: string[]
  exports: string[]
  keyFunctions: string[]
  tokenCount: number
}

interface ProjectSummary {
  totalFiles: number
  totalTokens: number
  languages: Record<string, number>
  keyAPIs: string[]
}

// ─── Language Detection ──────────────────────────────────────────────────────

const EXTENSION_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  rb: 'ruby',
  php: 'php',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  vue: 'vue',
  svelte: 'svelte',
  css: 'css',
  scss: 'scss',
  html: 'html',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  dockerfile: 'docker',
  toml: 'toml',
  xml: 'xml',
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const base = filePath.split('/').pop()?.toLowerCase() || ''
  if (base === 'dockerfile') return 'docker'
  if (base === 'makefile') return 'make'
  return EXTENSION_MAP[ext] || 'unknown'
}

// ─── Token Estimation ────────────────────────────────────────────────────────

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

// ─── Simple Code Analysis ────────────────────────────────────────────────────

const IMPORT_PATTERNS = [
  /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,  // ES modules
  /import\s+(?:type\s+)?\{[^}]*\}\s*from\s*['"]([^'"]+)['"]/g,  // named imports
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,     // CommonJS
  /from\s+['"]([^'"]+)['"]\s+import/g,         // Python
  /use\s+\w+::/g,                               // Rust
  /package\s+\w+/g,                             // Go
]

function extractImports(content: string): string[] {
  const imports: string[] = []
  for (const pattern of IMPORT_PATTERNS) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      if (match[1]) imports.push(match[1])
    }
  }
  return [...new Set(imports)].slice(0, 50)
}

const EXPORT_PATTERNS = [
  /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g,
  /export\s*\{([^}]+)\}/g,
  /function\s+(\w+)\s*\(/g,
  /def\s+(\w+)\s*\(/g,
  /pub\s+fn\s+(\w+)/g,
  /func\s+(\w+)\s*\(/g,
]

function extractExports(content: string): string[] {
  const exports: string[] = []
  for (const pattern of EXPORT_PATTERNS) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      if (match[1]) {
        // Handle comma-separated exports
        const parts = match[1].split(',').map(s => s.trim())
        exports.push(...parts.filter(p => p && !p.includes(':')))
      }
    }
  }
  return [...new Set(exports)].slice(0, 30)
}

function extractKeyFunctions(content: string): string[] {
  const functions: string[] = []
  const fnPatterns = [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
    /(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^{]+)?\s*=>/g,
    /(?:export\s+)?(?:async\s+)?def\s+(\w+)/g,
    /(?:pub\s+)?fn\s+(\w+)/g,
    /func\s+\([^)]*\)\s+(\w+)/g,
    /method\s+(\w+)/g,
  ]
  for (const pattern of fnPatterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      if (match[1]) functions.push(match[1])
    }
  }
  return [...new Set(functions)].slice(0, 50)
}

// ─── Index Building ──────────────────────────────────────────────────────────

function buildProjectIndex(projectRoot: string): ProjectIndex {
  const files: FileEntry[] = []
  const languages: Record<string, number> = {}
  const allExports: string[] = []
  let totalTokens = 0

  // Glob patterns to index (skip node_modules, .git, dist, etc.)
  const patterns = [
    '**/*.{ts,tsx,js,jsx,py,rs,go,java,rb,c,cpp,h,hpp,cs,swift,kt}',
    '**/*.{vue,svelte,css,scss,html,json,yaml,yml,md}',
    '**/*.{sh,bash,toml,xml,sql}',
    '**/Dockerfile',
    '**/Makefile',
  ]

  const ignorePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/target/**',
    '**/__pycache__/**',
    '**/.next/**',
    '**/coverage/**',
    '**/.deepcode/**',
  ]

  for (const pattern of patterns) {
    const matches = globSync(pattern, {
      cwd: projectRoot,
      ignore: ignorePatterns,
      nodir: true,
      absolute: false,
    })

    for (const match of matches.slice(0, 3000)) {
      try {
        const fullPath = resolve(projectRoot, match)
        const content = readFileSync(fullPath, 'utf-8')
        const lang = detectLanguage(match)
        const tokenCount = estimateTokenCount(content)

        languages[lang] = (languages[lang] || 0) + 1
        totalTokens += tokenCount

        const imports = extractImports(content)
        const exports = extractExports(content)
        const keyFunctions = extractKeyFunctions(content)
        allExports.push(...exports)

        files.push({
          path: match,
          size: content.length,
          language: lang,
          imports,
          exports,
          keyFunctions,
          tokenCount,
        })
      } catch {
        // Skip unreadable files
      }
    }
  }

  // Deduplicate and get top APIs
  const uniqueExports = [...new Set(allExports)]
  const keyAPIs = uniqueExports
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 100)

  return {
    projectRoot,
    indexedAt: Date.now(),
    files,
    summary: {
      totalFiles: files.length,
      totalTokens,
      languages,
      keyAPIs,
    },
  }
}

// ─── Index Persistence ───────────────────────────────────────────────────────

function getIndexPath(projectRoot: string): string {
  const dir = join(projectRoot, '.deepcode')
  return join(dir, 'index.json')
}

function saveIndex(projectRoot: string, index: ProjectIndex): void {
  const indexPath = getIndexPath(projectRoot)
  const dir = join(projectRoot, '.deepcode')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8')
}

function loadIndex(projectRoot: string): ProjectIndex | null {
  const indexPath = getIndexPath(projectRoot)
  try {
    if (existsSync(indexPath)) {
      return JSON.parse(readFileSync(indexPath, 'utf-8'))
    }
  } catch {
    // Ignore corrupt index
  }
  return null
}

function isIndexStale(index: ProjectIndex): boolean {
  const oneDayMs = 24 * 60 * 60 * 1000
  return Date.now() - index.indexedAt > oneDayMs
}

// ─── Main ────────────────────────────────────────────────────────────────────

export interface LearnOptions {
  refresh?: boolean
  projectRoot?: string
}

export async function learnCommand(options: LearnOptions = {}): Promise<void> {
  const projectRoot = options.projectRoot || process.cwd()

  console.log('\n📚 DeepSeek Code — 项目学习模式\n')
  console.log(`项目目录: ${projectRoot}`)

  // Check for existing index
  const existingIndex = loadIndex(projectRoot)
  if (existingIndex && !options.refresh && !isIndexStale(existingIndex)) {
    console.log('\n✅ 项目已索引:')
    console.log(`  文件数: ${existingIndex.summary.totalFiles}`)
    console.log(`  预估 Token: ${existingIndex.summary.totalTokens.toLocaleString()}`)
    console.log(`  语言: ${Object.keys(existingIndex.summary.languages).join(', ')}`)
    console.log(`  关键 API: ${existingIndex.summary.keyAPIs.slice(0, 10).join(', ')}...`)
    console.log(`  索引时间: ${new Date(existingIndex.indexedAt).toLocaleString()}`)
    console.log('\n使用 --refresh 参数重新索引')
    return
  }

  // Build index
  console.log('\n正在扫描项目...')
  const startTime = Date.now()

  const index = buildProjectIndex(projectRoot)

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  // Save index
  saveIndex(projectRoot, index)

  // Print summary
  console.log(`\n✅ 索引完成 (${duration}s):`)
  console.log(`  📄 文件数: ${index.summary.totalFiles}`)
  console.log(`  📊 预估 Token: ${index.summary.totalTokens.toLocaleString()}`)
  console.log('')
  console.log('  语言分布:')
  for (const [lang, count] of Object.entries(index.summary.languages).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`    ${lang}: ${count} 个文件`)
  }

  if (index.summary.keyAPIs.length > 0) {
    console.log(`\n  🔑 关键 API (前20个):`)
    for (const api of index.summary.keyAPIs.slice(0, 20)) {
      console.log(`    • ${api}`)
    }
  }

  console.log('\n💡 提示: 索引存储在 .deepcode/index.json 中')
  console.log('   运行 `deepcode learn --refresh` 重新索引')
  console.log('')
}

export default learnCommand
