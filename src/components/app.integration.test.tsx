import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import App from '../App';

let menuCommandListener: ((event: { command: 'open-vault' }) => void) | undefined;

function createVaultApi(overrides: Partial<Window['vaultApi']> = {}): Window['vaultApi'] {
  return {
    getLastVaultPath: async () => null,
    setLastVaultPath: async () => {},
    chooseVault: async () => null,
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
    onVaultChanged: () => () => {},
    onMenuCommand: (listener) => {
      menuCommandListener = listener;
      return () => {
        if (menuCommandListener === listener) {
          menuCommandListener = undefined;
        }
      };
    },
    showExplorerContextMenu: async () => {},
    ...overrides
  };
}

async function triggerOpenVaultCommand() {
  await waitFor(() => {
    expect(menuCommandListener).toBeDefined();
  });

  menuCommandListener?.({ command: 'open-vault' });
}

afterEach(() => {
  cleanup();
  menuCommandListener = undefined;
});

test('moves open vault out of the sidebar', async () => {
  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }]
  });

  render(<App />);

  expect(screen.queryByRole('button', { name: /open vault/i })).not.toBeInTheDocument();
});

test('opens a vault and renders note names in the sidebar', async () => {
  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }]
  });

  render(<App />);
  await triggerOpenVaultCommand();

  expect(await screen.findByRole('button', { name: 'welcome' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'welcome.md' })).not.toBeInTheDocument();
});

test('does not render inline explorer actions', async () => {
  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }]
  });

  render(<App />);
  await triggerOpenVaultCommand();

  expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
});

test('restores the last used vault on startup', async () => {
  window.vaultApi = createVaultApi({
    getLastVaultPath: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }]
  });

  render(<App />);

  expect(await screen.findByRole('button', { name: 'welcome' })).toBeInTheDocument();
});

test('does not show an open-vault error when persistence fails after a successful open', async () => {
  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    setLastVaultPath: async () => {
      throw new Error('settings write failed');
    },
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }]
  });

  render(<App />);
  await triggerOpenVaultCommand();

  expect(await screen.findByRole('button', { name: 'welcome' })).toBeInTheDocument();
  expect(screen.queryByText(/Failed to open the vault picker/i)).not.toBeInTheDocument();
});

test('shows the selected vault and an empty state when no markdown notes are found', async () => {
  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/empty-vault'
  });

  render(<App />);
  await triggerOpenVaultCommand();

  expect(await screen.findByText('C:/empty-vault')).toBeInTheDocument();
  expect(screen.getByText('No markdown notes found in this vault yet.')).toBeInTheDocument();
});

test('shows an error message when the vault picker request fails', async () => {
  window.vaultApi = createVaultApi({
    chooseVault: async () => {
      throw new Error('dialog failed');
    }
  });

  render(<App />);
  await triggerOpenVaultCommand();

  expect(await screen.findByText('Failed to open the vault picker: dialog failed')).toBeInTheDocument();
});

test('loads a note into the editor and saves changes', async () => {
  const saveNote = vi.fn();

  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    readNote: async () => ({
      path: 'C:/vault/welcome.md',
      name: 'welcome.md',
      contents: '# Welcome',
      updatedAtMs: 1
    }),
    saveNote
  });

  render(<App />);
  await triggerOpenVaultCommand();
  await userEvent.click(await screen.findByRole('button', { name: 'welcome' }));
  const editor = await screen.findByRole('textbox');
  await userEvent.type(editor, '\nEdited');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));

  expect(saveNote).toHaveBeenCalledWith('C:/vault/welcome.md', '# Welcome\nEdited');
  expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
  expect(screen.getByText('Edited')).toBeInTheDocument();
});

test('clicking a rendered markdown link opens the linked note', async () => {
  window.vaultApi = createVaultApi({
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
    }
  });

  render(<App />);
  await triggerOpenVaultCommand();
  await userEvent.click(await screen.findByRole('button', { name: 'start' }));
  await userEvent.click(await screen.findByRole('link', { name: 'Open target' }));

  expect(await screen.findByRole('heading', { name: 'Target Note' })).toBeInTheDocument();
});

test('clicking a rendered wiki link opens the linked note', async () => {
  window.vaultApi = createVaultApi({
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
    }
  });

  render(<App />);
  await triggerOpenVaultCommand();
  await userEvent.click(await screen.findByRole('button', { name: 'start' }));
  await userEvent.click(await screen.findByRole('link', { name: 'Daily Note' }));

  expect(await screen.findByRole('heading', { name: 'Daily Note' })).toBeInTheDocument();
});

test('shows a conflict warning when the open note changes externally while dirty', async () => {
  let vaultChangedListener:
    | ((payload: { eventName: string; path: string }) => void)
    | undefined;

  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    readNote: async () => ({
      path: 'C:/vault/welcome.md',
      name: 'welcome.md',
      contents: '# Welcome',
      updatedAtMs: 1
    }),
    onVaultChanged: (listener) => {
      vaultChangedListener = listener;
      return () => {
        vaultChangedListener = undefined;
      };
    }
  });

  render(<App />);
  await triggerOpenVaultCommand();
  await userEvent.click(await screen.findByRole('button', { name: 'welcome' }));
  await userEvent.type(await screen.findByRole('textbox'), '\nEdited');

  vaultChangedListener?.({ eventName: 'change', path: 'C:/vault/welcome.md' });

  expect(await screen.findByRole('dialog', { name: 'File changed on disk' })).toBeInTheDocument();
  expect(screen.getByText('File changed on disk while you have unsaved edits.')).toBeInTheDocument();
});
