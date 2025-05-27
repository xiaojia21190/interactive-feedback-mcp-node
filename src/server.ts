#!/usr/bin/env node

/**
 * Interactive Feedback MCP Server - TypeScript 重构版本
 * 使用官方 @modelcontextprotocol/sdk 实现
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { spawn } from "child_process";
import { z } from "zod";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import type { FeedbackResult } from "./types.js";

// 创建 MCP 服务器实例
const server = new McpServer({
  name: "interactive-feedback-mcp-node",
  version: "0.1.0",
});

/**
 * 查找 Electron 可执行文件路径
 */
function findElectronPath(projectRoot: string): string {
  const candidates: string[] = [];

  // 策略1: 尝试 require('electron') 但进行路径验证
  try {
    const electronPathModule = require("electron");
    process.stderr.write(`require("electron") 返回: ${electronPathModule}\n`);

    // 验证返回的是否是有效的文件路径
    if (
      typeof electronPathModule === "string" &&
      electronPathModule.length > 0 &&
      !electronPathModule.includes("npx") &&
      (electronPathModule.endsWith(".exe") || electronPathModule.endsWith("electron"))
    ) {
      candidates.push(electronPathModule);
      process.stderr.write(`策略1成功: ${electronPathModule}\n`);
    } else {
      process.stderr.write(`策略1返回值无效: ${electronPathModule}\n`);
    }
  } catch (err) {
    process.stderr.write(`策略1失败: ${(err as Error).message}\n`);
  }

  // 策略2: 查找 .bin 目录中的executable
  const electronExecutable = process.platform === "win32" ? "electron.exe" : "electron";
  const binPath = path.join(projectRoot, "node_modules", ".bin", electronExecutable);
  candidates.push(binPath);
  process.stderr.write(`策略2候选: ${binPath}, 存在: ${fs.existsSync(binPath)}\n`);

  // 策略3: 查找electron包的dist目录
  if (process.platform === "win32") {
    const distPath = path.join(projectRoot, "node_modules", "electron", "dist", "electron.exe");
    candidates.push(distPath);
    process.stderr.write(`策略3候选 (Windows): ${distPath}, 存在: ${fs.existsSync(distPath)}\n`);
  } else {
    const distPath = path.join(projectRoot, "node_modules", "electron", "dist", "electron");
    candidates.push(distPath);
    process.stderr.write(`策略3候选 (非Windows): ${distPath}, 存在: ${fs.existsSync(distPath)}\n`);
  }

  // 从候选路径中选择第一个存在的
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      process.stderr.write(`选择路径: ${candidate}\n`);
      return candidate;
    }
  }

  throw new Error(`无法找到electron可执行文件。尝试的路径: ${candidates.join(", ")}`);
}

/**
 * 启动 Electron UI 并收集用户反馈
 */
