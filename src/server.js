#!/usr/bin/env node

// src/server.js
const readline = require("readline");
const { spawn } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

// MCP 服务器类
class InteractiveFeedbackMCP {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
    this.initialized = false;
    this.capabilities = {
      tools: {},
    };
  }

  // 启动服务器
  run() {
    process.stderr.write("Interactive Feedback MCP server starting...\n");
    this.rl.on("line", (line) => this.handleRequest(line));
  }

  // 处理 MCP 请求
  async handleRequest(line) {
    try {
      const request = JSON.parse(line);
      let response;

      switch (request.method) {
        case "initialize":
          response = await this.handleInitialize(request);
          break;
        case "tools/list":
          response = await this.handleListTools(request);
          break;
        case "tools/call":
          response = await this.handleCallTool(request);
          break;
        default:
          response = {
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32601, message: "Method not found" },
          };
      }

      console.log(JSON.stringify(response));
    } catch (error) {
      process.stderr.write(`Error handling request: ${error.message}\n`);
      const response = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: `Parse error: ${error.message}` },
      };
      console.log(JSON.stringify(response));
    }
  }

  // 处理初始化请求
  async handleInitialize(request) {
    this.initialized = true;
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: this.capabilities,
        serverInfo: {
          name: "interactive-feedback-mcp-node",
          version: "0.1.0",
        },
      },
    };
  }

  // 处理工具列表请求
  async handleListTools(request) {
    if (!this.initialized) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32002, message: "Server not initialized" },
      };
    }

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        tools: [
          {
            name: "interactive_feedback",
            description: "Request interactive feedback from the user",
            inputSchema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "The specific question for the user",
                },
                predefined_options: {
                  type: "array",
                  items: { type: "string" },
                  description: "Predefined options for the user to choose from (optional)",
                },
              },
              required: ["message"],
            },
          },
        ],
      },
    };
  }

  // 处理工具调用请求
  async handleCallTool(request) {
    if (!this.initialized) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32002, message: "Server not initialized" },
      };
    }

    const { name, arguments: args } = request.params;

    if (name === "interactive_feedback") {
      try {
        const result = await this.interactiveFeedback(args.message, args.predefined_options);
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            content: [
              {
                type: "text",
                text: result.interactive_feedback,
              },
            ],
          },
        };
      } catch (error) {
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            content: [
              {
                type: "text",
                text: `Error: ${error.message}`,
              },
            ],
            isError: true,
          },
        };
      }
    } else {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32601, message: "Tool not found" },
      };
    }
  }

  // 实现 interactive_feedback 工具
  async interactiveFeedback(message, predefinedOptions) {
    const tempFile = path.join(os.tmpdir(), `feedback-${Date.now()}.json`);

    // 尝试使用Electron UI，如果失败则使用模拟UI
    const electronUiPath = path.join(__dirname, "feedback_ui.js");
    const mockUiPath = path.join(__dirname, "mock_ui.js");

    // 检查是否有Electron可用，但允许通过环境变量强制使用Mock UI
    const hasElectron = fs.existsSync(path.join(__dirname, "..", "node_modules", "electron"));
    const useElectron = hasElectron && !process.env.FORCE_MOCK_UI;

    let execPath, args;
    if (useElectron) {
      // Use Electron executable for Electron UI
      try {
        const electronPath = require("electron");
        execPath = electronPath;
      } catch (err) {
        // Fallback to manual path if require fails
        execPath = path.join(__dirname, "..", "node_modules", "electron", "dist", "electron.exe");
      }
      args = [electronUiPath, "--prompt", message, "--output-file", tempFile, ...(predefinedOptions ? ["--predefined-options", predefinedOptions.join("|||")] : [])];
    } else {
      // Use Node.js for mock UI
      execPath = process.execPath;
      args = [mockUiPath, "--prompt", message, "--output-file", tempFile, ...(predefinedOptions ? ["--predefined-options", predefinedOptions.join("|||")] : [])];
    }

    return new Promise((resolve, reject) => {
      process.stderr.write(`Launching ${useElectron ? "Electron" : "Mock"} UI with args: ${JSON.stringify(args)}\n`);

      const child = spawn(execPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
        shell: false,
        env: { ...process.env, LANG: "zh_CN.UTF-8", LC_ALL: "zh_CN.UTF-8" },
      });

      // 监听子进程的输出以便调试
      child.stdout.on("data", (data) => {
        process.stderr.write(`UI stdout: ${data}`);
      });

      child.stderr.on("data", (data) => {
        process.stderr.write(`UI stderr: ${data}`);
      });

      child.on("error", (err) => {
        process.stderr.write(`Child process error: ${err.message}\n`);
        reject(new Error(`Failed to launch feedback UI: ${err.message}`));
      });

      child.on("exit", (code, signal) => {
        process.stderr.write(`Child process exited with code ${code}, signal ${signal}\n`);

        if (code !== 0) {
          reject(new Error(`Feedback UI exited with code ${code}`));
          return;
        }

        try {
          if (fs.existsSync(tempFile)) {
            const result = JSON.parse(fs.readFileSync(tempFile, "utf8"));
            fs.unlinkSync(tempFile);
            resolve(result);
          } else {
            reject(new Error("Feedback result file not found"));
          }
        } catch (err) {
          reject(new Error(`Failed to read feedback result: ${err.message}`));
        }
      });

      // 设置超时
      setTimeout(() => {
        if (!child.killed) {
          child.kill();
          reject(new Error("Feedback UI timeout"));
        }
      }, 300000); // 5分钟超时
    });
  }
}

if (require.main === module) {
  const mcp = new InteractiveFeedbackMCP();
  mcp.run();
}

module.exports = InteractiveFeedbackMCP;
