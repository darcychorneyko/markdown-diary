import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dev script', () => {
  it('waits for both the Electron main and preload outputs before launching Electron', () => {
    const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.dev).toContain('dist-electron/electron/main.js');
    expect(packageJson.scripts.dev).toContain('dist-electron/electron/preload.cjs');
  });
});
