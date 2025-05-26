# 🚀 NPX 配置指南

本指南介绍如何使用 npx 配置和运行 Interactive Feedback MCP 服务器。

## 📦 方法一：直接使用 npx（推荐）

### 1. 配置 Claude Desktop

编辑您的 `claude_desktop_config.json` 文件：

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "interactive-feedback": {
      "command": "npx",
      "args": [
        "interactive-feedback-mcp-node"
      ],
      "timeout": 600,
      "autoApprove": [
        "interactive_feedback"
      ]
    }
  }
}
```

### 2. 配置 Cursor

编辑您的 `mcp.json` 文件：

**Windows:** `%APPDATA%\Cursor\User\globalStorage\mcp.json`
**macOS:** `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
**Linux:** `~/.config/Cursor/User/globalStorage/mcp.json`

```json
{
  "mcpServers": {
    "interactive-feedback": {
      "command": "npx",
      "args": [
        "interactive-feedback-mcp-node"
      ],
      "timeout": 600,
      "autoApprove": [
        "interactive_feedback"
      ]
    }
  }
}
```

## 📦 方法二：全局安装后使用

### 1. 全局安装包

```bash
npm install -g interactive-feedback-mcp-node
```

### 2. 配置 MCP 客户端

```json
{
  "mcpServers": {
    "interactive-feedback": {
      "command": "interactive-feedback-mcp",
      "args": [],
      "timeout": 600,
      "autoApprove": [
        "interactive_feedback"
      ]
    }
  }
}
```

## 📦 方法三：本地开发配置

如果您正在本地开发或测试：

### 1. 克隆仓库并安装依赖

```bash
git clone https://github.com/your-username/interactive-feedback-mcp-node.git
cd interactive-feedback-mcp-node
npm install
```

### 2. 使用绝对路径配置

```json
{
  "mcpServers": {
    "interactive-feedback": {
      "command": "node",
      "args": [
        "/absolute/path/to/interactive-feedback-mcp-node/src/server.js"
      ],
      "timeout": 600,
      "autoApprove": [
        "interactive_feedback"
      ]
    }
  }
}
```

### 3. 或使用 npx 指向本地目录

```json
{
  "mcpServers": {
    "interactive-feedback": {
      "command": "npx",
      "args": [
        "/absolute/path/to/interactive-feedback-mcp-node"
      ],
      "timeout": 600,
      "autoApprove": [
        "interactive_feedback"
      ]
    }
  }
}
```

## 🔧 测试配置

### 1. 测试 npx 命令

```bash
# 测试 npx 是否能正确运行服务器
npx interactive-feedback-mcp-node

# 或者如果已全局安装
interactive-feedback-mcp
```

### 2. 测试 MCP 协议

```bash
# 发送初始化消息测试
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | npx interactive-feedback-mcp-node
```

## 🎯 AI 助手规则配置

在您的 AI 助手中添加以下规则（Cursor Settings > Rules > User Rules）：

```
如果需求或指令不清楚，请使用 interactive_feedback 工具向用户询问澄清问题，不要做假设。尽可能通过 interactive_feedback MCP 工具向用户提供预定义选项，以便快速决策。

每当您即将完成用户请求时，请调用 interactive_feedback 工具请求用户反馈，然后再结束流程。如果反馈为空，您可以结束请求，不要循环调用该工具。
```

## 🐛 故障排除

### 常见问题

1. **npx 命令找不到包**
   ```bash
   # 清除 npx 缓存
   npx --clear-cache

   # 强制重新下载
   npx --force interactive-feedback-mcp-node
   ```

2. **权限问题**
   ```bash
   # Windows: 以管理员身份运行
   # macOS/Linux: 使用 sudo（如果需要）
   sudo npm install -g interactive-feedback-mcp-node
   ```

3. **Electron 依赖问题**
   ```bash
   # 重新安装 Electron
   npm install electron --force

   # 检查系统是否满足 Electron 要求
   npx electron --version
   ```

### 调试模式

启用调试模式查看详细日志：

```json
{
  "mcpServers": {
    "interactive-feedback": {
      "command": "npx",
      "args": [
        "interactive-feedback-mcp-node"
      ],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true"
      },
      "timeout": 600,
      "autoApprove": [
        "interactive_feedback"
      ]
    }
  }
}
```

## ✅ 验证安装

成功配置后，您应该能够：

1. 在 AI 助手中看到 `interactive_feedback` 工具可用
2. 当 AI 调用该工具时，会弹出反馈窗口
3. 提交反馈后，AI 会收到您的回复并继续对话

## 📚 更多信息

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [项目 GitHub 仓库](https://github.com/your-username/interactive-feedback-mcp-node)
- [问题报告](https://github.com/your-username/interactive-feedback-mcp-node/issues)
