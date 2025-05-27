import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // 测试环境配置
    environment: 'happy-dom',
    globals: true,

    // 测试文件匹配模式
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'public',
      '.git'
    ],

    // 超时配置
    testTimeout: 30000,
    hookTimeout: 30000,

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'dist/**/*'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },

    // 环境变量
    env: {
      NODE_ENV: 'test',
      PROJECT_ROOT: path.resolve(__dirname),
      DEBUG: 'false'
    },

    // 设置文件
    setupFiles: ['tests/setup.ts'],

    // 并发配置
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    }
  },

  // 路径解析
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests')
    }
  },

  // 编译配置
  esbuild: {
    target: 'es2020'
  }
});
