/**
 * MCP 服务器集成测试
 * 测试完整的 MCP 协议通信流程和服务器运行状态
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestMCPClient, validateMCPMessage } from '../helpers/mcp-test-client';
import {
  createTestCleanup,
  TEST_CONFIG,
  waitFor,
  mockElectronEnvironment,
  createEnvSnapshot,
  restoreEnv
} from '../helpers/test-utils';
import * as path from 'path';

describe('MCP 服务器集成测试', () => {
  let cleanup: ReturnType<typeof createTestCleanup>;
  let electronEnv: ReturnType<typeof mockElectronEnvironment>;
  let envSnapshot: ReturnType<typeof createEnvSnapshot>;

  beforeEach(() => {
    cleanup = createTestCleanup();
    electronEnv = mockElectronEnvironment();
    envSnapshot = createEnvSnapshot();

    // 设置集成测试环境
    process.env.PROJECT_ROOT = TEST_CONFIG.PROJECT_ROOT;
    process.env.NODE_ENV = 'test';
    process.env.DEBUG = 'false';
  });

  afterEach(async () => {
    await cleanup.cleanup();
    electronEnv.reset();
    restoreEnv(envSnapshot);
    vi.clearAllMocks();
  });

  describe('完整的MCP协议流程', () => {
    it('应该完成完整的初始化->列出工具->调用工具流程', async () => {
      const client = createTestMCPClient();

      // 步骤1: 初始化连接
      const initResponse = await client.initialize();
      expect(validateMCPMessage(initResponse)).toBe(true);
      expect(initResponse.result.serverInfo.name).toBe('interactive-feedback-mcp-node');

      // 步骤2: 列出可用工具
      const toolsResponse = await client.listTools();
      expect(validateMCPMessage(toolsResponse)).toBe(true);
      expect(toolsResponse.result.tools).toHaveLength(1);
      expect(toolsResponse.result.tools[0].name).toBe('interactive_feedback');

      // 步骤3: 调用工具
      const callResponse = await client.callTool('interactive_feedback', {
        message: '集成测试消息'
      });
      expect(validateMCPMessage(callResponse)).toBe(true);
      expect(callResponse.result.content).toBeDefined();

      const result = JSON.parse(callResponse.result.content[0].text);
      expect(result.interactive_feedback).toBeDefined();
    });

    it('应该处理多个并发工具调用', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      const promises = Array.from({ length: 3 }, (_, i) =>
        client.callTool('interactive_feedback', {
          message: `并发测试消息 ${i + 1}`
        })
      );

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(validateMCPMessage(response)).toBe(true);
        expect(response.result).toBeDefined();

        const result = JSON.parse(response.result.content[0].text);
        expect(result.interactive_feedback).toBeDefined();
      });
    });

    it('应该维护会话状态', async () => {
      const client = createTestMCPClient();

      // 初始化
      await client.initialize();
      expect(client.isReady()).toBe(true);

      // 多次调用应该保持状态
      await client.listTools();
      expect(client.isReady()).toBe(true);

      await client.callTool('interactive_feedback', { message: '测试' });
      expect(client.isReady()).toBe(true);

      // 工具列表应该保持一致
      expect(client.getConnectedTools()).toHaveLength(1);
    });
  });

  describe('错误恢复和健壮性', () => {
    it('应该处理工具调用失败后的恢复', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      // 调用不存在的工具
      const errorResponse = await client.callTool('nonexistent_tool', {});
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error!.code).toBe(-32601);

      // 之后应该能正常调用有效工具
      const successResponse = await client.callTool('interactive_feedback', {
        message: '恢复测试'
      });
      expect(successResponse.result).toBeDefined();
    });

    it('应该处理无效参数的工具调用', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      // 缺少必需参数
      const response = await client.callTool('interactive_feedback', {});

      // 应该仍然返回响应（模拟环境下）
      expect(response.result).toBeDefined();
    });

    it('应该在重置后能够重新初始化', async () => {
      const client = createTestMCPClient();

      // 初始化并使用
      await client.initialize();
      await client.listTools();
      expect(client.isReady()).toBe(true);

      // 重置
      client.reset();
      expect(client.isReady()).toBe(false);
      expect(client.getConnectedTools()).toHaveLength(0);

      // 重新初始化
      await client.initialize();
      expect(client.isReady()).toBe(true);

      const toolsResponse = await client.listTools();
      expect(toolsResponse.result.tools).toHaveLength(1);
    });
  });

  describe('性能和超时测试', () => {
    it('应该在合理时间内响应初始化请求', async () => {
      const client = createTestMCPClient();

      const startTime = Date.now();
      await client.initialize();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(TEST_CONFIG.TIMEOUT.SHORT);
    });

    it('应该在合理时间内响应工具调用', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      const startTime = Date.now();
      await client.callTool('interactive_feedback', { message: '性能测试' });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(TEST_CONFIG.TIMEOUT.SHORT);
    });

    it('应该支持长时间运行的会话', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      // 模拟长时间运行的会话
      for (let i = 0; i < 10; i++) {
        const response = await client.callTool('interactive_feedback', {
          message: `长时间会话测试 ${i + 1}`
        });
        expect(response.result).toBeDefined();

        // 短暂延迟模拟真实使用
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      expect(client.isReady()).toBe(true);
    });
  });

  describe('环境兼容性测试', () => {
    it('应该在不同的PROJECT_ROOT路径下工作', async () => {
      const originalRoot = process.env.PROJECT_ROOT;
      const testRoot = path.resolve(__dirname, '../..');

      process.env.PROJECT_ROOT = testRoot;

      try {
        const client = createTestMCPClient();
        const response = await client.initialize();

        expect(response.result.serverInfo.name).toBe('interactive-feedback-mcp-node');
      } finally {
        process.env.PROJECT_ROOT = originalRoot;
      }
    });

    it('应该在调试模式下正常工作', async () => {
      process.env.DEBUG = 'true';

      try {
        const client = createTestMCPClient();
        await client.initialize();

        const response = await client.callTool('interactive_feedback', {
          message: '调试模式测试'
        });

        expect(response.result).toBeDefined();
      } finally {
        process.env.DEBUG = 'false';
      }
    });

    it('应该处理缺失的环境变量', async () => {
      const originalRoot = process.env.PROJECT_ROOT;
      delete process.env.PROJECT_ROOT;

      try {
        const client = createTestMCPClient();
        const response = await client.initialize();

        // 应该使用默认值或处理缺失的环境变量
        expect(response.result).toBeDefined();
      } finally {
        if (originalRoot) {
          process.env.PROJECT_ROOT = originalRoot;
        }
      }
    });
  });

  describe('事件和监听器测试', () => {
    it('应该触发初始化事件', async () => {
      const client = createTestMCPClient();
      let eventTriggered = false;

      client.on('initialized', (response) => {
        eventTriggered = true;
        expect(response.result.serverInfo.name).toBe('interactive-feedback-mcp-node');
      });

      await client.initialize();

      await waitFor(() => eventTriggered, 1000);
      expect(eventTriggered).toBe(true);
    });

    it('应该触发工具列表事件', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      let eventTriggered = false;

      client.on('tools_listed', (response) => {
        eventTriggered = true;
        expect(response.result.tools).toHaveLength(1);
      });

      await client.listTools();

      await waitFor(() => eventTriggered, 1000);
      expect(eventTriggered).toBe(true);
    });

    it('应该触发工具调用事件', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      let eventTriggered = false;

      client.on('tool_called', (response) => {
        eventTriggered = true;
        expect(response.result.content).toBeDefined();
      });

      await client.callTool('interactive_feedback', { message: '事件测试' });

      await waitFor(() => eventTriggered, 1000);
      expect(eventTriggered).toBe(true);
    });
  });
});
