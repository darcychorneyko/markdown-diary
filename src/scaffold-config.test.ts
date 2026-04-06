import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readJsonFile<T>(relativePath: string): T {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  return JSON.parse(readFileSync(fullPath, 'utf8')) as T;
}

describe('scaffold configuration', () => {
  it('defines the required npm scripts and packages', () => {
    const packageJson = readJsonFile<{
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    }>('package.json');

    expect(packageJson.scripts).toMatchObject({
      dev: expect.any(String),
      build: expect.any(String),
      preview: expect.any(String),
      test: expect.any(String),
      'test:watch': expect.any(String),
      'test:e2e': expect.any(String)
    });

    expect(packageJson.dependencies).toMatchObject({
      electron: expect.any(String),
      react: expect.any(String),
      'react-dom': expect.any(String),
      '@codemirror/lang-markdown': expect.any(String),
      '@codemirror/state': expect.any(String),
      '@codemirror/view': expect.any(String),
      '@uiw/react-codemirror': expect.any(String),
      'react-markdown': expect.any(String),
      'remark-gfm': expect.any(String),
      chokidar: expect.any(String)
    });

    expect(packageJson.devDependencies).toMatchObject({
      typescript: expect.any(String),
      vite: expect.any(String),
      vitest: expect.any(String),
      '@vitejs/plugin-react': expect.any(String),
      '@playwright/test': expect.any(String),
      '@testing-library/jest-dom': expect.any(String),
      '@testing-library/react': expect.any(String),
      '@testing-library/user-event': expect.any(String),
      jsdom: expect.any(String),
      concurrently: expect.any(String),
      'wait-on': expect.any(String),
      '@types/node': expect.any(String),
      '@types/react': expect.any(String),
      '@types/react-dom': expect.any(String)
    });
  });

  it('keeps TypeScript strict and Vite pinned to the required dev server settings', () => {
    const tsconfig = readJsonFile<{ compilerOptions: { strict: boolean } }>('tsconfig.json');
    const tsconfigNode = readJsonFile<{ compilerOptions: { strict: boolean } }>(
      'tsconfig.node.json'
    );
    const viteConfigText = readFileSync(path.resolve(__dirname, '..', 'vite.config.ts'), 'utf8');

    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfigNode.compilerOptions.strict).toBe(true);
    expect(viteConfigText).toContain("host: '127.0.0.1'");
    expect(viteConfigText).toContain('port: 5173');
    expect(viteConfigText).toContain('strictPort: true');
    expect(viteConfigText).toContain('test: {');
    expect(viteConfigText).toContain("environment: 'jsdom'");
  });

  it('extends the root ignore rules with Task 1 build artifacts', () => {
    const gitignore = readFileSync(path.resolve(__dirname, '..', '.gitignore'), 'utf8');

    expect(gitignore).toContain('.worktrees/');
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('dist/');
    expect(gitignore).toContain('dist-electron/');
    expect(gitignore).toContain('playwright-report/');
    expect(gitignore).toContain('test-results/');
    expect(gitignore).toContain('coverage/');
  });
});
