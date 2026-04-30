# DeepSeek Code — GitHub 开源指南

本文档说明如何将 DeepSeek Code 发布到 GitHub，以及其他人如何下载、配置和使用。

## 📤 发布到 GitHub

### 1. 创建 GitHub 仓库

在 [github.com](https://github.com) 创建一个新仓库（例如 `deepseek-code`）。

### 2. 初始化和推送代码

```bash
# 在项目根目录初始化 Git
cd deepseek-code
git init

# 创建 .gitignore
cat > .gitignore << EOF
node_modules/
dist/
.env
*.local
.DS_Store
*.log
.vscode/
.idea/
EOF

# 添加文件并提交
git add .
git commit -m "feat: initial DeepSeek Code release v1.0.0"

# 添加远程仓库并推送
git remote add origin https://github.com/yourusername/deepseek-code.git
git branch -M main
git push -u origin main
```

### 3. 创建 Release

```bash
# 创建标签
git tag v1.0.0
git push origin v1.0.0
```

然后在 GitHub 页面创建 Release，包含以下信息：

**Title:** DeepSeek Code v1.0.0
**Body:**
```
## DeepSeek Code v1.0.0 — 基于 DeepSeek V4 的 AI 编程助手

为 DeepSeek V4 垂直深度优化，追求极致的性能和极低的成本。

### 主要特性
- 直连 DeepSeek API，无需中间层
- 极致缓存优化，目标 95%+ 命中率
- 超低成本：Flash 仅 ¥0.2/M token（缓存命中）
- 一键配置，1 分钟完成设置
- 保留 Claude Code 100% 功能
```

### 4. 设置 GitHub Pages（可选）

在仓库 Settings > Pages 中，选择 `main` 分支的 `/docs` 文件夹来托管文档网站。

## 📥 用户如何获取和使用

### 方式一：直接克隆

用户只需执行：

```bash
git clone https://github.com/yourusername/deepseek-code.git
cd deepseek-code
bun install
export DEEPSEEK_API_KEY=sk-xxx
bun run bin/deepcode.js
```

### 方式二：通过 npm 安装（后续支持）

```bash
npm install -g deepseek-code
deepcode config
```

### 方式三：一键脚本（推荐新手）

创建一个 `install.sh`：

```bash
#!/bin/bash
# DeepSeek Code 一键安装脚本

set -e

echo "🚀 正在安装 DeepSeek Code..."

# 检查 Bun
if ! command -v bun &> /dev/null; then
    echo "正在安装 Bun..."
    curl -fsSL https://bun.sh/install | bash
    source ~/.bashrc
fi

# 克隆仓库
echo "正在下载 DeepSeek Code..."
git clone https://github.com/yourusername/deepseek-code.git
cd deepseek-code

# 安装依赖
echo "正在安装依赖..."
bun install

# 配置 API Key
echo ""
echo "请输入你的 DeepSeek API Key（在 https://platform.deepseek.com/api_keys 获取）："
read -r api_key
echo "{\"apiKey\": \"$api_key\"}" > ~/.deepcode/config.json

echo ""
echo "✅ DeepSeek Code 安装完成！"
echo ""
echo "快速开始："
echo "  cd deepseek-code"
echo "  bun run bin/deepcode.js doctor   # 验证安装"
echo "  bun run bin/deepcode.js          # 启动编程助手"
echo ""
```

## 🔄 保持与上游同步

如果你希望跟踪 Claude Code 的原始更新：

```bash
# 添加上游仓库
git remote add upstream https://github.com/anthropics/claude-code.git

# 拉取上游更新
git fetch upstream

# 合并（注意可能产生冲突）
git merge upstream/main
```

## 📦 npm 包发布（可选）

如果你希望将 DeepSeek Code 发布为 npm 包：

```bash
# 登录 npm
npm login

# 发布
npm publish
```

然后在 README 的安装徽章中添加：
```markdown
[![npm version](https://img.shields.io/npm/v/deepseek-code.svg)](https://www.npmjs.com/package/deepseek-code)
```

## 🔐 安全建议

1. **永远不要将 API Key 提交到 Git 仓库**
2. 使用 `.env` 文件管理敏感信息（已加入 `.gitignore`）
3. 在 CI/CD 中使用 Secrets 而非硬编码
4. 定期轮换 API Key
5. 设置预算上限防止意外超支

## 🌟 推广清单

发布后，可以在以下平台推广：

- [ ] GitHub Trending
- [ ] Hacker News
- [ ] Product Hunt
- [ ] Reddit (r/programming, r/javascript)
- [ ] V2EX (中文社区)
- [ ] 知乎
- [ ] 掘金
- [ ] 公众号/技术博客

## 📊 社区指标

建议追踪以下指标：

| 指标 | 说明 |
|------|------|
| GitHub Stars | 项目受欢迎程度 |
| Fork 数 | 社区参与度 |
| Issues 解决率 | 项目维护健康度 |
| PR 合并时间 | 社区响应速度 |
| npm 下载量 | 用户采用率 |
