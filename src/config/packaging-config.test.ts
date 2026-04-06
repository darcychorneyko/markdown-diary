import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('packaging config', () => {
  it('defines a Windows packaging script and includes the renderer plus Electron outputs', () => {
    const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
      build: {
        files: string[];
        win: {
          target: string[];
        };
      };
    };

    expect(packageJson.scripts['package:win']).toContain('electron-builder --win nsis');
    expect(packageJson.build.files).toEqual(
      expect.arrayContaining(['dist/**/*', 'dist-electron/**/*', 'package.json'])
    );
    expect(packageJson.build.win.target).toContain('nsis');
    expect(packageJson.dependencies.electron).toBeUndefined();
    expect(packageJson.devDependencies.electron).toBeDefined();
  });
});
