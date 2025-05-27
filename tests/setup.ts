/**
 * Vitest 测试环境设置文件
 * 配置全局测试环境、模拟器和测试工具
 */

import { vi, afterEach, beforeAll, afterAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.PROJECT_ROOT = path.resolve(__dirname, '..');
process.env.DEBUG = 'false';

// 模拟 Electron 模块
vi.mock('electron', () => ({
  app: {
    getName: () => 'interactive-feedback-mcp-test',
    getVersion: () => '0.1.0-test',
    quit: vi.fn(),
    on: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(undefined)
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadFile: vi.fn(),
    loadURL: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
      executeJavaScript: vi.fn()
    },
    on: vi.fn(),
    once: vi.fn()
  })),
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn(),
    removeAllListeners: vi.fn()
  },
  ipcRenderer: {
    send: vi.fn(),
    on: vi.fn(),
    invoke: vi.fn()
  }
}));

// 模拟子进程模块
vi.mock('child_process', () => ({
  spawn: vi.fn().mockImplementation(() => ({
    stdout: {
      on: vi.fn()
    },
    stderr: {
      on: vi.fn()
    },
    on: vi.fn((event, callback) => {
      if (event === 'exit') {
        // 模拟成功退出
        setTimeout(() => callback(0, null), 100);
      }
    }),
    kill: vi.fn()
  }))
}));

// 模拟文件系统操作
const mockFs = {
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockImplementation((filePath: string) => {
    if (filePath.includes('feedback-') && filePath.includes('.json')) {
      return JSON.stringify({
        feedback: '测试反馈内容',
        timestamp: new Date().toISOString(),
        predefined_option: null
      });
    }
    return '{}';
  }),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  mkdirSync: vi.fn(),
  rmSync: vi.fn()
};

// 部分模拟 fs 模块，保留某些真实功能用于测试文件操作
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    ...mockFs
  };
});

// 全局测试工具函数类型声明
declare global {
  var createMockTempFile: (content?: any) => string;
  var createMockMCPMessage: (method: string, params?: any) => any;
  var createMockMCPResponse: (id: number, result?: any) => any;
}

// 全局测试工具函数实现
globalThis.createMockTempFile = (content: any = {}) => {
  const mockPath = path.join(process.env.PROJECT_ROOT!, 'temp', `test-${Date.now()}.json`);
  mockFs.readFileSync.mockImplementation((filePath: string) => {
    if (filePath === mockPath) {
      return JSON.stringify(content);
    }
    return JSON.stringify({});
  });
  return mockPath;
};

globalThis.createMockMCPMessage = (method: string, params: any = {}) => {
  return {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 1000),
    method,
    params
  };
};

globalThis.createMockMCPResponse = (id: number, result: any = {}) => {
  return {
    jsonrpc: '2.0',
    id,
    result
  };
};

// 测试超时配置
vi.setConfig({
  testTimeout: 30000,
  hookTimeout: 10000
});

// 清理函数
afterEach(() => {
  vi.clearAllMocks();
});

beforeAll(() => {
  // 确保测试目录存在
  const testDirs = ['temp', 'logs'];
  testDirs.forEach(dir => {
    const dirPath = path.join(process.env.PROJECT_ROOT!, dir);
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
      } catch (error) {
        // 忽略创建目录的错误，使用模拟
      }
    }
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});

export { };
