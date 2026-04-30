# DeepSeek Code 🚀

> 基于 DeepSeek V4 的 AI 编程助手。**一行命令安装，各平台通用。**
> 为 DeepSeek V4 垂直深度优化，追求极致的性能和极低的成本。

```bash
npm install -g deepseek-code
deepseek code
```

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| **一行安装** | `npm install -g deepseek-code`，各平台通用（Windows/macOS/Linux） |
| **极低成本** | Flash 模型缓存命中仅 **¥0.2/百万 Token**，比 Claude Code 降低 95%+ |
| **直连 DeepSeek API** | 无需 LiteLLM、OpenRouter 等中间层，直接调用 DeepSeek V4 官方 API |
| **极致缓存优化** | 针对 DeepSeek 硬盘缓存机制深度优化，目标缓存命中率 95%+ |
| **智能模型切换** | 简单任务自动使用 Flash，复杂任务升级为 Pro |
| **1M 上下文窗口** | 充分利用 DeepSeek V4 的百万级上下文能力 |
| **中文原生支持** | 原生中文界面和交互 |

## 🚀 一行命令安装

### 前提条件

- [Node.js](https://nodejs.org) >= 18.0.0（各系统预装，无需额外配置）
- DeepSeek API Key（[点此免费获取](https://platform.deepseek.com/api_keys)）

### 安装（3 秒搞定）

```bash
# 全局安装
npm install -g deepseek-code

# 验证安装
deepseek doctor

# 启动编程助手
deepseek code
```

安装后可使用以下命令（不分大小写）：
- `deepseek`、`deepseek-code`
- `dsc`（短别名）
- `deepcode`

### 各系统安装说明

**macOS / Linux:**
```bash
sudo npm install -g deepseek-code  # macOS/Linux 可能需 sudo
deepseek code
```

**Windows（cmd/PowerShell）:**
```cmd
npm install -g deepseek-code
deepseek code
```

**一行启动（无需安装）:**
```bash
npx deepseek-code doctor     # 无需安装，直接运行诊断
DEEPSEEK_API_KEY=sk-xxx npx deepseek-code   # 一行启动
```

## ⚙️ 配置 API Key

### 方式一：交互式配置
```bash
deepseek config
```

### 方式二：环境变量（推荐）
```bash
# macOS / Linux
export DEEPSEEK_API_KEY=sk-your_key_here
export DEEPSEEK_MODEL=deepseek-v4-flash

# Windows (cmd)
set DEEPSEEK_API_KEY=sk-your_key_here
set DEEPSEEK_MODEL=deepseek-v4-flash

# Windows (PowerShell)
$env:DEEPSEEK_API_KEY="sk-your_key_here"
```

### 方式三：直接传参
```bash
deepseek config --api-key sk-xxx
deepseek config --model deepseek-v4-pro
deepseek config --show        # 查看配置
deepseek config --validate    # 验证配置
```

## 📖 使用指南

### CLI 命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `deepseek code` | 启动交互式编程助手 | `deepseek code` |
| `deepseek config` | 配置向导 | `deepseek config --api-key sk-xxx` |
| `deepseek doctor` | 环境诊断 | `deepseek doctor` |
| `deepseek learn` | 项目学习 | `deepseek learn --refresh` |
| `deepseek analyze` | Token 消费分析 | `deepseek analyze` |
| `deepseek preheat` | 缓存预热 | `deepseek preheat --force` |

### 快速上手

```bash
# 1. 安装
npm install -g deepseek-code

# 2. 配置 API Key
export DEEPSEEK_API_KEY=sk-xxx

# 3. 验证连接
deepseek doctor

# 4. 学习当前项目
cd my-project
deepseek learn

# 5. 预热缓存（可选，加速首次请求）
deepseek preheat

# 6. 查看价格分析
deepseek analyze
```

### 环境变量参考

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | API Key（必需） | - |
| `DEEPSEEK_MODEL` | 模型选择 | `deepseek-v4-flash` |
| `DEEPSEEK_BASE_URL` | API 地址 | `https://api.deepseek.com/v1` |
| `DEEPSEEK_MAX_TOKENS` | 最大 Token 数 | `8192` |

## 📊 价格对比

| 项目 | DeepSeek V4 Pro | DeepSeek V4 Flash | Claude Opus 4.6 |
|------|:-:|:-:|:-:|
| 输入（缓存命中） | **¥1**/M | **¥0.2**/M | $5/M |
| 输入（缓存未命中） | **¥12**/M | **¥1**/M | $15/M |
| 输出 | **¥12**/M | **¥1**/M | $75/M |
| **成本对比** | **1x** | **~0.08x** | **~30x+** |

> 💡 如果缓存命中率从 50% 提升到 95%，Flash 版本成本再降 **60%**。

## 🛠️ 环境诊断

```bash
$ deepseek doctor

  ╔══════════════════════════════════════════╗
  ║        DeepSeek Code v1.0.0              ║
  ╚══════════════════════════════════════════╝

  ✅ API Key: 已配置 (sk-abc123...)
  ✅ Node.js: v20.11.0
  ✅ 平台: win32 (x64)
  ✅ API 连接: 成功 (156ms)

总体状态: ✅ 一切正常
```

## 💰 缓存优化收益

| 缓存命中率 | Pro 成本 (¥/M) | Flash 成本 (¥/M) |
|:----------:|:-------------:|:---------------:|
| 0% | ¥12.00 | ¥1.00 |
| 50% | ¥6.50 | ¥0.60 |
| 80% | ¥3.20 | ¥0.36 |
| **95%** | **¥1.55** | **¥0.24** |

## 📦 从源码运行（完整 REPL 模式）

如需完整交互式编程助手（文件编辑、命令执行等高级功能），需从源码运行：

```bash
# 1. 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 2. 克隆仓库
git clone https://github.com/yourusername/deepseek-code.git
cd deepseek-code

# 3. 安装依赖
bun install

# 4. 配置 API Key
export DEEPSEEK_API_KEY=sk-xxx

# 5. 启动完整 REPL
bun run bin/deepcode.js
```

## 🔧 高级配置

配置文件位置：`~/.deepcode/config.json`

```json
{
  "apiKey": "sk-xxx",
  "model": "deepseek-v4-flash",
  "baseUrl": "https://api.deepseek.com/v1",
  "maxTokens": 8192,
  "cache": {
    "enabled": true,
    "minPrefixTokens": 1024,
    "warmup": false
  },
  "budget": {
    "monthlyCap": 50,
    "alertThreshold": 40
  }
}
```

## 🏗️ 项目结构

```
deepseek-code/
├── bin/
│   ├── deepseek-code.js      # npm 全局安装入口（自包含，零依赖）
│   └── deepcode.js            # 源码 CLI 入口（需 Bun）
├── src/
│   ├── api/
│   │   ├── deepseekApi.ts     # DeepSeek V4 API 适配器（核心）
│   │   ├── deepseekClient.ts  # SDK 兼容层（替代 Anthropic SDK）
│   │   ├── deepseekConfig.ts  # 配置系统
│   │   └── index.ts           # 统一导出
│   ├── commands/deepcode/
│   │   ├── config.ts          # 配置向导
│   │   ├── doctor.ts          # 环境诊断
│   │   ├── learn.ts           # 项目学习
│   │   ├── analyze.ts         # Token 分析
│   │   └── preheat.ts         # 缓存预热
│   ├── context/
│   │   └── ContextAssembler.ts # 缓存优化组装器
│   └── utils/model/
│       ├── deepseekModels.ts  # DeepSeek 模型定义
│       └── providers.ts       # 提供者检测（已扩展）
├── package.json
├── README.md
├── INSTALL.md
├── GITHUB.md
└── LICENSE
```

## 🤝 贡献

```bash
# 克隆并开发
git clone https://github.com/yourusername/deepseek-code.git
cd deepseek-code
bun install
export DEEPSEEK_API_KEY=sk-xxx
bun run bin/deepcode.js
```

请阅读 [GITHUB.md](GITHUB.md) 了解详细的开源贡献指南。

## 📋 Roadmap

- [x] 一行命令 npm 安装，各平台通用
- [x] CLI 命令（config/doctor/learn/analyze/preheat）
- [x] DeepSeek V4 API 适配器
- [x] 缓存优化组装器
- [ ] 完整 REPL 交互模式（从源码）
- [ ] 语义缓存层（TF-IDF 向量索引）
- [ ] 缓存监控仪表盘
- [ ] 自动模型切换（Pro/Flash）
- [ ] VSCode 扩展
- [ ] CI/CD 集成

## 📝 许可证

[MIT](LICENSE)

## ⚠️ 声明

DeepSeek Code 是基于 Claude Code 源代码改造的派生项目。原始 Claude Code 源代码归属于 **Anthropic**。

---

<div align="center">
  <strong>DeepSeek Code</strong> — 为 DeepSeek V4 而生，一行命令安装，极致性价比的 AI 编程助手
  <br>
  <code>npm install -g deepseek-code</code>
</div>
