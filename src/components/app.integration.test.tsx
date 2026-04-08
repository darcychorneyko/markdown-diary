import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, afterEach, expect, test, vi } from 'vitest';
import App from '../App';

let menuCommandListener: ((event: Window['vaultApi'] extends { onMenuCommand(listener: infer T): () => void } ? T extends (event: infer E) => void ? E : never : never) => void) | undefined;

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  width: number;
  height: number;
  pressure: number;
  tangentialPressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  pointerType: string;
  isPrimary: boolean;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.width = init.width ?? 1;
    this.height = init.height ?? 1;
    this.pressure = init.pressure ?? 0;
    this.tangentialPressure = init.tangentialPressure ?? 0;
    this.tiltX = init.tiltX ?? 0;
    this.tiltY = init.tiltY ?? 0;
    this.twist = init.twist ?? 0;
    this.pointerType = init.pointerType ?? 'mouse';
    this.isPrimary = init.isPrimary ?? true;
  }
}

const originalPointerEvent = globalThis.PointerEvent;

beforeAll(() => {
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: TestPointerEvent
  });
  Object.defineProperty(globalThis, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: TestPointerEvent
  });
});

afterAll(() => {
  if (originalPointerEvent) {
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      writable: true,
      value: originalPointerEvent
    });
    Object.defineProperty(globalThis, 'PointerEvent', {
      configurable: true,
      writable: true,
      value: originalPointerEvent
    });
    return;
  }

  delete (window as Window & { PointerEvent?: typeof PointerEvent }).PointerEvent;
  delete (globalThis as typeof globalThis & { PointerEvent?: typeof PointerEvent }).PointerEvent;
});

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

function getGridTracks(shell: HTMLElement) {
  return shell.style.gridTemplateColumns.split(/\s+/).filter(Boolean);
}

function getPixelWidth(track: string | undefined) {
  if (!track) {
    return null;
  }

  const match = track.match(/^(-?\d+(?:\.\d+)?)px$/);
  return match ? Number(match[1]) : null;
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

test('requests a native context menu when right-clicking a note', async () => {
  const showExplorerContextMenu = vi.fn();

  window.vaultApi = createVaultApi({
    getLastVaultPath: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    showExplorerContextMenu
  });

  render(<App />);
  await userEvent.pointer([
    {
      target: await screen.findByRole('button', { name: 'welcome' }),
      keys: '[MouseRight]'
    }
  ]);

  expect(showExplorerContextMenu).toHaveBeenCalledWith({
    kind: 'note',
    targetPath: 'C:/vault/welcome.md'
  });
});

test('requests a native context menu when right-clicking the vault root', async () => {
  const showExplorerContextMenu = vi.fn();

  window.vaultApi = createVaultApi({
    getLastVaultPath: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    showExplorerContextMenu
  });

  render(<App />);
  await userEvent.pointer([
    {
      target: await screen.findByRole('button', { name: 'vault' }),
      keys: '[MouseRight]'
    }
  ]);

  expect(showExplorerContextMenu).toHaveBeenCalledWith({
    kind: 'vault-root',
    targetPath: 'C:/vault'
  });
});

test('renders a nested note and opens it when clicked', async () => {
  window.vaultApi = createVaultApi({
    getLastVaultPath: async () => 'C:/vault',
    readVaultTree: async () => [
      {
        kind: 'folder',
        name: 'Projects',
        path: 'C:/vault/Projects',
        children: [
          { kind: 'note', name: 'nested.md', path: 'C:/vault/Projects/nested.md' }
        ]
      }
    ],
    readNote: async (notePath: string) => ({
      path: notePath,
      name: 'nested.md',
      contents: '# Nested Note',
      updatedAtMs: 1
    })
  });

  render(<App />);

  expect(await screen.findByRole('button', { name: 'nested' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'nested' }));

  expect(await screen.findByRole('heading', { name: 'Nested Note' })).toBeInTheDocument();
});

test('requests a native context menu when right-clicking a nested folder', async () => {
  const showExplorerContextMenu = vi.fn();

  window.vaultApi = createVaultApi({
    getLastVaultPath: async () => 'C:/vault',
    readVaultTree: async () => [
      {
        kind: 'folder',
        name: 'Projects',
        path: 'C:/vault/Projects',
        children: [
          { kind: 'folder', name: 'Archive', path: 'C:/vault/Projects/Archive', children: [] }
        ]
      }
    ],
    showExplorerContextMenu
  });

  render(<App />);
  await userEvent.pointer([
    {
      target: await screen.findByRole('button', { name: 'Archive' }),
      keys: '[MouseRight]'
    }
  ]);

  expect(showExplorerContextMenu).toHaveBeenCalledWith({
    kind: 'folder',
    targetPath: 'C:/vault/Projects/Archive'
  });
});

test('collapses and expands the vault sidebar from the top toggle', async () => {
  window.vaultApi = createVaultApi({
    getLastVaultPath: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }]
  });

  render(<App />);

  const toggle = screen.getByRole('button', { name: 'Collapse vault sidebar' });
  const sidebar = screen.getByRole('complementary', { name: 'Vault explorer' });
  const shell = screen.getByRole('main', { name: /markdown vault workspace/i });

  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(sidebar).not.toHaveClass('sidebar-collapsed');
  expect(shell).not.toHaveClass('app-shell-sidebar-collapsed');

  await userEvent.click(toggle);

  expect(screen.getByRole('button', { name: 'Expand vault sidebar' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  expect(sidebar).toHaveClass('sidebar-collapsed');
  expect(shell).toHaveClass('app-shell-sidebar-collapsed');
});

test('collapsing the vault redistributes its width equally to editor and preview', async () => {
  window.vaultApi = createVaultApi({
    getLastVaultPath: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }]
  });

  render(<App />);

  const shell = screen.getByRole('main', { name: /markdown vault workspace/i });
  const toggle = screen.getByRole('button', { name: 'Collapse vault sidebar' });

  await userEvent.click(toggle);

  const afterTracks = getGridTracks(shell);

  expect(afterTracks).toHaveLength(5);
  expect(getPixelWidth(afterTracks[0])).toBe(0);
  expect(getPixelWidth(afterTracks[1])).toBe(0);
  expect(afterTracks[2]).toBe(afterTracks[4]);
});

