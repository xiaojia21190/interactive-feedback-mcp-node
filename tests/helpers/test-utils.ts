/**
 * 通用测试工具函数
 * 提供文件操作、环境设置、断言等测试辅助功能
 */

import { vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * 测试环境配置
 */
export const TEST_CONFIG = {
  PROJECT_ROOT: process.env.PROJECT_ROOT || path.resolve(__dirname, '../..'),
  TEMP_DIR: path.join(os.tmpdir(), 'mcp-tests'),
  TIMEOUT: {
    SHORT: 5000,
    MEDIUM: 15000,
    LONG: 30000
  }
} as const;

/**
 * 创建临时测试目录
 */
export function createTempTestDir(subDir?: string): string {
  const tempPath = subDir
    ? path.join(TEST_CONFIG.TEMP_DIR, subDir)
    : TEST_CONFIG.TEMP_DIR;

  if (!fs.existsSync(tempPath)) {
    fs.mkdirSync(tempPath, { recursive: true });
  }

  return tempPath;
}

/**
 * 清理临时测试文件
 */
export function cleanupTempFiles(tempPath?: string): void {
  const targetPath = tempPath || TEST_CONFIG.TEMP_DIR;

  try {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
  } catch (error) {
    // 忽略清理错误
    console.warn(`Failed to cleanup temp files: ${error}`);
  }
}

/**
 * 创建临时 JSON 文件
 */
export function createTempJsonFile(data: any, filename?: string): string {
  const tempDir = createTempTestDir();
  const fileName = filename || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`;
  const filePath = path.join(tempDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

/**
 * 读取临时 JSON 文件
 */
export function readTempJsonFile(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Temp file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 等待条件满足或超时
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = TEST_CONFIG.TIMEOUT.MEDIUM,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * 模拟 Electron 进程环境
 */
export function mockElectronEnvironment() {
  // 模拟 Electron 主进程环境变量
  process.env.ELECTRON_IS_DEV = 'true';
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

  // 模拟 Electron 路径
  const mockElectronPath = process.platform === 'win32'
    ? path.join(TEST_CONFIG.PROJECT_ROOT, 'node_modules', 'electron', 'dist', 'electron.exe')
    : path.join(TEST_CONFIG.PROJECT_ROOT, 'node_modules', 'electron', 'dist', 'electron');

  return {
    electronPath: mockElectronPath,
    reset: () => {
      delete process.env.ELECTRON_IS_DEV;
      delete process.env.ELECTRON_DISABLE_SECURITY_WARNINGS;
    }
  };
}

/**
 * 创建模拟的 spawn 进程
 */
export function createMockSpawnProcess(exitCode: number = 0, signal: string | null = null) {
  const mockProcess = {
    stdout: {
      on: vi.fn(),
      pipe: vi.fn()
    },
    stderr: {
      on: vi.fn(),
      pipe: vi.fn()
    },
    stdin: {
      write: vi.fn(),
      end: vi.fn()
    },
    on: vi.fn((event: string, callback: Function) => {
      if (event === 'exit') {
        // 模拟异步退出
        setTimeout(() => callback(exitCode, signal), 50);
      } else if (event === 'error') {
        // 不触发错误，除非明确指定
      }
    }),
    kill: vi.fn(),
    pid: Math.floor(Math.random() * 10000)
  };

  return mockProcess;
}

/**
 * 验证文件路径存在性
 */
export function assertPathExists(filePath: string, shouldExist: boolean = true): void {
  const exists = fs.existsSync(filePath);
  if (shouldExist && !exists) {
    throw new Error(`Expected path to exist: ${filePath}`);
  } else if (!shouldExist && exists) {
    throw new Error(`Expected path to not exist: ${filePath}`);
  }
}

/**
 * 验证 JSON 文件内容
 */
export function assertJsonFileContent(filePath: string, expectedContent: any): void {
  assertPathExists(filePath);
  const actualContent = readTempJsonFile(filePath);

  if (JSON.stringify(actualContent) !== JSON.stringify(expectedContent)) {
    throw new Error(`JSON file content mismatch.\nExpected: ${JSON.stringify(expectedContent, null, 2)}\nActual: ${JSON.stringify(actualContent, null, 2)}`);
  }
}

/**
 * 创建测试用的环境变量快照
 */
export function createEnvSnapshot(): Record<string, string | undefined> {
  return { ...process.env };
}

/**
 * 恢复环境变量
 */
export function restoreEnv(snapshot: Record<string, string | undefined>): void {
  // 清除当前环境变量
  Object.keys(process.env).forEach(key => {
    if (!(key in snapshot)) {
      delete process.env[key];
    }
  });

  // 恢复快照中的环境变量
  Object.entries(snapshot).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
}

/**
 * 生成唯一的测试标识符
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 验证对象包含预期属性
 */
export function assertObjectContains(actual: any, expected: Partial<any>): void {
  Object.entries(expected).forEach(([key, expectedValue]) => {
    if (!(key in actual)) {
      throw new Error(`Expected object to contain property: ${key}`);
    }

    if (actual[key] !== expectedValue) {
      throw new Error(`Property ${key} mismatch. Expected: ${expectedValue}, Actual: ${actual[key]}`);
    }
  });
}

/**
 * 测试清理辅助函数
 */
export class TestCleanup {
  private cleanupTasks: (() => void | Promise<void>)[] = [];

  /**
   * 添加清理任务
   */
  add(task: () => void | Promise<void>): void {
    this.cleanupTasks.push(task);
  }

  /**
   * 执行所有清理任务
   */
  async cleanup(): Promise<void> {
    for (const task of this.cleanupTasks.reverse()) {
      try {
        await task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    }
    this.cleanupTasks = [];
  }
}

/**
 * 创建测试清理实例
 */
export function createTestCleanup(): TestCleanup {
  return new TestCleanup();
}
