import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import App from '../App';

afterEach(() => {
  cleanup();
});

test('opens a vault and renders note names in the sidebar', async () => {
  window.vaultApi = {
    getLastVaultPath: async () => null,
    setLastVaultPath: async () => {},
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
    watchVault: async () => {},
    unwatchVault: async () => {},
    onVaultChanged: () => () => {}
  };

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /open vault/i }));

  expect(await screen.findByText('welcome.md')).toBeInTheDocument();
});

test('restores the last used vault on startup', async () => {
  window.vaultApi = {
    getLastVaultPath: async () => 'C:/vault',
    setLastVaultPath: async () => {},
    chooseVault: async () => null,
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
    watchVault: async () => {},
    unwatchVault: async () => {},
    onVaultChanged: () => () => {}
  };

  render(<App />);

  expect(await screen.findByRole('button', { name: 'welcome.md' })).toBeInTheDocument();
});

test('shows the selected vault and an empty state when no markdown notes are found', async () => {
  window.vaultApi = {
    getLastVaultPath: async () => null,
    setLastVaultPath: async () => {},
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
    watchVault: async () => {},
    unwatchVault: async () => {},
    onVaultChanged: () => () => {}
  };

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /open vault/i }));

  expect(await screen.findByText('C:/empty-vault')).toBeInTheDocument();
  expect(screen.getByText('No markdown notes found in this vault yet.')).toBeInTheDocument();
});

test('shows an error message when the vault picker request fails', async () => {
  window.vaultApi = {
    getLastVaultPath: async () => null,
    setLastVaultPath: async () => {},
    chooseVault: async () => {
      throw new Error('dialog failed');
    },
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
    watchVault: async () => {},
    unwatchVault: async () => {},
    onVaultChanged: () => () => {}
  };

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /open vault/i }));

  expect(await screen.findByText('Failed to open the vault picker: dialog failed')).toBeInTheDocument();
});

test('loads a note into the editor and saves changes', async () => {
  const saveNote = vi.fn();

  window.vaultApi = {
    getLastVaultPath: async () => null,
    setLastVaultPath: async () => {},
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    readNote: async () => ({
      path: 'C:/vault/welcome.md',
      name: 'welcome.md',
      contents: '# Welcome',
      updatedAtMs: 1
    }),
    saveNote,
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
    watchVault: async () => {},
    unwatchVault: async () => {},
    onVaultChanged: () => () => {}
  };

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /open vault/i }));
  await userEvent.click(await screen.findByRole('button', { name: 'welcome.md' }));
  const editor = await screen.findByRole('textbox');
  await userEvent.type(editor, '\nEdited');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));

  expect(saveNote).toHaveBeenCalledWith('C:/vault/welcome.md', '# Welcome\nEdited');
  expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
  expect(screen.getByText('Edited')).toBeInTheDocument();
});

test('clicking a rendered markdown link opens the linked note', async () => {
  window.vaultApi = {
    getLastVaultPath: async () => null,
    setLastVaultPath: async () => {},
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [
      { kind: 'note', name: 'start.md', path: 'C:/vault/start.md' },
      { kind: 'note', name: 'target.md', path: 'C:/vault/target.md' }
    ],
    readNote: async (notePath: string) => {
      if (notePath === 'C:/vault/start.md') {
        return {
          path: notePath,
          name: 'start.md',
          contents: '[Open target](target.md)',
          updatedAtMs: 1
        };
      }

      return {
        path: notePath,
        name: 'target.md',
        contents: '# Target Note',
        updatedAtMs: 2
      };
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
    watchVault: async () => {},
    unwatchVault: async () => {},
    onVaultChanged: () => () => {}
  };

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /open vault/i }));
  await userEvent.click(await screen.findByRole('button', { name: 'start.md' }));
  await userEvent.click(await screen.findByRole('link', { name: 'Open target' }));

  expect(await screen.findByRole('heading', { name: 'Target Note' })).toBeInTheDocument();
});

test('clicking a rendered wiki link opens the linked note', async () => {
  window.vaultApi = {
    getLastVaultPath: async () => null,
    setLastVaultPath: async () => {},
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [
      { kind: 'note', name: 'start.md', path: 'C:/vault/start.md' },
      { kind: 'note', name: 'Daily Note.md', path: 'C:/vault/Daily Note.md' }
    ],
    readNote: async (notePath: string) => {
      if (notePath === 'C:/vault/start.md') {
        return {
          path: notePath,
          name: 'start.md',
          contents: 'Jump to [[Daily Note]]',
          updatedAtMs: 1
        };
      }

      return {
        path: notePath,
        name: 'Daily Note.md',
        contents: '# Daily Note',
        updatedAtMs: 2
      };
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
    watchVault: async () => {},
    unwatchVault: async () => {},
    onVaultChanged: () => () => {}
  };

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /open vault/i }));
  await userEvent.click(await screen.findByRole('button', { name: 'start.md' }));
  await userEvent.click(await screen.findByRole('link', { name: 'Daily Note' }));

  expect(await screen.findByRole('heading', { name: 'Daily Note' })).toBeInTheDocument();
});

test('shows a conflict warning when the open note changes externally while dirty', async () => {
  let vaultChangedListener:
    | ((payload: { eventName: string; path: string }) => void)
    | undefined;

  window.vaultApi = {
    getLastVaultPath: async () => null,
    setLastVaultPath: async () => {},
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    readNote: async () => ({
      path: 'C:/vault/welcome.md',
      name: 'welcome.md',
      contents: '# Welcome',
      updatedAtMs: 1
    }),
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
    watchVault: async () => {},
    unwatchVault: async () => {},
    onVaultChanged: (listener) => {
      vaultChangedListener = listener;
      return () => {
        vaultChangedListener = undefined;
      };
    }
  };

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /open vault/i }));
  await userEvent.click(await screen.findByRole('button', { name: 'welcome.md' }));
  await userEvent.type(await screen.findByRole('textbox'), '\nEdited');

  vaultChangedListener?.({ eventName: 'change', path: 'C:/vault/welcome.md' });

  expect(await screen.findByRole('dialog', { name: 'File changed on disk' })).toBeInTheDocument();
  expect(screen.getByText('File changed on disk while you have unsaved edits.')).toBeInTheDocument();
});