test('expanding the vault restores the editor and preview widths after a resize', async () => {
  window.vaultApi = createVaultApi({
    getLastVaultPath: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }]
  });

  render(<App />);

  const shell = screen.getByRole('main', { name: /markdown vault workspace/i });
  const collapse = screen.getByRole('button', { name: 'Collapse vault sidebar' });
  const rightSplitter = screen.getByRole('separator', { name: 'Resize editor and preview' });
  const initialTracks = getGridTracks(shell);
  const initialVaultWidth = getPixelWidth(initialTracks[0]);

  fireEvent.pointerDown(rightSplitter, { clientX: 700 });
  fireEvent.pointerMove(window, { clientX: 760 });
  fireEvent.pointerUp(window);

  const resizedTracks = getGridTracks(shell);
  const resizedEditorWidth = getPixelWidth(resizedTracks[2]);
  const resizedPreviewWidth = getPixelWidth(resizedTracks[4]);

  expect(resizedEditorWidth).not.toBeNull();
  expect(resizedPreviewWidth).not.toBeNull();
  expect(resizedEditorWidth).toBeGreaterThan(resizedPreviewWidth ?? 0);

  await userEvent.click(collapse);
  const collapsedTracks = getGridTracks(shell);
  const collapsedVaultWidth = getPixelWidth(collapsedTracks[0]);
  await userEvent.click(screen.getByRole('button', { name: 'Expand vault sidebar' }));

  const expandedTracks = getGridTracks(shell);
  const expandedVaultWidth = getPixelWidth(expandedTracks[0]);
  const collapsedEditorWidth = getPixelWidth(collapsedTracks[2]);
  const collapsedPreviewWidth = getPixelWidth(collapsedTracks[4]);
  const expandedEditorWidth = getPixelWidth(expandedTracks[2]);
  const expandedPreviewWidth = getPixelWidth(expandedTracks[4]);

  expect(initialVaultWidth).not.toBeNull();
  expect(initialVaultWidth).toBeGreaterThan(0);
  expect(collapsedVaultWidth).toBe(0);
  expect(expandedVaultWidth).not.toBeNull();
  expect(expandedVaultWidth).toBe(initialVaultWidth);
  expect(collapsedEditorWidth).not.toBeNull();
  expect(collapsedPreviewWidth).not.toBeNull();
  expect(expandedEditorWidth).not.toBeNull();
  expect(expandedPreviewWidth).not.toBeNull();
  expect(expandedEditorWidth).toBe(resizedEditorWidth);
  expect(expandedPreviewWidth).toBe(resizedPreviewWidth);
  expect(expandedEditorWidth - collapsedEditorWidth).toBe(expandedPreviewWidth - collapsedPreviewWidth);
});

