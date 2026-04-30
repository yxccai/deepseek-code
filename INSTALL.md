# DeepSeek Code 安装指南

一行命令安装，各平台通用。

## 系统要求
- **操作系统**: Windows / macOS / Linux
- **运行时**: [Node.js](https://nodejs.org) >= 18.0.0 + [Bun](https://bun.sh)（完整 REPL 需要）
- **网络**: 需要访问 `api.deepseek.com`

## 安装

```bash
# 安装 DeepSeek Code
npm install -g @yxccai/deepseek-code

# 安装 Bun（完整 REPL 需要）
npm install -g bun
```

## 配置 API Key

```bash
deepseek config --api-key sk-你的key
```

## 使用

```bash
# 完整交互模式（在项目目录中）
cd my-project
deepseek code

# CLI 命令
deepseek doctor
deepseek config --show
deepseek learn
deepseek preheat
```

## 从源码运行

```bash
git clone https://github.com/yxccai/deepseek-code.git
cd deepseek-code
bun install
bun run bin/deepcode.js
```

## 更新

```bash
npm update -g @yxccai/deepseek-code
cd ~/deepseek-code && git pull && bun install  # 如果用源码
```

## 常见问题

### deepseek code 无法启动完整模式？
确保已安装 Bun 并在项目目录中运行。

### Windows 命令找不到？
重启终端，或使用 `npx @yxccai/deepseek-code`。

### 如何选模型？
`deepseek config --model deepseek-v4-pro` 或设置 `DEEPSEEK_MODEL`。
