// public/feedback.js - Cursor 优化版本
const { ipcRenderer } = require("electron");
const { remote } = require("@electron/remote");
const fs = require("fs");

let outputFile;
let hasUserInput = false;
let isSubmitting = false;
let isSubmittedSuccessfully = false;

ipcRenderer.on("init", (_event, { prompt, predefinedOptions, outputFile: outFile }) => {
  console.log("🎬 初始化 Cursor 反馈 UI，接收到参数:", { prompt, predefinedOptions, outputFile: outFile });

  outputFile = outFile;

  // 设置问题内容
  const descriptionElement = document.getElementById("description");
  descriptionElement.textContent = prompt;

  // 处理预定义选项
  const optionsContainer = document.getElementById("optionsContainer");
  const optionsDiv = document.getElementById("options");

  if (predefinedOptions && predefinedOptions.length > 0) {
    console.log("📋 创建预定义选项:", predefinedOptions);

    // 显示选项容器
    optionsContainer.style.display = "block";
    document.getElementById("separator").style.display = "block";

    predefinedOptions.forEach((option, index) => {
      const optionItem = document.createElement("div");
      optionItem.className = "option-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "option-checkbox";
      checkbox.id = `option-${index}`;
      checkbox.tabIndex = index + 1; // 设置tab顺序

      const label = document.createElement("label");
      label.className = "option-label";
      label.htmlFor = `option-${index}`;
      label.textContent = option;

      // 添加点击事件
      optionItem.addEventListener("click", (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          trackUserInput();
        }
      });

      checkbox.addEventListener("change", trackUserInput);

      optionItem.appendChild(checkbox);
      optionItem.appendChild(label);
      optionsDiv.appendChild(optionItem);
    });
  } else {
    // 隐藏选项容器
    optionsContainer.style.display = "none";
    document.getElementById("separator").style.display = "none";
  }

  // 确保文本框可以正常聚焦和输入
  setTimeout(() => {
    const feedbackText = document.getElementById("feedbackText");
    if (feedbackText) {
      console.log("🎯 设置文本框聚焦");

      // 移除可能的readonly属性
      feedbackText.removeAttribute("readonly");
      feedbackText.removeAttribute("disabled");

      // 确保样式允许交互
      feedbackText.style.pointerEvents = "auto";
      feedbackText.style.userSelect = "text";
      feedbackText.style.cursor = "text";

      // 设置tabindex确保可以聚焦
      feedbackText.tabIndex = 100;

      // 多次尝试聚焦，确保成功
      feedbackText.focus();

      // 再次确认聚焦
      setTimeout(() => {
        if (document.activeElement !== feedbackText) {
          console.log("🔄 重新尝试聚焦文本框");
          feedbackText.focus();
          feedbackText.click(); // 模拟点击来确保聚焦
        }
        console.log("📝 当前聚焦元素:", document.activeElement.id || "未知");
      }, 200);
    }
  }, 300); // 增加延迟确保DOM完全加载

  console.log("✅ Cursor 反馈 UI 初始化完成");
});

// 跟踪用户输入
function trackUserInput() {
  hasUserInput = true;
  updateSubmitButton();
}

// 更新提交按钮状态
function updateSubmitButton() {
  const submitButton = document.getElementById("submitButton");
  const feedbackText = document.getElementById("feedbackText");

  const hasText = feedbackText && feedbackText.value.trim().length > 0;
  const hasSelectedOptions = getSelectedOptions().length > 0;

  if (hasText || hasSelectedOptions) {
    submitButton.disabled = false;
    submitButton.textContent = "提交反馈";
  } else {
    submitButton.disabled = false; // 允许空反馈，但会有提示
    submitButton.textContent = "提交反馈";
  }
}

// 获取选中的选项
function getSelectedOptions() {
  const selectedOptions = [];
  const optionsDiv = document.getElementById("options");
  const checkboxes = optionsDiv.getElementsByTagName("input");

  for (let i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i].checked) {
      const optionItem = checkboxes[i].closest(".option-item");
      const label = optionItem.querySelector(".option-label");
      if (label) {
        selectedOptions.push(label.textContent);
      }
    }
  }

  return selectedOptions;
}