test('dragging the left splitter changes only the vault and editor widths', async () => {
  window.vaultApi = createVaultApi({
    getLastVaultPath: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }]
  });

  render(<App />);

  const shell = screen.getByRole('main', { name: /markdown vault workspace/i });
  const beforeTracks = getGridTracks(shell);
  const leftSplitter = screen.getByRole('separator', { name: 'Resize vault and editor' });

  fireEvent.pointerDown(leftSplitter, { clientX: 280 });
  fireEvent.pointerMove(window, { clientX: 340 });
  fireEvent.pointerUp(window);

  const afterTracks = getGridTracks(shell);

  expect(afterTracks[0]).not.toBe(beforeTracks[0]);
  expect(afterTracks[2]).not.toBe(beforeTracks[2]);
  expect(afterTracks[4]).toBe(beforeTracks[4]);
});

test('dragging the right splitter grows the editor while shrinking the preview', async () => {
  window.vaultApi = createVaultApi({
    getLastVaultPath: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }]
  });

  render(<App />);

  const shell = screen.getByRole('main', { name: /markdown vault workspace/i });
  const beforeTracks = getGridTracks(shell);
  const rightSplitter = screen.getByRole('separator', { name: 'Resize editor and preview' });

  fireEvent.pointerDown(rightSplitter, { clientX: 700 });
  fireEvent.pointerMove(window, { clientX: 760 });
  fireEvent.pointerUp(window);

  const afterTracks = getGridTracks(shell);
  const editorWidth = getPixelWidth(afterTracks[2]);
  const previewWidth = getPixelWidth(afterTracks[4]);

  expect(afterTracks[0]).toBe(beforeTracks[0]);
  expect(afterTracks[2]).not.toBe(beforeTracks[2]);
  expect(afterTracks[4]).not.toBe(beforeTracks[4]);
  expect(editorWidth).not.toBeNull();
  expect(previewWidth).not.toBeNull();
  expect(editorWidth).toBeGreaterThan(previewWidth ?? 0);
});

test('collapses and expands folder contents from the explorer disclosure control', async () => {
  window.vaultApi = createVaultApi({
    getLastVaultPath: async () => 'C:/vault',
    readVaultTree: async () => [
      {
        kind: 'folder',
        name: 'Projects',
        path: 'C:/vault/Projects',
        children: [{ kind: 'note', name: 'nested.md', path: 'C:/vault/Projects/nested.md' }]
      }
    ]
  });

  render(<App />);

  const toggle = await screen.findByRole('button', { name: 'Collapse folder Projects' });
  expect(screen.getByRole('button', { name: 'nested' })).toBeInTheDocument();

  await userEvent.click(toggle);

  expect(screen.getByRole('button', { name: 'Expand folder Projects' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'nested' })).not.toBeInTheDocument();
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

test('executes a delete action from an explorer menu command', async () => {
  const deletePath = vi.fn();

  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    deletePath
  });

  render(<App />);
  await triggerOpenVaultCommand();

  await waitFor(() => {
    expect(menuCommandListener).toBeDefined();
  });

  menuCommandListener?.({ command: 'delete-path', targetPath: 'C:/vault/welcome.md' });

  await waitFor(() => {
    expect(deletePath).toHaveBeenCalledWith('C:/vault/welcome.md');
  });
});

