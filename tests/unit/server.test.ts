/**
 * MCP 服务器单元测试
 * 测试服务器初始化、工具注册和基础功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestMCPClient, validateMCPMessage } from '../helpers/mcp-test-client';
import { createTestCleanup, TEST_CONFIG } from '../helpers/test-utils';
import * as path from 'path';

describe('MCP Server', () => {
  let cleanup: ReturnType<typeof createTestCleanup>;

  beforeEach(() => {
    cleanup = createTestCleanup();
    // 设置测试环境
    process.env.PROJECT_ROOT = TEST_CONFIG.PROJECT_ROOT;
    process.env.NODE_ENV = 'test';
    process.env.DEBUG = 'false';
  });

  afterEach(async () => {
    await cleanup.cleanup();
    vi.clearAllMocks();
  });

  describe('服务器初始化', () => {
    it('应该能够创建MCP服务器实例', async () => {
      const client = createTestMCPClient();

      const response = await client.initialize();

      expect(response).toBeDefined();
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      expect(response.result.serverInfo.name).toBe('interactive-feedback-mcp-node');
      expect(response.result.serverInfo.version).toBe('0.1.0');
    });

    it('应该支持正确的协议版本', async () => {
      const client = createTestMCPClient();

      const response = await client.initialize();

      expect(response.result.protocolVersion).toBe('2024-11-05');
    });

    it('应该返回正确的服务器能力', async () => {
      const client = createTestMCPClient();

      const response = await client.initialize();

      expect(response.result.capabilities).toBeDefined();
      expect(response.result.capabilities).toHaveProperty('tools');
    });
  });

  describe('工具注册和列表', () => {
    it('应该注册interactive_feedback工具', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      const response = await client.listTools();

      expect(response.result.tools).toBeDefined();
      expect(response.result.tools).toHaveLength(1);

      const tool = response.result.tools[0];
      expect(tool.name).toBe('interactive_feedback');
      expect(tool.description).toContain('interactive feedback');
    });

    it('应该提供正确的工具输入模式', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      const response = await client.listTools();
      const tool = response.result.tools[0];

      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('message');
      expect(tool.inputSchema.properties).toHaveProperty('predefined_options');
      expect(tool.inputSchema.required).toContain('message');
    });

    it('应该在未初始化时拒绝列出工具', async () => {
      const client = createTestMCPClient();

      await expect(client.listTools()).rejects.toThrow('Client not initialized');
    });
  });

  describe('消息格式验证', () => {
    it('应该验证有效的MCP消息', () => {
      const validMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      };

      expect(validateMCPMessage(validMessage)).toBe(true);
    });

    it('应该拒绝无效的MCP消息', () => {
      const invalidMessages = [
        null,
        undefined,
        {},
        { jsonrpc: '1.0' },
        { jsonrpc: '2.0', method: 123 },
        { jsonrpc: '2.0', id: 1 } // 既没有method也没有result/error
      ];

      invalidMessages.forEach(msg => {
        expect(validateMCPMessage(msg)).toBe(false);
      });
    });

    it('应该验证响应消息格式', () => {
      const validResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: { success: true }
      };

      const validError = {
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32601, message: 'Method not found' }
      };

      expect(validateMCPMessage(validResponse)).toBe(true);
      expect(validateMCPMessage(validError)).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理未知工具调用', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      const response = await client.callTool('unknown_tool', {});

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32601);
      expect(response.error!.message).toContain('not found');
    });

    it('应该在未初始化时拒绝工具调用', async () => {
      const client = createTestMCPClient();

      await expect(client.callTool('interactive_feedback', {}))
        .rejects.toThrow('Client not initialized');
    });
  });

  describe('客户端状态管理', () => {
    it('应该正确跟踪初始化状态', async () => {
      const client = createTestMCPClient();

      expect(client.isReady()).toBe(false);

      await client.initialize();

      expect(client.isReady()).toBe(true);
    });

    it('应该能够重置客户端状态', async () => {
      const client = createTestMCPClient();
      await client.initialize();
      await client.listTools();

      expect(client.isReady()).toBe(true);
      expect(client.getConnectedTools()).toHaveLength(1);

      client.reset();

      expect(client.isReady()).toBe(false);
      expect(client.getConnectedTools()).toHaveLength(0);
    });

    it('应该生成唯一的消息ID', () => {
      const client = createTestMCPClient();

      const msg1 = client.createMessage('test1');
      const msg2 = client.createMessage('test2');

      expect(msg1.id).not.toBe(msg2.id);
      expect(typeof msg1.id).toBe('number');
      expect(typeof msg2.id).toBe('number');
    });
  });
});