async function interactiveFeedback(
  message: string,
  predefinedOptions?: string[]
): Promise<FeedbackResult> {
  const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, "..");
  const tempFile = path.join(os.tmpdir(), `feedback-${Date.now()}.json`);
  const electronUiPath = path.join(projectRoot, "src", "feedback_ui.ts");
  const htmlPath = path.join(projectRoot, "public", "feedback.html");

  // 验证必需文件存在
  const electronNodeModulesPath = path.join(projectRoot, "node_modules", "electron");
  const hasElectron = fs.existsSync(electronNodeModulesPath);
  const hasElectronUi = fs.existsSync(electronUiPath);
  const hasHtml = fs.existsSync(htmlPath);

  if (!hasElectron) {
    throw new Error(`Electron not found at ${electronNodeModulesPath}. Please install electron: npm install electron`);
  }
  if (!hasElectronUi) {
    throw new Error(`Electron UI script not found at ${electronUiPath}`);
  }
  if (!hasHtml) {
    throw new Error(`HTML file not found at ${htmlPath}`);
  }

  // 调试信息
  if (process.env.DEBUG === "true") {
    process.stderr.write(`=== 调试信息 ===\n`);
    process.stderr.write(`项目根目录: ${projectRoot}\n`);
    process.stderr.write(`临时文件路径: ${tempFile}\n`);
    process.stderr.write(`Electron UI 路径: ${electronUiPath}\n`);
    process.stderr.write(`HTML 文件路径: ${htmlPath}\n`);
    process.stderr.write(`Electron 可用: ${hasElectron}\n`);
    process.stderr.write(`消息内容: ${message}\n`);
    process.stderr.write(`预定义选项: ${predefinedOptions ? predefinedOptions.join(", ") : "无"}\n`);
    process.stderr.write(`当前工作目录: ${process.cwd()}\n`);
    process.stderr.write(`===============\n`);
  }

  // 查找 Electron 可执行文件
  let execPath: string;
  try {
    execPath = findElectronPath(projectRoot);
    process.stderr.write(`最终选择的electron路径: ${execPath}\n`);
  } catch (err) {
    process.stderr.write(`electron路径检测失败: ${(err as Error).message}\n`);
    throw new Error(`Failed to locate Electron executable: ${(err as Error).message}`);
  }

  const safeTempFile = tempFile.replace(/\s/g, "_");

  return new Promise((resolve, reject) => {
    const electronProcessArgs = [
      electronUiPath, // Script for Electron to run
      "--prompt",
      message,
      "--output-file",
      safeTempFile,
      ...(predefinedOptions ? ["--predefined-options", predefinedOptions.join("|||")] : []),
    ];

    // 调试日志
    process.stderr.write(`DEBUG: execPath = ${execPath}, exists = ${fs.existsSync(execPath)}\n`);
    process.stderr.write(`DEBUG: script to run (electronProcessArgs[0]) = ${electronProcessArgs[0]}, exists = ${electronProcessArgs[0] ? fs.existsSync(electronProcessArgs[0]) : false}\n`);
    process.stderr.write(`Spawning Electron: Command='${execPath}', Args=${JSON.stringify(electronProcessArgs)}\n`);
    process.stderr.write(`Working directory for spawn: ${projectRoot}\n`);

    const child = spawn(execPath, electronProcessArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      shell: false,
      cwd: projectRoot,
      env: {
        ...process.env,
        LANG: "zh_CN.UTF-8",
        LC_ALL: "zh_CN.UTF-8",
        NODE_ENV: process.env.NODE_ENV || "production",
        NODE_PATH: path.join(projectRoot, "node_modules"),
      },
    });

    child.stdout.on("data", (data) => {
      process.stderr.write(`UI stdout: ${data}`);
    });

    child.stderr.on("data", (data) => {
      process.stderr.write(`UI stderr: ${data}`);
    });

    child.on("error", (err) => {
      process.stderr.write(`Child process error (spawn failed): ${err.message}\n`);
      process.stderr.write(`错误详情: ${JSON.stringify(err, null, 2)}\n`);
      process.stderr.write(`执行路径是否存在 (execPath for spawn): ${fs.existsSync(execPath)}\n`);
      process.stderr.write(`UI脚本是否存在 (electronUiPath for spawn): ${fs.existsSync(electronUiPath)}\n`);
      reject(new Error(`Failed to launch feedback UI (spawn error): ${err.message}`));
    });

    child.on("exit", (code, signal) => {
      process.stderr.write(`Child process exited with code ${code}, signal ${signal}\n`);

      if (code !== 0) {
        process.stderr.write(`=== 错误诊断信息 ===\n`);
        process.stderr.write(`退出代码: ${code}\n`);
        process.stderr.write(`信号: ${signal}\n`);
        process.stderr.write(`使用的执行路径: ${execPath}\n`);
        process.stderr.write(`执行路径是否存在: ${fs.existsSync(execPath)}\n`);
        process.stderr.write(`传递的参数: ${JSON.stringify(electronProcessArgs)}\n`);
        process.stderr.write(`项目根目录: ${projectRoot}\n`);
        process.stderr.write(`当前工作目录(server.ts): ${process.cwd()}\n`);
        process.stderr.write(`临时文件路径: ${safeTempFile}\n`);
        process.stderr.write(`临时文件是否存在: ${fs.existsSync(safeTempFile)}\n`);
        process.stderr.write(`HTML文件是否存在: ${fs.existsSync(htmlPath)}\n`);
        process.stderr.write(`Electron UI脚本是否存在: ${fs.existsSync(electronUiPath)}\n`);
        process.stderr.write(`====================\n`);
        reject(new Error(`Feedback UI exited with code ${code}. Check "UI stderr" logs for details from the UI script.`));
        return;
      }

      try {
        if (fs.existsSync(safeTempFile)) {
          const result = JSON.parse(fs.readFileSync(safeTempFile, "utf8")) as FeedbackResult;
          fs.unlinkSync(safeTempFile);
          if (process.env.DEBUG === "true") {
            process.stderr.write(`成功读取结果: ${JSON.stringify(result, null, 2)}\n`);
          }
          resolve(result);
        } else {
          process.stderr.write(`临时文件不存在: ${safeTempFile}\n`);
          reject(new Error("Feedback result file not found, though UI exited cleanly."));
        }
      } catch (err) {
        process.stderr.write(`读取反馈结果失败: ${(err as Error).message}\n`);
        reject(new Error(`Failed to read feedback result: ${(err as Error).message}`));
      }
    });
  });
}

