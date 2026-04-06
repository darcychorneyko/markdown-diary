import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('file menu config', () => {
  it('builds a File menu with an Open Vault command', () => {
    const mainPath = path.resolve(__dirname, '..', '..', 'electron', 'main.ts');
    const mainSource = readFileSync(mainPath, 'utf8');

    expect(mainSource).toContain("label: 'File'");
    expect(mainSource).toContain("label: 'Open Vault'");
    expect(mainSource).toContain('menu:command');
  });
});