test('opens a rename prompt for a folder and submits the entered folder name', async () => {
  const renamePath = vi.fn();

  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [
      { kind: 'folder', name: 'Projects', path: 'C:/vault/Projects', children: [] }
    ],
    renamePath
  });

  render(<App />);
  await triggerOpenVaultCommand();

  menuCommandListener?.({ command: 'rename-path', targetPath: 'C:/vault/Projects', targetKind: 'folder' });

  const dialog = await screen.findByRole('dialog', { name: 'Rename' });
  const input = within(dialog).getByRole('textbox', { name: 'Name' });
  await userEvent.clear(input);
  await userEvent.type(input, 'Archives');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

  await waitFor(() => {
    expect(renamePath).toHaveBeenCalledWith('C:/vault/Projects', 'Archives');
  });
});

test('opens a rename prompt for a note and preserves the markdown extension on submit', async () => {
  const renamePath = vi.fn();

  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    renamePath
  });

  render(<App />);
  await triggerOpenVaultCommand();

  menuCommandListener?.({ command: 'rename-path', targetPath: 'C:/vault/welcome.md', targetKind: 'note' });

  const dialog = await screen.findByRole('dialog', { name: 'Rename' });
  const input = within(dialog).getByRole('textbox', { name: 'Name' });
  expect(input).toHaveValue('welcome');
  await userEvent.clear(input);
  await userEvent.type(input, 'Renamed');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

  await waitFor(() => {
    expect(renamePath).toHaveBeenCalledWith('C:/vault/welcome.md', 'Renamed.md');
  });
});

test('treats a folder ending in .md as a folder when the rename target kind is folder', async () => {
  const renamePath = vi.fn();

  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [
      { kind: 'folder', name: 'Projects.md', path: 'C:/vault/Projects.md', children: [] }
    ],
    renamePath
  });

  render(<App />);
  await triggerOpenVaultCommand();

  menuCommandListener?.({ command: 'rename-path', targetPath: 'C:/vault/Projects.md', targetKind: 'folder' });

  const dialog = await screen.findByRole('dialog', { name: 'Rename' });
  const input = within(dialog).getByRole('textbox', { name: 'Name' });
  expect(input).toHaveValue('Projects.md');
  await userEvent.clear(input);
  await userEvent.type(input, 'Archive');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

  await waitFor(() => {
    expect(renamePath).toHaveBeenCalledWith('C:/vault/Projects.md', 'Archive');
  });
});

test('opens a new note prompt and appends the markdown extension on submit', async () => {
  const createNote = vi.fn();

  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    createNote
  });

  render(<App />);
  await triggerOpenVaultCommand();

  menuCommandListener?.({ command: 'new-note', targetPath: 'C:/vault' });

  const dialog = await screen.findByRole('dialog', { name: 'New Note' });
  const input = within(dialog).getByRole('textbox', { name: 'Name' });
  await userEvent.clear(input);
  await userEvent.type(input, 'Meeting Notes');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

  await waitFor(() => {
    expect(createNote).toHaveBeenCalledWith('C:/vault', 'Meeting Notes.md');
  });
});

test('clears the active note when the open note is deleted from the explorer menu command', async () => {
  const deletePath = vi.fn();

  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    readNote: async () => ({
      path: 'C:/vault/welcome.md',
      name: 'welcome.md',
      contents: '# Welcome',
      updatedAtMs: 1
    }),
    deletePath
  });

  render(<App />);
  await triggerOpenVaultCommand();
  await userEvent.click(await screen.findByRole('button', { name: 'welcome' }));

  expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument();

  menuCommandListener?.({ command: 'delete-path', targetPath: 'C:/vault/welcome.md' });

  await waitFor(() => {
    expect(deletePath).toHaveBeenCalledWith('C:/vault/welcome.md');
  });
  expect(await screen.findByText('Select a note')).toBeInTheDocument();
  expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
});

test('clears the active note when deleting a parent folder of the open note', async () => {
  const deletePath = vi.fn();

  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/Projects/welcome.md' }],
    readNote: async () => ({
      path: 'C:/vault/Projects/welcome.md',
      name: 'welcome.md',
      contents: '# Welcome',
      updatedAtMs: 1
    }),
    deletePath
  });

  render(<App />);
  await triggerOpenVaultCommand();
  await userEvent.click(await screen.findByRole('button', { name: 'welcome' }));

  menuCommandListener?.({ command: 'delete-path', targetPath: 'C:/vault/Projects' });

  await waitFor(() => {
    expect(deletePath).toHaveBeenCalledWith('C:/vault/Projects');
  });
  expect(await screen.findByText('Select a note')).toBeInTheDocument();
  expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
});

