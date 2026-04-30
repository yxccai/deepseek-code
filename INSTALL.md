# DeepSeek Code 安装指南

一行命令，各平台通用。

## 📋 系统要求

- **操作系统**: Windows / macOS / Linux（全部支持）
- **运行时**: [Node.js](https://nodejs.org) >= 18.0.0（如未安装，[点此下载](https://nodejs.org)）
- **网络**: 需要访问 `api.deepseek.com`

## 🚀 一行命令安装（推荐）

```bash
npm install -g deepseek-code
```

安装完成后即可使用：

```bash
# 启动编程助手
deepseek code

# 运行诊断
deepseek doctor

# 查看帮助
deepseek --help
```

### Windows 用户

```cmd
npm install -g deepseek-code
deepseek code
```

### macOS / Linux 用户

```bash
sudo npm install -g deepseek-code
deepseek code
```

## 🎯 快速开始

### 1. 安装

```bash
npm install -g deepseek-code
```

### 2. 验证

```bash
deepseek doctor
```

应该看到：
```
总体状态: ✅ 一切正常
```

### 3. 运行

```bash
deepseek code
```

## 🔑 获取 API Key

1. 访问 [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
2. 注册/登录 DeepSeek 账号
3. 创建 API Key 并复制

## ⚙️ 配置 API Key

### Windows (cmd)
```cmd
set DEEPSEEK_API_KEY=sk-your_key_here
deepseek config --validate
```

### Windows (PowerShell)
```powershell
$env:DEEPSEEK_API_KEY="sk-your_key_here"
deepseek config --validate
```

### macOS / Linux
```bash
export DEEPSEEK_API_KEY=sk-xxx
deepseek config --validate
```

## 🔄 更新

```bash
npm update -g deepseek-code
```

## 🗑️ 卸载

```bash
npm uninstall -g deepseek-code
```

## 📦 从源码运行（完整 REPL 模式）

如需完整交互式编程助手（文件编辑、命令执行等），需从源码运行：

```bash
# 1. 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 2. 克隆仓库
git clone https://github.com/yourusername/deepseek-code.git
cd deepseek-code

# 3. 安装依赖
bun install

# 4. 运行
export DEEPSEEK_API_KEY=sk-xxx
bun run bin/deepcode.js
```

## ❓ 常见问题

### Q: `npm install -g` 权限错误？
A: macOS/Linux 用 `sudo npm install -g deepseek-code`，或配置 npm 前缀。

### Q: Windows 上 `deepseek` 命令找不到？
A: 确保 npm 全局安装目录在 PATH 中。重新打开终端，或使用 `npx deepseek-code`。

### Q: 如何选择 Pro 和 Flash？
A: `deepseek config --model deepseek-v4-pro` 或设置 `DEEPSEEK_MODEL` 环境变量。

### Q: `deepseek code` 提示需要源码？
A: 完整交互模式需要从 GitHub 克隆源码 + Bun。npm 版支持所有 CLI 命令。

### Q: 如何降低成本？
A: 使用 Flash 模型，确保 prompt 前缀超过 1024 token 触发缓存。

## 📚 更多资源

- [DeepSeek 官方文档](https://platform.deepseek.com/docs)
- [DeepSeek 价格](https://platform.deepseek.com/pricing)
- [GitHub Issues](https://github.com/yourusername/deepseek-code/issues)
