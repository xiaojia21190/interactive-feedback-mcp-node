# 🎯 Cursor 专用配置指南

本指南专门为 Cursor IDE 用户提供 Interactive Feedback MCP 服务的完整配置和使用说明。

## 🚀 快速开始

### 1. 下载和安装

```bash
# 克隆项目到本地
git clone https://github.com/xiaojia21190/interactive-feedback-mcp-node.git
cd interactive-feedback-mcp-node

# 安装依赖
npm install
```

### 2. 配置 Cursor

在您的 Cursor 设置中找到 MCP 配置文件位置：
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/mcp.json`

如果文件不存在，请创建它。

### 3. 基础配置

```json
{
  "mcpServers": {
    "interactive-feedback": {
      "command": "node",
      "args": [
        "D:\\path\\to\\interactive-feedback-mcp-node\\src\\server.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "DEBUG": "false"
      },
      "timeout": 600,
      "autoApprove": [
        "interactive_feedback"
      ]
    }
  }
}
```

**重要**: 将 `YOUR_PROJECT_PATH` 替换为您的实际项目路径。

## 🔧 高级配置选项

### 生产环境配置（推荐）

```json
{
  "mcpServers": {
    "interactive-feedback": {
      "command": "node",
      "args": [
        "D:\\path\\to\\interactive-feedback-mcp-node\\src\\server.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "DEBUG": "false"
      },
      "timeout": 600,
      "autoApprove": [
        "interactive_feedback"
      ]
    }
  }
}
```

### 调试模式配置

如果遇到问题，可以启用调试模式：

```json
{
  "mcpServers": {
    "interactive-feedback": {
      "command": "node",
      "args": [
        "D:\\path\\to\\interactive-feedback-mcp-node\\src\\server.js"
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

## 🎨 用户体验优化

### Cursor AI 规则配置

在 Cursor 的设置中添加以下规则，让AI更好地使用反馈功能：

**路径**: Settings > Rules > User Rules

```
当需求不明确或可能有多种理解方式时，使用 interactive_feedback 工具向用户询问具体需求，不要做假设。

在实施重要更改之前，使用 interactive_feedback 工具确认用户意图。

完成任务后，使用 interactive_feedback 工具询问用户是否满意，或是否需要调整。

使用 interactive_feedback 时，提供清晰的问题描述和相关的预定义选项来帮助用户快速决策。
```

### 反馈窗口特性

- 🎨 **现代化界面**: 专为 Cursor 工作流设计的深色主题
- ⚡ **快捷键支持**: `Ctrl+Enter` 快速提交，`F1` 显示帮助
- 📍 **智能定位**: 窗口自动出现在屏幕右侧，不遮挡 Cursor
- 🔄 **实时验证**: 输入内容实时验证和提示
- 💾 **防丢失保护**: 意外关闭时会提醒保存

## 🛠️ 使用流程

### 1. AI 触发反馈请求

当 AI 需要您的反馈时，会自动：
- 弹出优化的反馈窗口
- 显示具体问题和选项
- 等待您的输入

### 2. 提供反馈

您可以：
- ✅ 选择预定义选项（如果有）
- ✏️ 输入详细的文字反馈
- ⭐ 两者结合使用

### 3. 快速提交

- 使用 `Ctrl+Enter` 快速提交
- 或点击"提交反馈"按钮
- 窗口会自动关闭并返回结果给 Cursor

### 4. AI 继续处理

AI 会根据您的反馈：
- 调整实施方案
- 继续完成任务
- 或询问进一步的澄清

## 📝 最佳实践

### 编写有效反馈

**✅ 好的反馈：**
```
请将按钮颜色改为蓝色，并增加一个loading状态的动画效果。
另外，错误提示信息需要更友好一些。
```

**❌ 不够清晰的反馈：**
```
不对，改一下。
```

### 使用预定义选项

当 AI 提供选项时，优先选择最接近的选项，然后在文字区域补充细节。

### 利用快捷键

- `Ctrl+Enter`: 提交反馈
- `F1`: 查看帮助
- `Tab`: 在界面元素间切换

## 🧪 测试和验证

### 快速测试

```bash
# 测试图形界面
npm run test:electron

# 完整诊断
npm run diagnose
```

### 验证配置

1. 重启 Cursor
2. 在聊天中输入: "请使用 interactive_feedback 工具询问我想要什么颜色的按钮"
3. 应该会弹出反馈窗口

## 🚨 常见问题解决

### 问题1: 反馈窗口不出现

**解决方案:**
1. 检查路径是否正确
2. 确认 Node.js 已安装
3. 尝试启用调试模式
4. 查看 Cursor 的 MCP 日志

### 问题2: 窗口闪退

**解决方案:**
1. 重新安装 Electron: `npm install electron --force`
2. 检查系统权限
3. 启用调试模式查看详细错误信息

### 问题3: 中文显示异常

**解决方案:**
1. 确保系统区域设置正确
2. 在配置中添加环境变量:
```json
"env": {
  "LANG": "zh_CN.UTF-8",
  "LC_ALL": "zh_CN.UTF-8"
}
```

## 🔍 调试工具

### 启用详细日志

```json
"env": {
  "DEBUG": "true",
  "NODE_ENV": "development"
}
```

### 查看 MCP 日志

在 Cursor 中：
1. 打开开发者工具 (`Ctrl+Shift+I`)
2. 查看 Console 标签页
3. 搜索 "interactive-feedback" 相关日志

### 手动测试

```bash
# 测试服务器
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node src/server.js

# 测试UI
node test-ui.js --message "测试消息"
```

## 📚 进阶配置

### 自定义界面

如需修改界面样式，可以编辑：
- `public/feedback.html` - 界面结构和样式
- `public/feedback.js` - 交互逻辑

### 集成其他工具

可以将此 MCP 服务与其他开发工具集成：
- Claude Desktop
- VS Code (通过扩展)
- 其他支持 MCP 的工具

## 🆘 获取帮助

### 文档资源

- [README.md](./README.md) - 基本介绍
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排除
- [NPX-SETUP.md](./NPX-SETUP.md) - NPX 配置

### 社区支持

- [GitHub Issues](https://github.com/xiaojia21190/interactive-feedback-mcp-node/issues)
- [MCP 官方文档](https://modelcontextprotocol.io/)

### 提交问题

提交问题时请包含：
1. 操作系统和版本
2. Cursor 版本
3. 配置文件内容
4. 错误日志
5. 重现步骤

---

**🎉 享受更高效的 AI 协作体验！**
