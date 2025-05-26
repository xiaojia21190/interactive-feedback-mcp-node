# 🗣️ Interactive Feedback MCP (Node.js Version)

Simple [MCP Server](https://modelcontextprotocol.io/) to enable a human-in-the-loop workflow in AI-assisted development tools like [Cursor](https://www.cursor.com), [Cline](https://cline.bot), and [Windsurf](https://windsurf.com). This server allows you to easily provide feedback directly to the AI agent, bridging the gap between AI and you.

**Note:** This server is designed to run locally alongside the MCP client (e.g., Claude Desktop, VS Code), as it needs direct access to the user's operating system to display notifications.

## 🖼️ Example

![Interactive Feedback Example](https://raw.githubusercontent.com/poliva/interactive-feedback-mcp/refs/heads/main/.github/example.png)

## 💡 Why Use This?

In environments like Cursor, every prompt you send to the LLM is treated as a distinct request — and each one counts against your monthly limit (e.g., 500 premium requests). This becomes inefficient when you're iterating on vague instructions or correcting misunderstood output, as each follow-up clarification triggers a full new request.

This MCP server introduces a workaround: it allows the model to pause and request clarification before finalizing the response. Instead of completing the request, the model triggers a tool call (`interactive_feedback`) that opens an interactive feedback window. You can then provide more detail or ask for changes — and the model continues the session, all within a single request.

Under the hood, it's just a clever use of tool calls to defer the completion of the request. Since tool calls don't count as separate premium interactions, you can loop through multiple feedback cycles without consuming additional requests.

Essentially, this helps your AI assistant _ask for clarification instead of guessing_, without wasting another request. That means fewer wrong answers, better performance, and less wasted API usage.

- **💰 Reduced Premium API Calls:** Avoid wasting expensive API calls generating code based on guesswork.
- **✅ Fewer Errors:** Clarification _before_ action means less incorrect code and wasted time.
- **⏱️ Faster Cycles:** Quick confirmations beat debugging wrong guesses.
- **🎮 Better Collaboration:** Turns one-way instructions into a dialogue, keeping you in control.

## 🛠️ Tools

This server exposes the following tool via the Model Context Protocol (MCP):

- `interactive_feedback`: Asks the user a question and returns their answer. Can display predefined options.

## 📦 Installation & Configuration

### 🚀 Quick Start with npx (Recommended)

The easiest way to use this MCP server is with npx - no installation required!

Add the following configuration to your MCP client:

**Claude Desktop** (`claude_desktop_config.json`):
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

**Cursor** (`mcp.json`):
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

### 📦 Alternative: Global Installation

1. **Install globally:**
   ```bash
   npm install -g interactive-feedback-mcp-node
   ```

2. **Configure MCP client:**
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

### 🛠️ Development Setup

1. **Prerequisites:**
   - Node.js 18 or newer
   - npm (Node.js package manager)

2. **Get the code:**
   ```bash
   git clone https://github.com/your-username/interactive-feedback-mcp-node.git
   cd interactive-feedback-mcp-node
   npm install
   ```

3. **Configure with absolute path:**
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

### 📍 Configuration File Locations

**Claude Desktop:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Cursor:**
- Windows: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- Linux: `~/.config/Cursor/User/globalStorage/mcp.json`

### 🧪 Testing Your Configuration

Test if npx can run the server:
```bash
npx interactive-feedback-mcp-node
```

Test MCP protocol communication:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | npx interactive-feedback-mcp-node
```

### 🎯 AI Assistant Rules

Add the following to your AI assistant's custom rules (Cursor Settings > Rules > User Rules):

> If requirements or instructions are unclear use the tool interactive_feedback to ask clarifying questions to the user before proceeding, do not make assumptions. Whenever possible, present the user with predefined options through the interactive_feedback MCP tool to facilitate quick decisions.

> Whenever you're about to complete a user request, call the interactive_feedback tool to request user feedback before ending the process. If the feedback is empty you can end the request and don't call the tool in loop.

This ensures your AI assistant uses this MCP server to request user feedback when prompts are unclear and before completing tasks.

## 🚀 Usage

### Running the Server

To test the server directly:

```bash
npm start
```

### Testing the UI

To test just the Electron UI:

```bash
npm run ui -- --prompt "Test message" --predefined-options "Option 1|||Option 2|||Option 3"
```

### Manual Testing

You can manually test the MCP server by sending JSON-RPC messages:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node src/server.js
```

## 🔧 Development

### Project Structure

```
src/
├── server.js          # Main MCP server implementation
├── index.js           # Electron main process
├── feedback_ui.js     # Electron UI launcher
public/
├── feedback.html      # UI HTML
└── feedback.js        # UI JavaScript
```

### Key Features

- **MCP Protocol Compliance**: Implements the full MCP specification with proper JSON-RPC 2.0 messaging
- **Electron UI**: Cross-platform desktop interface for user feedback
- **Timeout Handling**: Prevents hanging processes with configurable timeouts
- **Error Handling**: Comprehensive error reporting and logging
- **Debug Support**: Detailed logging for troubleshooting

## 🙏 Acknowledgements

Developed by Fábio Ferreira ([@fabiomlferreira](https://x.com/fabiomlferreira)).

Enhanced by Pau Oliva ([@pof](https://x.com/pof)) with ideas from Tommy Tong's [interactive-mcp](https://github.com/ttommyth/interactive-mcp).

Node.js implementation based on the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk).
