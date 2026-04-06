import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('settings bridge', () => {
  it('exposes last-vault read and write methods in the preload contract', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const preloadPath = path.resolve(testDir, '..', '..', 'electron', 'preload.cts');
    const preloadSource = readFileSync(preloadPath, 'utf8');

    expect(preloadSource).toContain('getLastVaultPath');
    expect(preloadSource).toContain('setLastVaultPath');
  });
});