// 设置事件监听器
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔧 设置 Cursor 反馈事件监听器");

  // 设置按钮点击事件
  const submitButton = document.getElementById("submitButton");
  if (submitButton) {
    submitButton.addEventListener("click", (e) => {
      console.log("🖱️ 按钮点击触发提交");
      e.preventDefault();
      submitFeedback();
    });
  }

  // 设置文本输入事件 - 增强版本
  const feedbackText = document.getElementById("feedbackText");
  if (feedbackText) {
    console.log("📝 设置文本框事件监听器");

    // 确保文本框可交互
    feedbackText.style.pointerEvents = "auto";
    feedbackText.style.userSelect = "text";
    feedbackText.removeAttribute("readonly");
    feedbackText.removeAttribute("disabled");

    // 监听输入变化
    feedbackText.addEventListener("input", (e) => {
      console.log("📝 检测到输入:", e.target.value.length, "字符");
      trackUserInput();
      updateSubmitButton();
    });

    // 监听键盘按下事件
    feedbackText.addEventListener("keydown", (e) => {
      console.log("⌨️ 键盘按下:", e.key);

      // Ctrl+Enter 提交
      if (e.ctrlKey && e.key === "Enter") {
        console.log("⌨️ Ctrl+Enter 快捷键触发提交");
        e.preventDefault();
        submitFeedback();
        return;
      }

      // Escape 键关闭窗口（开发模式下）
      if (e.key === "Escape" && process.env.NODE_ENV === "development") {
        console.log("⌨️ Escape 键关闭窗口");
        remote.getCurrentWindow().close();
        return;
      }
    });

    // 监听键盘按键事件（用于字符输入）
    feedbackText.addEventListener("keypress", (e) => {
      console.log("⌨️ 字符输入:", e.key);
    });

    // 监听点击事件，确保可以聚焦
    feedbackText.addEventListener("click", (e) => {
      console.log("🖱️ 文本框被点击");
      e.target.focus();
    });

    // 监听聚焦事件
    feedbackText.addEventListener("focus", (e) => {
      console.log("🎯 文本框获得焦点");
      e.target.style.borderColor = "#4a9eff";
    });

    // 监听失焦事件
    feedbackText.addEventListener("blur", (e) => {
      console.log("💫 文本框失去焦点");
      e.target.style.borderColor = "#404040";
    });
  }

  // 全局快捷键监听
  document.addEventListener("keydown", (e) => {
    // Ctrl+Enter 全局快捷键
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      submitFeedback();
    }

    // F1 显示帮助
    if (e.key === "F1") {
      e.preventDefault();
      showHelp();
    }
  });

  // 窗口点击事件，用于调试
  document.addEventListener("click", (e) => {
    console.log("🖱️ 页面点击:", e.target.tagName, e.target.id || "无ID");
  });

  // 初始化按钮状态
  updateSubmitButton();

  console.log("✅ 所有事件监听器已设置完成");
});

// 显示帮助信息
function showHelp() {
  const helpText = `
🔤 快捷键帮助：
• Ctrl+Enter: 提交反馈
• F1: 显示此帮助
• Tab: 在元素间切换

💡 使用提示：
• 详细描述您的需求
• 选择相关的预定义选项
• 提供具体的修改建议
  `;

  alert(helpText);
}

