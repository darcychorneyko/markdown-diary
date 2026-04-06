import { describe, expect, it } from 'vitest';
import { buildVaultTree } from './vault-tree.js';

describe('buildVaultTree', () => {
  it('includes folders and markdown notes but skips non-markdown files', () => {
    const tree = buildVaultTree('vault', [
      'vault/daily',
      'vault/daily/2026-04-05.md',
      'vault/readme.txt'
    ]);

    expect(tree).toEqual([
      {
        kind: 'folder',
        name: 'daily',
        path: 'vault/daily',
        children: [
          {
            kind: 'note',
            name: '2026-04-05.md',
            path: 'vault/daily/2026-04-05.md'
          }
        ]
      }
    ]);
  });
});
