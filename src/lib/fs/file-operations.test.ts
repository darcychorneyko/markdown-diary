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
      'unwatchVault',
      'onVaultChanged'
    ] satisfies Array<keyof VaultApi>;

    expect(keys).toHaveLength(11);
  });

  it('includes the saveNote bridge in the contract', () => {
    const saveOperation: keyof VaultApi = 'saveNote';
    expect(saveOperation).toBe('saveNote');
  });
});