// 定义 interactive_feedback 工具
server.tool(
  "interactive_feedback",
  {
    message: z.string().describe("The specific question for the user"),
    predefined_options: z
      .array(z.string())
      .optional()
      .describe("Predefined options for the user to choose from (optional)"),
  },
  async ({ message, predefined_options }) => {
    try {
      const result = await interactiveFeedback(message, predefined_options);

      let formattedResponse = "";
      if (result.interactive_feedback) {
        formattedResponse = `## 📝 用户反馈\n\n${result.interactive_feedback}`;
      } else {
        formattedResponse = "用户已确认，无额外反馈。";
      }
      if (result.timestamp) {
        const timeStr = new Date(result.timestamp).toLocaleString("zh-CN");
        formattedResponse += `\n\n---\n*反馈时间: ${timeStr}*`;
      }
      if (result.selected_options && result.selected_options.length > 0) {
        formattedResponse += `\n\n**选中选项:** ${result.selected_options.join(", ")}`;
      }
      if (result.cursor_optimized) {
        formattedResponse += `\n\n> ✨ 通过 Cursor 优化界面提交`;
      }

      return {
        content: [
          {
            type: "text",
            text: formattedResponse,
          },
        ],
        isError: false,
        _meta: {
          source: "interactive_feedback",
          ui_type: result.ui_type || "unknown",
          has_user_input: !!(
            result.text_feedback ||
            (result.selected_options && result.selected_options.length > 0)
          ),
          timestamp: result.timestamp || undefined,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Interactive feedback error: ${errorMessage}\n`);
      return {
        content: [
          {
            type: "text",
            text: `## ❌ 反馈收集失败\n\n**错误信息:** ${errorMessage}\n\n**建议:** 请检查 MCP 服务配置或查看故障排除文档。`,
          },
        ],
        isError: true,
        _meta: {
          source: "interactive_feedback",
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
);

// 启动服务器
async function main() {
  process.stderr.write("Interactive Feedback MCP server starting (TypeScript version)...\n");

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write("Interactive Feedback MCP server connected and ready.\n");
}

// 错误处理
process.on("uncaughtException", (error) => {
  process.stderr.write(`Uncaught exception: ${error.message}\n`);
  process.stderr.write(`Stack: ${error.stack}\n`);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  process.stderr.write(`Unhandled rejection at: ${promise}, reason: ${reason}\n`);
  process.exit(1);
});

// 启动服务器
main().catch((error) => {
  process.stderr.write(`Failed to start server: ${error.message}\n`);
  process.exit(1);
});
