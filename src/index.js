// src/index.js
const { app, BrowserWindow } = require("electron");
const path = require("path");
const remoteMain = require("@electron/remote/main");
remoteMain.initialize();

let mainWindow;

function createWindow(prompt, predefinedOptions, outputFile) {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    alwaysOnTop: true,
  });

  // 设置字符编码
  mainWindow.webContents.setUserAgent(mainWindow.webContents.getUserAgent() + " charset=utf-8");

  // 打开开发者工具以便调试
  if (process.env.NODE_ENV === "development" || process.argv.includes("--debug")) {
    mainWindow.webContents.openDevTools();
  }

  // Enable remote module for this window
  remoteMain.enable(mainWindow.webContents);

  mainWindow.loadFile(path.join(__dirname, "..", "public", "feedback.html"));
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.send("init", { prompt, predefinedOptions, outputFile });
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", () => {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i += 2) {
    params[args[i].replace("--", "")] = args[i + 1];
  }

  // 处理参数名称，支持带连字符的参数
  const prompt = params.prompt || "Enter your feedback";
  const predefinedOptions = params["predefined-options"] || "";
  const outputFile = params["output-file"]; // 修复：使用正确的参数名

  const options = predefinedOptions ? predefinedOptions.split("|||") : [];

  console.log("📋 解析的参数:", { prompt, predefinedOptions, outputFile });
  createWindow(prompt, options, outputFile);
});

app.on("window-all-closed", () => {
  app.quit();
});