// 提交反馈函数
function submitFeedback() {
  try {
    console.log("📤 Cursor 反馈提交函数被调用");

    // 获取文本反馈
    const feedbackTextElement = document.getElementById("feedbackText");
    const feedbackText = feedbackTextElement ? feedbackTextElement.value.trim() : "";
    console.log("📝 文本反馈:", feedbackText);

    // 获取选中的选项
    const selectedOptions = getSelectedOptions();
    console.log("📋 选中的选项:", selectedOptions);

    // 构建反馈内容
    const feedbackParts = [];

    if (selectedOptions.length > 0) {
      feedbackParts.push(`**选中的选项：**\n${selectedOptions.map((opt) => `• ${opt}`).join("\n")}`);
    }

    if (feedbackText) {
      feedbackParts.push(`**详细反馈：**\n${feedbackText}`);
    }

    // 如果没有任何反馈，询问用户
    if (feedbackParts.length === 0) {
      const confirmEmpty = confirm("您还没有输入任何反馈内容。\n\n是否要提交空反馈？这将告诉AI继续当前的方案。");
      if (!confirmEmpty) {
        // 聚焦到文本框
        if (feedbackTextElement) {
          feedbackTextElement.focus();
        }
        return;
      }
      feedbackParts.push("用户确认继续当前方案，无额外反馈。");
    }

    const finalFeedback = feedbackParts.join("\n\n");
    console.log("📋 最终反馈内容:", finalFeedback);

    // 构建结果对象
    const result = {
      interactive_feedback: finalFeedback,
      timestamp: new Date().toISOString(),
      selected_options: selectedOptions,
      text_feedback: feedbackText,
      ui_type: "electron",
      user_confirmed: true,
      cursor_optimized: true,
    };

    console.log("💾 准备保存结果:", result);
    console.log("📁 输出文件路径:", outputFile);

    // 保存结果到文件
    if (outputFile) {
      try {
        // 禁用提交按钮，防止重复提交
        const submitButton = document.getElementById("submitButton");
        submitButton.disabled = true;
        submitButton.textContent = "提交中...";

        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf8");
        console.log("✅ 结果已保存到文件");

        // 验证文件
        if (fs.existsSync(outputFile)) {
          const savedContent = fs.readFileSync(outputFile, "utf8");
          console.log("🔍 验证保存的内容:", savedContent);

          // 设置提交成功状态
          isSubmittedSuccessfully = true;
          console.log("✅ 提交状态已设置为成功");

          // 显示成功反馈
          submitButton.textContent = "✅ 已提交";
          submitButton.style.background = "#28a745";

          // 禁用beforeunload保护并强制关闭窗口
          console.log("🔚 禁用窗口关闭保护并准备强制关闭");

          // 移除beforeunload事件监听器
          window.removeEventListener("beforeunload", window.beforeUnloadHandler);

          // 延迟关闭窗口，确保用户能看到成功提示
          setTimeout(() => {
            try {
              console.log("🔚 强制关闭反馈窗口");
              // 尝试多种关闭方法确保可靠性
              if (remote && remote.getCurrentWindow) {
                remote.getCurrentWindow().close();
              } else {
                window.close();
              }

              // 添加关闭超时检测
              setTimeout(() => {
                console.warn("⚠️ 窗口关闭超时，尝试强制终止");
                if (remote && remote.app) {
                  remote.app.quit();
                } else {
                  console.error("❌ 无法访问remote.app进行强制关闭");
                }
              }, 2000); // 2秒超时
            } catch (closeError) {
              console.error("❌ 关闭窗口失败，尝试备用方法:", closeError);
              try {
                window.close();

                // 备用方案的超时检测
                setTimeout(() => {
                  console.warn("⚠️ 备用关闭方法超时");
                  if (remote && remote.app) {
                    remote.app.quit();
                  }
                }, 1500);
              } catch (fallbackError) {
                console.error("❌ 备用关闭方法也失败:", fallbackError);
                // 最后的备用方案：强制退出
                if (remote && remote.app) {
                  remote.app.quit();
                } else {
                  console.error("❌ 所有关闭方法都失败，无法关闭窗口");
                  alert("窗口关闭失败，请手动关闭");
                }
              }
            }
          }, 800);
        } else {
          throw new Error("文件保存后不存在");
        }
      } catch (writeError) {
        console.error("❌ 写入文件失败:", writeError);
        alert(`保存反馈失败: ${writeError.message}\n\n请重试或联系支持。`);

        // 恢复按钮状态
        const submitButton = document.getElementById("submitButton");
        submitButton.disabled = false;
        submitButton.textContent = "提交反馈";
        return;
      }
    } else {
      console.error("❌ 没有输出文件路径");
      alert("错误: 没有指定输出文件路径");
      return;
    }
  } catch (error) {
    console.error("❌ 提交反馈时发生错误:", error);
    alert(`提交反馈时发生错误: ${error.message}`);

    // 恢复按钮状态
    const submitButton = document.getElementById("submitButton");
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "提交反馈";
    }
  }
}

// 优化的窗口关闭前确认处理
function beforeUnloadHandler(e) {
  // 如果已成功提交，跳过确认
  if (isSubmittedSuccessfully) {
    console.log("🔚 已提交成功，跳过关闭确认");
    return undefined;
  }

  // 如果有用户输入但未提交，显示确认
  if (hasUserInput && !isSubmittedSuccessfully) {
    const message = "您有未保存的反馈内容，确定要关闭窗口吗？";
    e.returnValue = message;
    return message;
  }
}

// 添加beforeunload事件监听器
window.beforeUnloadHandler = beforeUnloadHandler;
window.addEventListener("beforeunload", beforeUnloadHandler);

// 确保函数在全局作用域中可用
window.submitFeedback = submitFeedback;
window.showHelp = showHelp;

console.log("🌐 Cursor 优化反馈脚本已加载完成");
