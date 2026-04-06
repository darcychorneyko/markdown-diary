import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import App from '../App';

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
