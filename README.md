# DeepSeek Code 🚀

> 基于 DeepSeek V4 的 AI 编程助手。一行命令安装，各平台通用。
> 为 DeepSeek V4 垂直深度优化，保留 Claude Code 全部功能。

```bash
npm install -g @yxccai/deepseek-code
deepseek code
```

## ✨ 核心特性

- **一行安装**: `npm install -g @yxccai/deepseek-code`，各平台通用
- **功能完整**: 保留 Claude Code 全部功能 — 文件编辑、终端命令、工具调用、Git 操作等
- **直连 DeepSeek API**: 无需中间层，直接调用 DeepSeek V4 官方 API
- **极致缓存优化**: 针对 DeepSeek 硬盘缓存机制深度优化
- **智能模型切换**: 简单任务自动使用 Flash，复杂任务升级为 Pro
- **1M 上下文窗口**: 充分利用 DeepSeek V4 的百万级上下文能力
- **中文原生支持**: 原生中文界面和交互

## 🚀 一行命令安装

### 前提条件
- [Node.js](https://nodejs.org) >= 18.0.0
- [Bun](https://bun.sh)（完整 REPL 模式需要）: `npm install -g bun`
- DeepSeek API Key（[点此获取](https://platform.deepseek.com/api_keys)）

### 安装

```bash
# 全局安装
npm install -g @yxccai/deepseek-code

# 安装 Bun（完整 REPL 需要）
npm install -g bun
```

### 配置 API Key

```bash
# 配置
deepseek config --api-key sk-你的key

# 验证
deepseek doctor
```

### 启动

在项目目录中：
```bash
cd your-project
deepseek code
```

也可在各目录使用 CLI 命令：
```bash
deepseek doctor
deepseek config --show
```

## 📖 使用指南

### 完整 REPL 模式（全部功能）

在项目目录中运行 `deepseek code` 进入完整交互模式，支持：
- 代码阅读和分析
- 文件编辑和修改
- 终端命令执行
- Git 操作
- 网络搜索和抓取
- 工具调用

### CLI 命令

| 命令 | 说明 |
|------|------|
| `deepseek code` | 启动完整交互式编程助手 |
| `deepseek config` | 配置向导 |
| `deepseek doctor` | 环境诊断 |
| `deepseek learn` | 项目学习 |
| `deepseek preheat` | 缓存预热 |

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | API Key（必需） | - |
| `DEEPSEEK_MODEL` | 模型选择 | `deepseek-v4-flash` |
| `DEEPSEEK_BASE_URL` | API 地址 | `https://api.deepseek.com/v1` |
| `DEEPSEEK_MAX_TOKENS` | 最大 Token 数 | `8192` |

## 🔧 缓存优化

DeepSeek V4 使用硬盘精确前缀匹配缓存。缓存命中与未命中的价格差异显著，优化缓存可大幅降低成本。

### 优化建议

- 将系统提示词、工具定义等静态内容放在 prompt 最前面
- 确保静态前缀超过 1024 token
- 对齐到 128 token 边界
- 相同项目重复对话可最大化缓存命中率

## 📦 从源码运行

```bash
git clone https://github.com/yxccai/deepseek-code.git
cd deepseek-code
bun install
export DEEPSEEK_API_KEY=sk-xxx
bun run bin/deepcode.js
```

## 🏗️ 项目结构

```
deepseek-code/
├── bin/
│   ├── deepseek-code.js      # npm 全局安装入口
│   └── deepcode.js            # 源码 CLI 入口（需 Bun）
├── src/
│   ├── api/                   # DeepSeek API 适配器
│   ├── commands/deepcode/     # CLI 命令
│   ├── context/               # 缓存优化
│   └── ...（Claude Code 完整源码）
├── package.json
└── README.md
```

## 📝 许可证

[MIT](LICENSE)

---

<div align="center">
  <strong>DeepSeek Code</strong> — 基于 DeepSeek V4 的 AI 编程助手
  <br>
  <code>npm install -g @yxccai/deepseek-code</code>
</div>
