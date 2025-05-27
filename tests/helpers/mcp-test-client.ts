/**
 * MCP 测试客户端辅助工具
 * 用于模拟 MCP 协议通信和测试 MCP 服务器功能
 */

import { EventEmitter } from 'events';
import { vi } from 'vitest';

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPCapabilities {
  logging?: any;
  prompts?: any;
  resources?: any;
  tools?: any;
}

/**
 * 模拟 MCP 客户端用于测试
 */
export class MCPTestClient extends EventEmitter {
  private messageId = 1;
  private connectedTools: MCPTool[] = [];
  private serverCapabilities: MCPCapabilities = {};
  private isInitialized = false;

  constructor() {
    super();
  }

  /**
   * 生成下一个消息 ID
   */
  private getNextId(): number {
    return this.messageId++;
  }

  /**
   * 创建 MCP 消息
   */
  createMessage(method: string, params?: any): MCPMessage {
    return {
      jsonrpc: '2.0',
      id: this.getNextId(),
      method,
      params
    };
  }

  /**
   * 创建 MCP 响应
   */
  createResponse(id: number | string, result?: any, error?: any): MCPMessage {
    const response: MCPMessage = {
      jsonrpc: '2.0',
      id
    };

    if (error) {
      response.error = error;
    } else {
      response.result = result;
    }

    return response;
  }

  /**
   * 模拟初始化 MCP 连接
   */
  async initialize(): Promise<MCPMessage> {
    const initMessage = this.createMessage('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        logging: {},
        prompts: {},
        resources: {},
        tools: {}
      },
      clientInfo: {
        name: 'vitest-mcp-client',
        version: '1.0.0'
      }
    });

    // 模拟服务器响应
    const response = this.createResponse(initMessage.id!, {
      protocolVersion: '2024-11-05',
      capabilities: {
        logging: {},
        prompts: {},
        resources: {},
        tools: {}
      },
      serverInfo: {
        name: 'interactive-feedback-mcp-node',
        version: '0.1.0'
      }
    });

    this.isInitialized = true;
    this.emit('initialized', response);
    return response;
  }

  /**
   * 模拟列出可用工具
   */
  async listTools(): Promise<MCPMessage> {
    if (!this.isInitialized) {
      throw new Error('Client not initialized');
    }

    const message = this.createMessage('tools/list');

    // 模拟 interactive_feedback 工具
    const tools: MCPTool[] = [
      {
        name: 'interactive_feedback',
        description: 'Request interactive feedback from the user',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The specific question for the user'
            },
            predefined_options: {
              type: 'array',
              description: 'Predefined options for the user to choose from (optional)',
              items: { type: 'string' }
            }
          },
          required: ['message']
        }
      }
    ];

    this.connectedTools = tools;
    const response = this.createResponse(message.id!, { tools });
    this.emit('tools_listed', response);
    return response;
  }

  /**
   * 模拟调用工具
   */
  async callTool(name: string, arguments_: any): Promise<MCPMessage> {
    if (!this.isInitialized) {
      throw new Error('Client not initialized');
    }

    const message = this.createMessage('tools/call', {
      name,
      arguments: arguments_
    });

    let result: any;

    if (name === 'interactive_feedback') {
      // 模拟 interactive_feedback 工具的响应
      result = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              interactive_feedback: arguments_.predefined_options
                ? arguments_.predefined_options[0]
                : '测试反馈内容'
            })
          }
        ]
      };
    } else {
      // 未知工具
      const response = this.createResponse(message.id!, null, {
        code: -32601,
        message: `Tool '${name}' not found`
      });
      this.emit('tool_error', response);
      return response;
    }

    const response = this.createResponse(message.id!, result);
    this.emit('tool_called', response);
    return response;
  }

  /**
   * 获取连接的工具列表
   */
  getConnectedTools(): MCPTool[] {
    return [...this.connectedTools];
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 重置客户端状态
   */
  reset(): void {
    this.messageId = 1;
    this.connectedTools = [];
    this.serverCapabilities = {};
    this.isInitialized = false;
    this.removeAllListeners();
  }
}

/**
 * 创建测试用的 MCP 客户端实例
 */
export function createTestMCPClient(): MCPTestClient {
  return new MCPTestClient();
}

/**
 * 验证 MCP 消息格式
 */
export function validateMCPMessage(message: any): boolean {
  if (!message || typeof message !== 'object') {
    return false;
  }

  // 检查必需字段
  if (message.jsonrpc !== '2.0') {
    return false;
  }

  // 请求消息必须有 method
  if (message.method && typeof message.method !== 'string') {
    return false;
  }

  // 响应消息必须有 result 或 error
  if (!message.method && !('result' in message) && !('error' in message)) {
    return false;
  }

  return true;
}

/**
 * 创建模拟的 Electron 反馈结果
 */
export function createMockFeedbackResult(feedback: string, predefinedOption?: string) {
  return {
    feedback,
    timestamp: new Date().toISOString(),
    predefined_option: predefinedOption || null
  };
}
