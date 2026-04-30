/**
 * DeepSeek Code Configuration System
 *
 * Handles project-level and user-level configuration for DeepSeek Code.
 * Supports env vars, JSON config files, and CLI flags.
 *
 * Config priority (highest to lowest):
 *   1. CLI flags (--model, --api-key)
 *   2. Environment variables (DEEPSEEK_API_KEY, DEEPSEEK_MODEL, etc.)
 *   3. Project config (./.deepcode/config.json)
 *   4. User config (~/.deepcode/config.json)
 *   5. Defaults
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join, resolve } from 'path'
import { logForDebugging } from '../utils/debug.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ModelType = 'deepseek-v4-pro' | 'deepseek-v4-flash'

export interface DeepCodeConfig {
  /** DeepSeek API Key */
  apiKey?: string
  /** API base URL */
  baseUrl?: string
  /** Default model */
  model?: ModelType
  /** Max tokens per response */
  maxTokens?: number
  /** Cache strategy */
  cache?: {
    enabled: boolean
    /** Minimum prefix tokens for cache (default: 1024) */
    minPrefixTokens?: number
    /** Enable cache warming on startup */
    warmup?: boolean
    /** Enable semantic cache layer */
    semanticCache?: boolean
  }
  /** Budget limits (in RMB yuan) */
  budget?: {
    /** Monthly budget cap */
    monthlyCap?: number
    /** Per-session cap */
    sessionCap?: number
    /** Alert when spending exceeds this amount */
    alertThreshold?: number
  }
  /** Model auto-switch settings */
  autoSwitch?: {
    enabled: boolean
    /** Switch to Flash for simple tasks automatically */
    useFlashForSimple?: boolean
    /** Switch to Pro for complex tasks */
    useProForComplex?: boolean
  }
  /** Last session ID for cost restoration */
  lastSessionId?: string
}

// ─── Paths ───────────────────────────────────────────────────────────────────

function getUserConfigDir(): string {
  return join(homedir(), '.deepcode')
}

function getUserConfigPath(): string {
  return join(getUserConfigDir(), 'config.json')
}

function getProjectConfigDir(projectRoot?: string): string {
  return resolve(projectRoot || process.cwd(), '.deepcode')
}

