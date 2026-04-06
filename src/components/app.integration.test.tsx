import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import App from '../App';

afterEach(() => {
  cleanup();
});

test('opens a vault and renders note names in the sidebar', async () => {
  window.vaultApi = {
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    readNote: async () => {
      throw new Error('unused');
    },
    saveNote: async () => {
      throw new Error('unused');
    },
    createNote: async () => {
      throw new Error('unused');
    },
    createFolder: async () => {
      throw new Error('unused');
    },
    renamePath: async () => {
      throw new Error('unused');
    },
    deletePath: async () => {
      throw new Error('unused');
    },
    watchVault: async () => {
      throw new Error('unused');
    },
    unwatchVault: async () => {
      throw new Error('unused');
    }
  };

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /open vault/i }));

  expect(await screen.findByText('welcome.md')).toBeInTheDocument();
});

test('shows the selected vault and an empty state when no markdown notes are found', async () => {
  window.vaultApi = {
    chooseVault: async () => 'C:/empty-vault',
    readVaultTree: async () => [],
    readNote: async () => {
      throw new Error('unused');
    },
    saveNote: async () => {
      throw new Error('unused');
    },
    createNote: async () => {
      throw new Error('unused');
    },
    createFolder: async () => {
      throw new Error('unused');
    },
    renamePath: async () => {
      throw new Error('unused');
    },
    deletePath: async () => {
      throw new Error('unused');
    },
    watchVault: async () => {
      throw new Error('unused');
    },
    unwatchVault: async () => {
      throw new Error('unused');
    }
  };

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /open vault/i }));

  expect(await screen.findByText('C:/empty-vault')).toBeInTheDocument();
  expect(screen.getByText('No markdown notes found in this vault yet.')).toBeInTheDocument();
});
