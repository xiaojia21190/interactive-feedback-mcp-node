import { app, BrowserWindow, screen, dialog } from "electron";
import * as path from "path";
import * as remoteMain from "@electron/remote/main";

remoteMain.initialize();

let mainWindow: BrowserWindow | null;

function createWindow(prompt: string, predefinedOptions: string[], outputFile: string): void {
  console.log("🚀 创建 Cursor 反馈窗口...");
  console.log("📋 参数:", { prompt, predefinedOptions, outputFile });

  try {
    mainWindow = new BrowserWindow({
      width: 600,
      height: 450,
      resizable: true,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      alwaysOnTop: true,
      skipTaskbar: false,
      show: false, // 先隐藏，加载完成后再显示
      title: "Interactive Feedback - Cursor",
      icon: path.join(__dirname, "..", "public", "icon.png"), // 如果有图标的话
      frame: true,
      titleBarStyle: "default",
      center: true, // 居中显示
      autoHideMenuBar: true, // 隐藏菜单栏
    });

    // 设置窗口位置到屏幕右侧，方便与 Cursor 并用
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // 将窗口放置在屏幕右侧
    mainWindow.setPosition(
      Math.floor(screenWidth - 620), // 距离右边缘 20px
      Math.floor((screenHeight - 450) / 2) // 垂直居中
    );

    // 设置字符编码
    mainWindow.webContents.setUserAgent(mainWindow.webContents.getUserAgent() + " charset=utf-8");

    // 只在调试模式下打开开发者工具
    if (process.env.NODE_ENV === "development" || process.argv.includes("--debug") || process.env.DEBUG === "true") {
      console.log("🔧 启用开发者工具");
      mainWindow.webContents.openDevTools();
    }

    // Enable remote module for this window
    remoteMain.enable(mainWindow.webContents);

    const htmlPath: string = path.join(__dirname, "..", "public", "feedback.html");
    console.log("📄 加载 HTML 文件:", htmlPath);

    mainWindow.loadFile(htmlPath);

    mainWindow.webContents.on("did-finish-load", () => {
      console.log("✅ HTML 加载完成，发送初始化数据");
      if (mainWindow) {
        mainWindow.webContents.send("init", { prompt, predefinedOptions, outputFile });
        mainWindow.show(); // 加载完成后显示窗口
        mainWindow.focus(); // 聚焦窗口
      }
    });

    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
      console.error("❌ HTML 加载失败:", errorCode, errorDescription);
      process.exit(1);
    });

    mainWindow.on("closed", () => {
      console.log("🔚 窗口已关闭");
      mainWindow = null;
    });

    mainWindow.on("ready-to-show", () => {
      console.log("👁️ 窗口准备就绪");
    });

    // 处理窗口创建错误
    mainWindow.on("unresponsive", () => {
      console.error("⚠️ 窗口无响应");
    });

    // 防止窗口被意外关闭
    mainWindow.on("close", (event) => {
      if (process.env.NODE_ENV !== "development") {
        // 在生产模式下，确认用户是否真的要关闭
        const choice = dialog.showMessageBoxSync(mainWindow!, {
          type: "question",
          buttons: ["取消", "关闭"],
          defaultId: 0, // 默认选择"取消"，避免误操作
          cancelId: 0, // 按Escape键时选择"取消"
          message: "确定要关闭反馈窗口吗？",
          detail: "如果有未保存的反馈内容将会丢失。",
        });

        if (choice === 0) {
          // 用户选择"取消"
          event.preventDefault();
        }
        // choice === 1 时用户选择"关闭"，允许关闭窗口
      }
    });

    console.log("✅ Cursor 反馈窗口创建成功");
  } catch (error) {
    console.error("❌ 创建窗口时发生错误:", error);
    process.exit(1);
  }
}

app.on("ready", () => {
  console.log("🎬 Electron 应用启动");
  console.log("🌍 环境变量:", {
    NODE_ENV: process.env.NODE_ENV,
    DEBUG: process.env.DEBUG,
  });

  try {
    const args: string[] = process.argv.slice(2);
    console.log("📝 原始命令行参数:", args);

    const params: Record<string, string> = {};
    for (let i = 0; i < args.length; i += 2) {
      if (args[i] && args[i]!.startsWith("--")) {
        params[args[i]!.replace("--", "")] = args[i + 1] || "";
      }
    }

    console.log("🔧 解析后的参数:", params);

    // 处理参数名称，支持带连字符的参数
    const prompt: string = params["prompt"] || "Enter your feedback";
    const predefinedOptions: string = params["predefined-options"] || "";
    const outputFile: string = params["output-file"] || ""; // 修复：使用正确的参数名

    const options: string[] = predefinedOptions ? predefinedOptions.split("|||") : [];

    console.log("📋 最终解析的参数:", { prompt, predefinedOptions, outputFile, options });

    if (!outputFile) {
      console.error("❌ 缺少必需的 output-file 参数");
      process.exit(1);
    }

    createWindow(prompt, options, outputFile);
  } catch (error) {
    console.error("❌ 应用启动时发生错误:", error);
    process.exit(1);
  }
});

app.on("window-all-closed", () => {
  console.log("🔚 所有窗口已关闭，退出应用");
  app.quit();
});

app.on("before-quit", () => {
  console.log("👋 应用即将退出");
});

// 处理应用级错误
process.on("uncaughtException", (error: Error) => {
  console.error("💥 未捕获的异常:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason: any, _promise: Promise<any>) => {
  console.error("💥 未处理的 Promise 拒绝:", reason);
  process.exit(1);
});

// 添加应用启动超时检测
setTimeout(() => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.error("⏰ 应用启动超时");
    process.exit(1);
  }
}, 30000); // 30秒超时
