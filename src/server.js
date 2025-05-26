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

        // 格式化反馈结果，支持 Markdown
        let formattedResponse = "";

        if (result.interactive_feedback) {
          formattedResponse = `## 📝 用户反馈\n\n${result.interactive_feedback}`;
        } else {
          formattedResponse = "用户已确认，无额外反馈。";
        }

        // 添加时间戳和额外信息
        if (result.timestamp) {
          const timeStr = new Date(result.timestamp).toLocaleString("zh-CN");
          formattedResponse += `\n\n---\n*反馈时间: ${timeStr}*`;
        }

        // 如果有选中的选项，单独展示
        if (result.selected_options && result.selected_options.length > 0) {
          formattedResponse += `\n\n**选中选项:** ${result.selected_options.join(", ")}`;
        }

        // 如果是 Cursor 优化版本，添加标识
        if (result.cursor_optimized) {
          formattedResponse += `\n\n> ✨ 通过 Cursor 优化界面提交`;
        }

        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            content: [
              {
                type: "text",
                text: formattedResponse,
              },
            ],
            isError: false,
            metadata: {
              source: "interactive_feedback",
              ui_type: result.ui_type || "unknown",
              has_user_input: !!(result.text_feedback || (result.selected_options && result.selected_options.length > 0)),
              timestamp: result.timestamp,
            },
          },
        };
      } catch (error) {
        process.stderr.write(`Interactive feedback error: ${error.message}\n`);

        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            content: [
              {
                type: "text",
                text: `## ❌ 反馈收集失败\n\n**错误信息:** ${error.message}\n\n**建议:** 请检查 MCP 服务配置或查看故障排除文档。`,
              },
            ],
            isError: true,
            metadata: {
              source: "interactive_feedback",
              error: error.message,
              timestamp: new Date().toISOString(),
            },
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

    // 使用Electron UI
    const electronUiPath = path.join(__dirname, "feedback_ui.js");

    // 检查Electron是否可用
    const hasElectron = fs.existsSync(path.join(__dirname, "..", "node_modules", "electron"));

    if (!hasElectron) {
      throw new Error("Electron not found. Please install electron: npm install electron");
    }

    // 增强调试信息
    if (process.env.DEBUG === "true") {
      process.stderr.write(`=== 调试信息 ===\n`);
      process.stderr.write(`临时文件路径: ${tempFile}\n`);
      process.stderr.write(`Electron 可用: ${hasElectron}\n`);
      process.stderr.write(`消息内容: ${message}\n`);
      process.stderr.write(`预定义选项: ${predefinedOptions ? predefinedOptions.join(", ") : "无"}\n`);
      process.stderr.write(`===============\n`);
    }

    let execPath, args;

    // Use Electron executable for Electron UI
    try {
      const electronPath = require("electron");
      execPath = electronPath;
      if (process.env.DEBUG === "true") {
        process.stderr.write(`Electron 路径: ${execPath}\n`);
      }
    } catch (err) {
      // Fallback to manual path if require fails
      execPath = path.join(__dirname, "..", "node_modules", "electron", "dist", "electron.exe");
      if (process.env.DEBUG === "true") {
        process.stderr.write(`Electron require 失败，使用回退路径: ${execPath}\n`);
        process.stderr.write(`错误信息: ${err.message}\n`);
      }
    }

    args = [electronUiPath, "--prompt", message, "--output-file", tempFile, ...(predefinedOptions ? ["--predefined-options", predefinedOptions.join("|||")] : [])];

    // 显示完整的启动命令用于调试
    if (process.env.DEBUG === "true") {
      process.stderr.write(`完整启动命令: ${execPath} ${args.join(" ")}\n`);
    }

    return new Promise((resolve, reject) => {
      process.stderr.write(`Launching Electron UI with args: ${JSON.stringify(args)}\n`);

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
        process.stderr.write(`错误详情: ${JSON.stringify(err, null, 2)}\n`);
        reject(new Error(`Failed to launch feedback UI: ${err.message}`));
      });

      child.on("exit", (code, signal) => {
        process.stderr.write(`Child process exited with code ${code}, signal ${signal}\n`);

        if (code !== 0) {
          process.stderr.write(`=== 错误诊断信息 ===\n`);
          process.stderr.write(`退出代码: ${code}\n`);
          process.stderr.write(`信号: ${signal}\n`);
          process.stderr.write(`使用的执行路径: ${execPath}\n`);
          process.stderr.write(`传递的参数: ${JSON.stringify(args)}\n`);
          process.stderr.write(`工作目录: ${process.cwd()}\n`);
          process.stderr.write(`临时文件路径: ${tempFile}\n`);
          process.stderr.write(`临时文件是否存在: ${fs.existsSync(tempFile)}\n`);
          process.stderr.write(`====================\n`);

          reject(new Error(`Feedback UI exited with code ${code}`));
          return;
        }

        try {
          if (fs.existsSync(tempFile)) {
            const result = JSON.parse(fs.readFileSync(tempFile, "utf8"));
            fs.unlinkSync(tempFile);
            if (process.env.DEBUG === "true") {
              process.stderr.write(`成功读取结果: ${JSON.stringify(result, null, 2)}\n`);
            }
            resolve(result);
          } else {
            process.stderr.write(`临时文件不存在: ${tempFile}\n`);
            reject(new Error("Feedback result file not found"));
          }
        } catch (err) {
          process.stderr.write(`读取反馈结果失败: ${err.message}\n`);
          reject(new Error(`Failed to read feedback result: ${err.message}`));
        }
      });

      // 设置超时
      setTimeout(() => {
        if (!child.killed) {
          process.stderr.write(`UI 进程超时，强制终止...\n`);
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