function getProjectConfigPath(projectRoot?: string): string {
  return join(getProjectConfigDir(projectRoot), 'config.json')
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: DeepCodeConfig = {
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-v4-flash',
  maxTokens: 8192,
  cache: {
    enabled: true,
    minPrefixTokens: 1024,
    warmup: false,
    semanticCache: false,
  },
  autoSwitch: {
    enabled: true,
    useFlashForSimple: true,
    useProForComplex: true,
  },
}

// ─── Config Store ────────────────────────────────────────────────────────────

let cachedConfig: DeepCodeConfig | null = null

/**
 * Load config from all sources and merge them.
 */
export function loadConfig(projectRoot?: string): DeepCodeConfig {
  if (cachedConfig) return cachedConfig

  const config: DeepCodeConfig = { ...DEFAULT_CONFIG }

  // 1. User config
  try {
    const userConfigPath = getUserConfigPath()
    if (existsSync(userConfigPath)) {
      const userConfig = JSON.parse(readFileSync(userConfigPath, 'utf-8'))
      Object.assign(config, userConfig)
      logForDebugging(`[DeepCode] Loaded user config from ${userConfigPath}`)
    }
  } catch (err) {
    logForDebugging(`[DeepCode] Failed to load user config: ${err}`)
  }

  // 2. Project config
  try {
    const projectConfigPath = getProjectConfigPath(projectRoot)
    if (existsSync(projectConfigPath)) {
      const projectConfig = JSON.parse(readFileSync(projectConfigPath, 'utf-8'))
      Object.assign(config, projectConfig)
      logForDebugging(`[DeepCode] Loaded project config from ${projectConfigPath}`)
    }
  } catch (err) {
    logForDebugging(`[DeepCode] Failed to load project config: ${err}`)
  }

  // 3. Environment variables (override config file values)
  if (process.env.DEEPSEEK_API_KEY) {
    config.apiKey = process.env.DEEPSEEK_API_KEY
  }
  if (process.env.DEEPSEEK_BASE_URL) {
    config.baseUrl = process.env.DEEPSEEK_BASE_URL
  }
  if (process.env.DEEPSEEK_MODEL) {
    config.model = process.env.DEEPSEEK_MODEL as ModelType
  }
  if (process.env.DEEPSEEK_MAX_TOKENS) {
    config.maxTokens = parseInt(process.env.DEEPSEEK_MAX_TOKENS, 10)
  }

  cachedConfig = config
  return config
}

/**
 * Reload config (clear cache).
 */
export function reloadConfig(projectRoot?: string): DeepCodeConfig {
  cachedConfig = null
  return loadConfig(projectRoot)
}

/**
 * Get the effective API key from any source.
 */
export function getApiKey(): string | undefined {
  const config = loadConfig()
  return config.apiKey || process.env.DEEPSEEK_API_KEY
}

/**
 * Get the effective model name.
 */
export function getEffectiveModel(): ModelType {
  const config = loadConfig()
  return config.model || DEFAULT_CONFIG.model!
}

/**
 * Check if API key is configured.
 */
export function isConfigured(): boolean {
  return !!getApiKey()
}

// ─── Config Manipulation ─────────────────────────────────────────────────────

export interface WriteConfigOptions {
  scope: 'user' | 'project'
  projectRoot?: string
}

/**
 * Save config to the specified scope.
 */
export function saveConfig(
  updates: Partial<DeepCodeConfig>,
  options: WriteConfigOptions = { scope: 'user' },
): void {
  const configPath = options.scope === 'user'
    ? getUserConfigPath()
    : getProjectConfigPath(options.projectRoot)

  const dir = options.scope === 'user'
    ? getUserConfigDir()
    : getProjectConfigDir(options.projectRoot)

  // Read existing config if it exists
  let existing: DeepCodeConfig = {}
  try {
    if (existsSync(configPath)) {
      existing = JSON.parse(readFileSync(configPath, 'utf-8'))
    }
  } catch {
    // Start fresh
  }

  // Ensure directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // Merge and write
  const merged = { ...existing, ...updates }
  writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8')

  // Clear cache so next load picks up changes
  cachedConfig = null

  logForDebugging(`[DeepCode] Saved config to ${configPath}`)
}

/**
 * Save user-level config.
 */
export function saveUserConfig(updates: Partial<DeepCodeConfig>): void {
  saveConfig(updates, { scope: 'user' })
}

/**
 * Save project-level config.
 */
export function saveProjectConfig(updates: Partial<DeepCodeConfig>): void {
  saveConfig(updates, { scope: 'project' })
}

// ─── Config Validation ───────────────────────────────────────────────────────

export interface ConfigValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate the current configuration.
 */
export function validateConfig(config: DeepCodeConfig): ConfigValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // API Key validation (basic format check)
  if (!config.apiKey) {
    errors.push('DEEPSEEK_API_KEY 未配置。请运行 `deepcode config` 进行设置。')
  }

  // Base URL validation
  if (config.baseUrl && !config.baseUrl.startsWith('http')) {
    errors.push('API Base URL 必须以 http:// 或 https:// 开头')
  }

  // Model validation
  if (
    config.model &&
    !['deepseek-v4-pro', 'deepseek-v4-flash'].includes(config.model)
  ) {
    warnings.push(
      `未知模型 "${config.model}"，将使用默认模型 deepseek-v4-flash`,
    )
  }

  // Max tokens validation
  if (config.maxTokens && config.maxTokens < 1) {
    errors.push('maxTokens 必须为正数')
  }

  // Budget validation
  if (config.budget?.sessionCap && config.budget?.monthlyCap) {
    if (config.budget.sessionCap > config.budget.monthlyCap) {
      warnings.push('会话预算上限超过了月度预算上限')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default {
  loadConfig,
  reloadConfig,
  getApiKey,
  getEffectiveModel,
  isConfigured,
  saveConfig,
  saveUserConfig,
  saveProjectConfig,
  validateConfig,
  DEFAULT_CONFIG,
}
