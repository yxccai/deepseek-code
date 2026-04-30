# 更新日志

## [1.0.0] - 2026-04-30

### 🎉 首个正式版本

DeepSeek Code 的首个版本，基于 Claude Code 源代码改造，专门为 DeepSeek V4 优化。

### ✨ 新功能

- **DeepSeek V4 API 适配器** — 直连 DeepSeek 官方 API，支持 OpenAI 兼容格式
- **SDK 兼容层** — 无缝替代 Anthropic SDK，现有功能无需修改即可使用
- **硬盘缓存深度优化** — 针对 DeepSeek 精确前缀匹配缓存机制优化
- **智能上下文组装器** — 确保静态内容始终位于 prompt 前缀位置

### 🛠️ CLI 命令

- `deepcode config` — 交互式配置向导，一键完成所有设置
- `deepcode doctor` — 环境诊断，检查连接和性能
- `deepcode learn` — 项目学习模式，扫描并建立代码索引
- `deepcode analyze` — Token 消费深度分析及优化建议
- `deepcode preheat` — 缓存预热功能

### 🔧 核心改造

- 替换 Anthropic API 客户端为 DeepSeek OpenAI 兼容客户端
- 新增 DeepSeek V4 模型定义（`deepseek-v4-pro` / `deepseek-v4-flash`）
- 更新定价系统，支持人民币计价缓存定价
- 基于环境变量 `DEEPSEEK_API_KEY` 自动切换提供者
- 新增 DeepSeek 模型配置到模型注册表

### 📦 项目结构

- 添加 `package.json` 和 CLI 入口点
- 创建完整的文档体系
- 优化配置系统，支持三级配置优先级

### 📄 文档

- 详细的 README（含使用指南和项目结构）
- 安装指南（INSTALL.md）
- GitHub 开源指南（GITHUB.md）
- 更新日志（CHANGELOG.md）
- 价格对比和缓存优化说明

### 💰 性能目标

- 缓存命中率目标：95%+
- 成本降低：相比 Claude Code 降低 95%+
- 新用户配置时间：< 1 分钟
- 功能完整性：保留 100% Claude Code 功能
