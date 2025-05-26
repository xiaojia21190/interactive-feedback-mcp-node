#!/usr/bin/env node

// test-mcp-popup.js - 测试 MCP interactive_feedback 弹窗功能
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

console.log("🧪 测试 MCP Interactive Feedback 弹窗功能");
console.log("===========================================");

async function testMCPServer() {
  return new Promise((resolve, reject) => {
    console.log("📡 启动 MCP 服务器...");

    const serverPath = path.join(__dirname, "src", "server.js");
    const server = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "production", DEBUG: "false" },
    });

    let serverReady = false;
    let outputBuffer = "";

    server.stderr.on("data", (data) => {
      const output = data.toString();
      outputBuffer += output;
      if (output.includes("starting")) {
        serverReady = true;
        console.log("✅ MCP 服务器已启动");
        testInteractiveFeedback(server, resolve, reject);
      }
    });

    server.on("error", (err) => {
      console.error("❌ MCP 服务器启动失败:", err.message);
      reject(err);
    });

    // 2秒后如果还没就绪，强制开始测试
    setTimeout(() => {
      if (!serverReady) {
        console.log("⏰ 超时，尝试开始测试...");
        testInteractiveFeedback(server, resolve, reject);
      }
    }, 2000);
  });
}

function testInteractiveFeedback(server, resolve, reject) {
  console.log("\n🔧 测试 interactive_feedback 工具调用...");

  // 1. 发送初始化请求
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "1.0.0" },
    },
  };

  console.log("📤 发送初始化请求...");
  server.stdin.write(JSON.stringify(initRequest) + "\n");

  let responses = [];
  let requestId = 1;

  server.stdout.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());

    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
        console.log("📨 收到响应:", response.id, response.result ? "成功" : "错误");

        // 如果初始化成功，发送工具调用请求
        if (response.id === 1 && response.result) {
          setTimeout(() => {
            sendToolCall(server);
          }, 500);
        }

        // 如果是工具调用响应，检查结果
        if (response.id === 2) {
          handleToolCallResponse(response, server, resolve, reject);
        }
      } catch (err) {
        console.log("📝 非JSON响应:", line.substring(0, 100));
      }
    }
  });

  function sendToolCall(server) {
    console.log("\n🛠️ 发送 interactive_feedback 工具调用...");

    const toolCallRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "interactive_feedback",
        arguments: {
          message: "🧪 这是一个测试消息！\n\n请在弹出的窗口中测试文本输入功能。您可以：\n• 选择下面的选项\n• 在文本框中输入反馈\n• 使用 Ctrl+Enter 快速提交",
          predefined_options: ["✅ 弹窗正常显示", "📝 文本框可以输入", "⌨️ 快捷键正常工作", "🎨 界面美观且易用", "❌ 发现问题"],
        },
      },
    };

    server.stdin.write(JSON.stringify(toolCallRequest) + "\n");
    console.log("⏳ 等待弹窗出现...");
    console.log("💡 请在弹出的窗口中进行测试，然后提交反馈");
  }

  function handleToolCallResponse(response, server, resolve, reject) {
    console.log("\n📋 工具调用响应分析:");

    if (response.error) {
      console.error("❌ 工具调用失败:", response.error.message);
      server.kill();
      reject(new Error(response.error.message));
      return;
    }

    if (response.result && response.result.content && response.result.content[0]) {
      const feedback = response.result.content[0].text;
      console.log("✅ 成功收到用户反馈:");
      console.log("📝 反馈内容:", feedback);

      // 检查反馈是否包含预期信息
      if (feedback.includes("用户反馈") || feedback.includes("选中的选项") || feedback.includes("详细反馈")) {
        console.log("\n🎉 测试成功！interactive_feedback 功能正常工作");
        console.log("✅ 弹窗成功显示");
        console.log("✅ 用户输入功能正常");
        console.log("✅ 数据传输正常");
      } else {
        console.log("\n⚠️ 收到反馈但格式可能不完整");
        console.log("🔍 请检查反馈内容格式");
      }

      server.kill();
      resolve(feedback);
    } else {
      console.error("❌ 未收到有效的反馈内容");
      server.kill();
      reject(new Error("Invalid feedback response"));
    }
  }

  // 60秒超时
  setTimeout(() => {
    console.log("\n⏰ 测试超时");
    console.log("💡 如果弹窗出现但您没有提交，这是正常的");
    console.log("💡 请手动测试弹窗功能并提交反馈");
    server.kill();
    resolve("TIMEOUT - 请手动测试");
  }, 60000);
}

// 运行测试
console.log("🚀 开始测试...");
console.log("💡 注意：测试过程中会弹出反馈窗口，请按提示操作");

testMCPServer()
  .then((result) => {
    console.log("\n🏁 测试完成");
    console.log("📊 结果:", typeof result === "string" ? result.substring(0, 200) + "..." : result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 测试失败:", error.message);
    console.log("\n🔧 可能的解决方案:");
    console.log("1. 检查 Node.js 是否正确安装");
    console.log("2. 检查 Electron 依赖是否完整: npm install");
    console.log("3. 尝试 Mock UI 模式: 设置环境变量 FORCE_MOCK_UI=true");
    console.log("4. 查看详细错误信息并参考 CURSOR_SETUP.md");
    process.exit(1);
  });
