// public/feedback.js
const { ipcRenderer } = require("electron");
const { remote } = require("@electron/remote");
const fs = require("fs");

let outputFile;

ipcRenderer.on("init", (_event, { prompt, predefinedOptions, outputFile: outFile }) => {
  console.log("🎬 初始化UI，接收到参数:", { prompt, predefinedOptions, outputFile: outFile });

  outputFile = outFile;
  document.getElementById("description").textContent = prompt;

  const optionsDiv = document.getElementById("options");
  if (predefinedOptions && predefinedOptions.length > 0) {
    console.log("📋 创建预定义选项:", predefinedOptions);
    predefinedOptions.forEach((option, index) => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `option-${index}`;
      const label = document.createElement("label");
      label.htmlFor = `option-${index}`;
      label.textContent = option;
      optionsDiv.appendChild(checkbox);
      optionsDiv.appendChild(label);
      optionsDiv.appendChild(document.createElement("br"));
    });
    document.getElementById("separator").style.display = "block";
  }

  console.log("✅ UI初始化完成");
});

// 设置事件监听器 - 在DOM加载完成后立即执行
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔧 设置事件监听器");

  // 设置按钮点击事件
  const submitButton = document.getElementById("submitButton");
  if (submitButton) {
    submitButton.addEventListener("click", (e) => {
      console.log("🖱️ 按钮点击触发提交");
      e.preventDefault();
      submitFeedback();
    });
    console.log("✅ 按钮点击事件监听器已设置");
  } else {
    console.error("❌ 找不到提交按钮");
  }

  // 设置键盘快捷键事件
  const feedbackText = document.getElementById("feedbackText");
  if (feedbackText) {
    feedbackText.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        console.log("⌨️ Ctrl+Enter 快捷键触发提交");
        submitFeedback();
      }
    });
    console.log("✅ 键盘快捷键事件监听器已设置");
  } else {
    console.error("❌ 找不到文本输入框");
  }
});

// 备用事件监听器设置 - 如果DOMContentLoaded已经触发
if (document.readyState === "loading") {
  // DOM还在加载中，DOMContentLoaded事件会触发
  console.log("📄 DOM正在加载中，等待DOMContentLoaded事件");
} else {
  // DOM已经加载完成，立即设置事件监听器
  console.log("📄 DOM已加载完成，立即设置事件监听器");
  setTimeout(() => {
    const submitButton = document.getElementById("submitButton");
    if (submitButton && !submitButton.onclick) {
      submitButton.addEventListener("click", (e) => {
        console.log("🖱️ 备用按钮点击触发提交");
        e.preventDefault();
        submitFeedback();
      });
      console.log("✅ 备用按钮点击事件监听器已设置");
    }

    const feedbackText = document.getElementById("feedbackText");
    if (feedbackText) {
      feedbackText.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
          console.log("⌨️ 备用Ctrl+Enter快捷键触发提交");
          submitFeedback();
        }
      });
      console.log("✅ 备用键盘快捷键事件监听器已设置");
    }
  }, 100);
}

function submitFeedback() {
  try {
    console.log("📤 submitFeedback 函数被调用");

    // 获取文本反馈
    const feedbackTextElement = document.getElementById("feedbackText");
    const feedbackText = feedbackTextElement ? feedbackTextElement.value.trim() : "";
    console.log("📝 文本反馈:", feedbackText);

    // 获取选中的选项
    const selectedOptions = [];
    const optionsDiv = document.getElementById("options");
    const checkboxes = optionsDiv.getElementsByTagName("input");

    console.log("🔍 找到复选框数量:", checkboxes.length);

    for (let i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) {
        const label = optionsDiv.getElementsByTagName("label")[i];
        if (label) {
          selectedOptions.push(label.textContent);
          console.log("✅ 选中选项:", label.textContent);
        }
      }
    }

    // 构建最终反馈
    const finalFeedbackParts = [];
    if (selectedOptions.length > 0) {
      finalFeedbackParts.push("选中的选项: " + selectedOptions.join("; "));
    }
    if (feedbackText) {
      finalFeedbackParts.push("文本反馈: " + feedbackText);
    }

    // 如果没有任何反馈，提示用户
    if (finalFeedbackParts.length === 0) {
      alert("请至少选择一个选项或输入文本反馈！");
      return;
    }

    const finalFeedback = finalFeedbackParts.join("\n\n");
    console.log("📋 最终反馈:", finalFeedback);

    const result = {
      interactive_feedback: finalFeedback,
      timestamp: new Date().toISOString(),
      selected_options: selectedOptions,
      text_feedback: feedbackText,
    };

    console.log("💾 准备保存结果:", result);
    console.log("📁 输出文件路径:", outputFile);

    // 保存结果到文件
    if (outputFile) {
      try {
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf8");
        console.log("✅ 结果已保存到文件");

        // 验证文件是否真的被写入
        if (fs.existsSync(outputFile)) {
          const savedContent = fs.readFileSync(outputFile, "utf8");
          console.log("🔍 验证保存的内容:", savedContent);
        } else {
          console.error("❌ 文件保存后不存在");
        }
      } catch (writeError) {
        console.error("❌ 写入文件失败:", writeError);
        alert("保存反馈失败: " + writeError.message);
        return;
      }
    } else {
      console.error("❌ 没有输出文件路径");
      alert("错误: 没有指定输出文件路径");
      return;
    }

    // 显示成功消息
    alert("反馈已提交成功！窗口即将关闭。");

    // 延迟关闭窗口，确保用户看到成功消息
    setTimeout(() => {
      try {
        console.log("🔚 准备关闭窗口");
        remote.getCurrentWindow().close();
      } catch (closeError) {
        console.error("❌ 关闭窗口失败:", closeError);
        // 如果remote方式失败，尝试其他方式
        window.close();
      }
    }, 1000);
  } catch (error) {
    console.error("❌ submitFeedback 函数执行失败:", error);
    alert("提交反馈时发生错误: " + error.message);
  }
}

// 确保 submitFeedback 函数在全局作用域中可用
window.submitFeedback = submitFeedback;
console.log("🌐 submitFeedback 函数已添加到全局作用域");
