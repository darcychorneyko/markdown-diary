import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('electron runtime config', () => {
  it('loads a CommonJS preload script path from the main process', () => {
    const mainPath = path.resolve(__dirname, '..', '..', 'electron', 'main.ts');
    const mainSource = readFileSync(mainPath, 'utf8');

    expect(mainSource).toContain("preload.cjs");
  });
});
