import { describe, expect, it } from 'vitest';
import type { VaultApi } from '../../types/ipc';

describe('VaultApi shape', () => {
  it('exposes the required filesystem operations', () => {
    const keys = [
      'chooseVault',
      'readVaultTree',
      'readNote',
      'saveNote',
      'createNote',
      'createFolder',
      'renamePath',
      'deletePath',
      'watchVault',
      'unwatchVault'
    ] satisfies Array<keyof VaultApi>;

    expect(keys).toHaveLength(10);
  });
});
