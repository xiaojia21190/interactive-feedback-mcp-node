// src/feedback_ui.js
const path = require("path");
const { app } = require("electron");

// Set user data path when app is ready
app.whenReady().then(() => {
  app.setPath("userData", path.join(app.getPath("userData"), "InteractiveFeedbackMCP"));
});

require("./index.js");
