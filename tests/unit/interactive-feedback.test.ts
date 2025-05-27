/**
 * Interactive Feedback 功能单元测试
 * 测试 Electron 路径检测、UI 进程启动和反馈收集
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestMCPClient, createMockFeedbackResult } from '../helpers/mcp-test-client';
import {
  createTestCleanup,
  TEST_CONFIG,
  createTempJsonFile,
  mockElectronEnvironment,
  createMockSpawnProcess
} from '../helpers/test-utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Interactive Feedback 功能', () => {
  let cleanup: ReturnType<typeof createTestCleanup>;
  let electronEnv: ReturnType<typeof mockElectronEnvironment>;

  beforeEach(() => {
    cleanup = createTestCleanup();
    electronEnv = mockElectronEnvironment();

    // 设置测试环境
    process.env.PROJECT_ROOT = TEST_CONFIG.PROJECT_ROOT;
    process.env.NODE_ENV = 'test';
    process.env.DEBUG = 'false';
  });

  afterEach(async () => {
    await cleanup.cleanup();
    electronEnv.reset();
    vi.clearAllMocks();
  });

  describe('工具调用基础功能', () => {
    it('应该能够调用interactive_feedback工具', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      const response = await client.callTool('interactive_feedback', {
        message: '测试消息'
      });

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(response.result.content[0].type).toBe('text');

      const result = JSON.parse(response.result.content[0].text);
      expect(result.interactive_feedback).toBe('测试反馈内容');
    });

    it('应该支持预定义选项', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      const predefinedOptions = ['选项1', '选项2', '选项3'];
      const response = await client.callTool('interactive_feedback', {
        message: '请选择一个选项',
        predefined_options: predefinedOptions
      });

      expect(response.result).toBeDefined();
      const result = JSON.parse(response.result.content[0].text);
      expect(result.interactive_feedback).toBe(predefinedOptions[0]);
    });

    it('应该要求必需的message参数', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      // 测试工具模式定义
      const toolsResponse = await client.listTools();
      const tool = toolsResponse.result.tools[0];

      expect(tool.inputSchema.required).toContain('message');
      expect(tool.inputSchema.properties.message.type).toBe('string');
    });
  });

  describe('反馈结果格式', () => {
    it('应该创建正确格式的反馈结果', () => {
      const feedback = '用户反馈内容';
      const result = createMockFeedbackResult(feedback);

      expect(result).toHaveProperty('feedback', feedback);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('predefined_option', null);
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    it('应该支持预定义选项的反馈结果', () => {
      const feedback = '用户反馈内容';
      const predefinedOption = '选项1';
      const result = createMockFeedbackResult(feedback, predefinedOption);

      expect(result).toHaveProperty('feedback', feedback);
      expect(result).toHaveProperty('predefined_option', predefinedOption);
    });

    it('应该包含有效的时间戳', () => {
      const result = createMockFeedbackResult('测试');
      const timestamp = new Date(result.timestamp);
      const now = new Date();

      // 时间戳应该在合理范围内（1秒内）
      expect(Math.abs(now.getTime() - timestamp.getTime())).toBeLessThan(1000);
    });
  });

  describe('文件系统操作模拟', () => {
    it('应该模拟临时文件的创建和读取', () => {
      const testData = { test: 'data', timestamp: new Date().toISOString() };
      const tempFile = globalThis.createMockTempFile(testData);

      expect(tempFile).toContain('test-');
      expect(tempFile).toContain('.json');

      // 验证模拟的文件读取
      const mockReadFile = vi.mocked(fs.readFileSync);
      const content = mockReadFile(tempFile, 'utf-8') as string;
      expect(JSON.parse(content)).toEqual(testData);
    });

    it('应该模拟文件存在性检查', () => {
      const mockExistsSync = vi.mocked(fs.existsSync);

      // 默认情况下文件应该存在
      expect(mockExistsSync('/some/path')).toBe(true);

      // 可以自定义返回值
      mockExistsSync.mockReturnValueOnce(false);
      expect(mockExistsSync('/another/path')).toBe(false);
    });
  });

  describe('环境变量和配置', () => {
    it('应该正确设置测试环境变量', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.PROJECT_ROOT).toBe(TEST_CONFIG.PROJECT_ROOT);
      expect(process.env.DEBUG).toBe('false');
    });

    it('应该模拟Electron环境变量', () => {
      expect(process.env.ELECTRON_IS_DEV).toBe('true');
      expect(process.env.ELECTRON_DISABLE_SECURITY_WARNINGS).toBe('true');
    });

    it('应该提供正确的项目根路径', () => {
      const projectRoot = process.env.PROJECT_ROOT;
      expect(projectRoot).toBeDefined();
      expect(path.isAbsolute(projectRoot!)).toBe(true);
    });
  });

  describe('错误场景处理', () => {
    it('应该处理空消息参数', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      const response = await client.callTool('interactive_feedback', {
        message: ''
      });

      // 即使消息为空，也应该返回有效响应
      expect(response.result).toBeDefined();
    });

    it('应该处理无效的预定义选项', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      const response = await client.callTool('interactive_feedback', {
        message: '测试消息',
        predefined_options: []
      });

      expect(response.result).toBeDefined();
      const result = JSON.parse(response.result.content[0].text);
      expect(result.interactive_feedback).toBe('测试反馈内容');
    });

    it('应该处理非字符串类型的消息', async () => {
      const client = createTestMCPClient();
      await client.initialize();

      // 测试数字类型的消息
      const response = await client.callTool('interactive_feedback', {
        message: 123
      });

      expect(response.result).toBeDefined();
    });
  });

  describe('进程模拟', () => {
    it('应该模拟子进程的创建', () => {
      const mockProcess = createMockSpawnProcess(0);

      expect(mockProcess).toHaveProperty('stdout');
      expect(mockProcess).toHaveProperty('stderr');
      expect(mockProcess).toHaveProperty('on');
      expect(mockProcess).toHaveProperty('kill');
      expect(mockProcess.pid).toBeGreaterThan(0);
    });

    it('应该模拟进程退出事件', (done) => {
      const mockProcess = createMockSpawnProcess(0);

      mockProcess.on('exit', (code, signal) => {
        expect(code).toBe(0);
        expect(signal).toBeNull();
        done();
      });
    });

    it('应该支持自定义退出代码', (done) => {
      const mockProcess = createMockSpawnProcess(1, 'SIGTERM');

      mockProcess.on('exit', (code, signal) => {
        expect(code).toBe(1);
        expect(signal).toBe('SIGTERM');
        done();
      });
    });
  });
});
