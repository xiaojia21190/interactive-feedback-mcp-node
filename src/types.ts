/**
 * 类型定义文件
 * 为 interactive-feedback-mcp-node 项目提供 TypeScript 类型支持
 */

// 反馈结果接口
export interface FeedbackResult {
  /** 用户提供的文字反馈 */
  interactive_feedback?: string;
  /** 用户提供的文字反馈（备用字段） */
  text_feedback?: string;
  /** 用户选择的预定义选项 */
  selected_options?: string[];
  /** 反馈提交时间戳 */
  timestamp?: string;
  /** UI类型标识 */
  ui_type?: string;
  /** 是否通过Cursor优化界面提交 */
  cursor_optimized?: boolean;
}

// 工具调用参数接口
export interface InteractiveFeedbackParams {
  /** 向用户显示的问题或消息 */
  message: string;
  /** 预定义选项列表（可选） */
  predefined_options?: string[];
}

// Electron 子进程配置接口
export interface ElectronProcessConfig {
  /** 项目根目录路径 */
  projectRoot: string;
  /** 临时文件路径 */
  tempFile: string;
  /** Electron UI 脚本路径 */
  electronUiPath: string;
  /** HTML 文件路径 */
  htmlPath: string;
  /** Electron 可执行文件路径 */
  execPath: string;
}

// 服务器配置接口
export interface ServerConfig {
  /** 服务器名称 */
  name: string;
  /** 服务器版本 */
  version: string;
  /** 调试模式 */
  debug?: boolean;
  /** 项目根目录 */
  projectRoot?: string;
}

// MCP 工具响应内容接口
export interface ToolResponseContent {
  /** 内容类型 */
  type: "text";
  /** 文本内容 */
  text: string;
}

// MCP 工具响应接口
export interface ToolResponse {
  /** 响应内容数组 */
  content: ToolResponseContent[];
  /** 是否为错误响应 */
  isError?: boolean;
  /** 响应元数据 */
  metadata?: {
    /** 响应来源 */
    source: string;
    /** UI 类型 */
    ui_type?: string;
    /** 是否包含用户输入 */
    has_user_input?: boolean;
    /** 时间戳 */
    timestamp?: string;
    /** 错误信息（如果是错误响应） */
    error?: string;
  };
}

// 环境变量类型扩展
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** 项目根目录 */
      PROJECT_ROOT?: string;
      /** 调试模式 */
      DEBUG?: string;
      /** Node 环境 */
      NODE_ENV?: string;
      /** 语言设置 */
      LANG?: string;
      /** 本地化设置 */
      LC_ALL?: string;
      /** Node 路径 */
      NODE_PATH?: string;
    }
  }
}
