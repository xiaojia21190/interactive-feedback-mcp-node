// src/feedback_ui.ts - 增强版本，兼容多种执行环境
import * as path from "path";
import { app } from "electron";

// 环境检测和日志记录
const isDebugMode: boolean = process.env.NODE_ENV === "development" || process.argv.includes("--debug");
const isCursorMCP: boolean = process.argv.some((arg) => arg.includes("feedback_ui.ts")) && process.argv.length > 2;

console.log("=== Interactive Feedback UI 启动 ===");
console.log("时间:", new Date().toISOString());
console.log("执行环境:", {
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  cwd: process.cwd(),
  dirname: __dirname,
  isCursorMCP,
  isDebugMode,
});
console.log("命令行参数:", process.argv);

// Set user data path when app is ready
app.whenReady().then(() => {
  console.log("App ready - 设置用户数据路径");
  try {
    const userDataPath: string = path.join(app.getPath("userData"), "InteractiveFeedbackMCP");
    app.setPath("userData", userDataPath);
    console.log("用户数据路径设置成功:", app.getPath("userData"));
  } catch (error) {
    console.error("设置用户数据路径时出错:", error);
  }
});

// 错误处理
process.on("uncaughtException", (error: Error) => {
  console.error("未捕获异常:", error);
  console.error("堆栈信息:", error.stack);
});

process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("未处理的Promise拒绝:", reason);
  console.error("Promise:", promise);
});

// 应用事件监听（调试模式下）
if (isDebugMode) {
  app.on("ready", () => console.log("App ready 事件触发"));
  app.on("window-all-closed", () => console.log("所有窗口关闭事件"));
  app.on("before-quit", () => console.log("应用即将退出"));
  app.on("will-quit", () => console.log("应用将要退出"));
  app.on("activate", () => console.log("应用激活事件"));
}

console.log("准备加载 index.ts");
try {
  require("./index.ts");
  console.log("index.ts 加载成功");
} catch (error) {
  console.error("加载 index.ts 时出错:", error);
  console.error("错误堆栈:", (error as Error).stack);
  process.exit(1);
}