test('renaming the open note updates the active note path and name', async () => {
  const renamePath = vi.fn(async () => 'C:/vault/Renamed.md');
  const saveNote = vi.fn();
  let treeReadCount = 0;

  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => {
      treeReadCount += 1;
      return treeReadCount > 1
        ? [{ kind: 'note', name: 'Renamed.md', path: 'C:/vault/Renamed.md' }]
        : [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }];
    },
    readNote: async () => ({
      path: 'C:/vault/welcome.md',
      name: 'welcome.md',
      contents: '# Welcome',
      updatedAtMs: 1
    }),
    renamePath,
    saveNote
  });

  render(<App />);
  await triggerOpenVaultCommand();
  await userEvent.click(await screen.findByRole('button', { name: 'welcome' }));

  menuCommandListener?.({ command: 'rename-path', targetPath: 'C:/vault/welcome.md', targetKind: 'note' });

  const dialog = await screen.findByRole('dialog', { name: 'Rename' });
  const input = within(dialog).getByRole('textbox', { name: 'Name' });
  await userEvent.clear(input);
  await userEvent.type(input, 'Renamed');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

  expect(await screen.findByText('Renamed.md')).toBeInTheDocument();
  await userEvent.type(await screen.findByRole('textbox'), '\nEdited');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(saveNote).toHaveBeenCalledWith('C:/vault/Renamed.md', '# Welcome\nEdited');
});

test('renaming a parent folder updates the active note path', async () => {
  const renamePath = vi.fn(async () => 'C:/vault/Archive');
  const saveNote = vi.fn();
  let treeReadCount = 0;

  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => {
      treeReadCount += 1;
      return treeReadCount > 1
        ? [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/Archive/welcome.md' }]
        : [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/Projects/welcome.md' }];
    },
    readNote: async () => ({
      path: 'C:/vault/Projects/welcome.md',
      name: 'welcome.md',
      contents: '# Welcome',
      updatedAtMs: 1
    }),
    renamePath,
    saveNote
  });

  render(<App />);
  await triggerOpenVaultCommand();
  await userEvent.click(await screen.findByRole('button', { name: 'welcome' }));

  menuCommandListener?.({ command: 'rename-path', targetPath: 'C:/vault/Projects', targetKind: 'folder' });

  const dialog = await screen.findByRole('dialog', { name: 'Rename' });
  const input = within(dialog).getByRole('textbox', { name: 'Name' });
  await userEvent.clear(input);
  await userEvent.type(input, 'Archive');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

  await userEvent.type(await screen.findByRole('textbox'), '\nEdited');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(saveNote).toHaveBeenCalledWith('C:/vault/Archive/welcome.md', '# Welcome\nEdited');
});

test('switching prompts resets the dialog input to the new prompt values', async () => {
  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }]
  });

  render(<App />);
  await triggerOpenVaultCommand();

  menuCommandListener?.({ command: 'new-note', targetPath: 'C:/vault' });

  const firstDialog = await screen.findByRole('dialog', { name: 'New Note' });
  const firstInput = within(firstDialog).getByRole('textbox', { name: 'Name' });
  await userEvent.clear(firstInput);
  await userEvent.type(firstInput, 'Draft Name');

  menuCommandListener?.({ command: 'rename-path', targetPath: 'C:/vault/welcome.md', targetKind: 'note' });

  const secondDialog = await screen.findByRole('dialog', { name: 'Rename' });
  expect(within(secondDialog).getByRole('textbox', { name: 'Name' })).toHaveValue('welcome');
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

test('renders the editor with fill-pane layout hooks when a note is open', async () => {
  window.vaultApi = createVaultApi({
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [{ kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }],
    readNote: async () => ({
      path: 'C:/vault/welcome.md',
      name: 'welcome.md',
      contents: '# Welcome',
      updatedAtMs: 1
    })
  });

  render(<App />);
  await triggerOpenVaultCommand();
  await userEvent.click(await screen.findByRole('button', { name: 'welcome' }));

  expect(screen.getByRole('textbox')).toHaveClass('markdown-editor');
  expect(screen.getByRole('textbox').closest('.editor-pane')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Save' }).closest('.editor-header')).not.toBeNull();
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
