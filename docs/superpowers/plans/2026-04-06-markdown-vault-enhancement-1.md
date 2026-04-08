# Markdown Vault Desktop Enhancement 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add last-vault restore, move vault opening into the File menu, replace explorer action buttons with native Electron context menus plus real prompts, show note labels without `.md`, and make the editor fill its pane.

**Architecture:** Keep shell-level behavior in Electron: app menu, context menus, and lightweight settings persistence. Keep user text-entry flows in the renderer with prompt dialogs, and extend the preload bridge so the renderer can react to menu commands and load or save the last vault path.

**Tech Stack:** Electron, React, TypeScript, Vite, Vitest, Testing Library, Playwright

---

## File Structure

### Electron Process Files

- Modify: `electron/main.ts`
- Modify: `electron/preload.cts`
- Modify: `electron/ipc/filesystem.ts`
- Create: `electron/settings.ts`

### Renderer Files

- Modify: `src/App.tsx`
- Modify: `src/state/app-state.tsx`
- Modify: `src/components/sidebar/vault-tree.tsx`
- Modify: `src/components/editor/markdown-editor.tsx`
- Modify: `src/styles/app.css`
- Create: `src/components/dialogs/name-prompt-dialog.tsx`

### Shared Types

- Modify: `src/types/ipc.ts`
- Modify: `src/lib/types.ts`

### Tests

- Modify: `src/components/app.integration.test.tsx`
- Create: `src/config/file-menu.test.ts`
- Create: `src/config/settings-bridge.test.ts`

## Task 1: Add Last-Vault Settings Persistence And Startup Restore

**Files:**
- Create: `electron/settings.ts`
- Modify: `electron/preload.cts`
- Modify: `src/types/ipc.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/app.integration.test.tsx`
- Create: `src/config/settings-bridge.test.ts`

- [ ] **Step 1: Write the failing startup-restore integration test**

```tsx
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
    onVaultChanged: () => () => {},
    onMenuCommand: () => () => {},
    showExplorerContextMenu: async () => {}
  };

  render(<App />);

  expect(await screen.findByRole('button', { name: 'welcome' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the startup-restore test to verify it fails**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: FAIL because the app does not load a saved vault path on startup

- [ ] **Step 3: Write the failing settings bridge test**

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settings bridge', () => {
  it('exposes last-vault read and write methods in the preload contract', () => {
    const preloadPath = path.resolve(__dirname, '..', '..', 'electron', 'preload.cts');
    const preloadSource = readFileSync(preloadPath, 'utf8');

    expect(preloadSource).toContain('getLastVaultPath');
    expect(preloadSource).toContain('setLastVaultPath');
  });
});
```

- [ ] **Step 4: Run the settings bridge test to verify it fails**

Run: `npm test -- src/config/settings-bridge.test.ts`
Expected: FAIL because the preload file does not expose saved-vault methods yet

- [ ] **Step 5: Add the shared settings methods to the preload contract**

```ts
// src/types/ipc.ts
export type VaultApi = {
  getLastVaultPath(): Promise<string | null>;
  setLastVaultPath(path: string | null): Promise<void>;
  chooseVault(): Promise<string | null>;
  readVaultTree(rootPath: string): Promise<VaultNode[]>;
  readNote(path: string): Promise<NoteDocument>;
  saveNote(path: string, contents: string): Promise<void>;
  createNote(parentPath: string, name: string): Promise<string>;
  createFolder(parentPath: string, name: string): Promise<string>;
  renamePath(oldPath: string, newName: string): Promise<string>;
  deletePath(targetPath: string): Promise<void>;
  watchVault(rootPath: string): Promise<void>;
  unwatchVault(rootPath: string): Promise<void>;
  onVaultChanged(listener: (event: VaultChangeEvent) => void): () => void;
  onMenuCommand(listener: (event: MenuCommandEvent) => void): () => void;
  showExplorerContextMenu(request: ExplorerContextMenuRequest): Promise<void>;
};
```

```ts
// electron/preload.cts
getLastVaultPath: () => ipcRenderer.invoke('settings:get-last-vault'),
setLastVaultPath: (path: string | null) => ipcRenderer.invoke('settings:set-last-vault', path),
```

- [ ] **Step 6: Add a minimal JSON-backed settings layer in Electron**

```ts
// electron/settings.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { app, ipcMain } from 'electron';

type AppSettings = {
  lastVaultPath: string | null;
};

const DEFAULT_SETTINGS: AppSettings = {
  lastVaultPath: null
};

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf8');
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeSettings(settings: AppSettings) {
  await fs.mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8');
}

export function registerSettingsIpc() {
  ipcMain.handle('settings:get-last-vault', async () => {
    const settings = await readSettings();
    return settings.lastVaultPath;
  });

  ipcMain.handle('settings:set-last-vault', async (_event, lastVaultPath: string | null) => {
    const settings = await readSettings();
    await writeSettings({
      ...settings,
      lastVaultPath
    });
  });
}
```

- [ ] **Step 7: Load and save the last vault in the app**

```tsx
// src/App.tsx
useEffect(() => {
  let cancelled = false;

  async function restoreLastVault() {
    const savedVaultPath = await window.vaultApi.getLastVaultPath();
    if (!savedVaultPath) {
      return;
    }

    try {
      const nextTree = await window.vaultApi.readVaultTree(savedVaultPath);
      if (!cancelled) {
        setVault(savedVaultPath, nextTree);
      }
    } catch {
      // Ignore stale saved paths and start empty.
    }
  }

  void restoreLastVault();

  return () => {
    cancelled = true;
  };
}, [setVault]);
```

```tsx
// src/App.tsx
async function applyVaultPath(nextVaultPath: string) {
  const nextTree = await window.vaultApi.readVaultTree(nextVaultPath);
  setVault(nextVaultPath, nextTree);
  await window.vaultApi.setLastVaultPath(nextVaultPath);
}
```

- [ ] **Step 8: Register the settings IPC and run the focused tests**

```ts
// electron/main.ts
import { registerSettingsIpc } from './settings.js';

app.whenReady().then(() => {
  registerSettingsIpc();
  registerFilesystemIpc();
  createWindow();
});
```

Run: `npm test -- src/config/settings-bridge.test.ts src/components/app.integration.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add electron/main.ts electron/preload.cts electron/settings.ts src/types/ipc.ts src/App.tsx src/components/app.integration.test.tsx src/config/settings-bridge.test.ts
git commit -m "feat: restore last used vault on startup"
```

## Task 2: Add The File Menu And Open-Vault Menu Event Bridge

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.cts`
- Modify: `src/types/ipc.ts`
- Modify: `src/App.tsx`
- Create: `src/config/file-menu.test.ts`

- [ ] **Step 1: Write the failing file-menu config test**

```ts
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
```

- [ ] **Step 2: Run the file-menu test to verify it fails**

Run: `npm test -- src/config/file-menu.test.ts`
Expected: FAIL because no File menu is registered yet

- [ ] **Step 3: Add the menu command event types to shared types**

```ts
// src/lib/types.ts
export type MenuCommandEvent =
  | { command: 'open-vault' }
  | { command: 'new-note'; targetPath: string }
  | { command: 'new-folder'; targetPath: string }
  | { command: 'rename-path'; targetPath: string }
  | { command: 'delete-path'; targetPath: string };

export type ExplorerContextMenuRequest =
  | { kind: 'vault-root'; targetPath: string }
  | { kind: 'folder'; targetPath: string }
  | { kind: 'note'; targetPath: string };
```

- [ ] **Step 4: Build the File menu in Electron**

```ts
// electron/main.ts
import { BrowserWindow, Menu, app } from 'electron';
import type { MenuCommandEvent } from '../src/lib/types.js';

function broadcastMenuCommand(payload: MenuCommandEvent) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('menu:command', payload);
  }
}

function buildAppMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Vault',
          click: () => broadcastMenuCommand({ command: 'open-vault' })
        }
      ]
    }
  ]);

  Menu.setApplicationMenu(menu);
}
```

- [ ] **Step 5: Expose the menu event listener in preload and react to it in the renderer**

```ts
// electron/preload.cts
onMenuCommand: (listener) => {
  const wrappedListener = (_event: unknown, payload: Parameters<typeof listener>[0]) => {
    listener(payload);
  };

  ipcRenderer.on('menu:command', wrappedListener);
  return () => ipcRenderer.off('menu:command', wrappedListener);
},
```

```tsx
// src/App.tsx
useEffect(() => {
  const unsubscribe = window.vaultApi.onMenuCommand((event) => {
    if (event.command === 'open-vault') {
      void handleOpenVault();
    }
  });

  return unsubscribe;
}, [handleOpenVault]);
```

- [ ] **Step 6: Run the file-menu test**

Run: `npm test -- src/config/file-menu.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add electron/main.ts electron/preload.cts src/lib/types.ts src/types/ipc.ts src/App.tsx src/config/file-menu.test.ts
git commit -m "feat: add file menu open vault action"
```

## Task 3: Simplify Explorer Labels And Remove Inline Actions

**Files:**
- Modify: `src/components/sidebar/vault-tree.tsx`
- Modify: `src/components/app.integration.test.tsx`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write the failing explorer-label integration tests**

```tsx
test('renders note labels without the markdown extension', async () => {
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
    onVaultChanged: () => () => {},
    onMenuCommand: () => () => {},
    showExplorerContextMenu: async () => {}
  };

  render(<App />);

  expect(await screen.findByRole('button', { name: 'welcome' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'welcome.md' })).not.toBeInTheDocument();
});

test('does not render inline rename or delete buttons in the explorer', async () => {
  render(<App />);
  expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the explorer-label tests to verify they fail**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: FAIL because note labels still include `.md` and inline buttons still render

- [ ] **Step 3: Add a display-name helper and remove inline action buttons**

```tsx
// src/components/sidebar/vault-tree.tsx
function getNodeLabel(node: VaultNode) {
  if (node.kind === 'note' && node.name.toLowerCase().endsWith('.md')) {
    return node.name.slice(0, -3);
  }

  return node.name;
}
```

```tsx
// src/components/sidebar/vault-tree.tsx
export function VaultTree({
  nodes,
  onOpenNote,
  onOpenContextMenu
}: {
  nodes: VaultNode[];
  onOpenNote(path: string): void;
  onOpenContextMenu(request: ExplorerContextMenuRequest): void;
}) {
  return (
    <ul className="tree-root">
      {nodes.map((node) => (
        <li key={node.path}>
          <button
            onClick={() => node.kind === 'note' && onOpenNote(node.path)}
            onContextMenu={(event) => {
              event.preventDefault();
              onOpenContextMenu({
                kind: node.kind,
                targetPath: node.path
              });
            }}
          >
            {getNodeLabel(node)}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run the integration tests**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: PASS for the new explorer label and inline-action assertions

- [ ] **Step 5: Commit**

```bash
git add src/components/sidebar/vault-tree.tsx src/components/app.integration.test.tsx src/lib/types.ts
git commit -m "feat: simplify explorer labels"
```

## Task 4: Add Native Explorer Context Menus

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.cts`
- Modify: `src/types/ipc.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/sidebar/vault-tree.tsx`

- [ ] **Step 1: Write the failing context-menu interaction test**

```tsx
test('requests a native context menu when right-clicking a note', async () => {
  const showExplorerContextMenu = vi.fn();

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
    onVaultChanged: () => () => {},
    onMenuCommand: () => () => {},
    showExplorerContextMenu
  };

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
```

- [ ] **Step 2: Run the context-menu test to verify it fails**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: FAIL because right-click currently does not request a native menu

- [ ] **Step 3: Add the Electron-side context menu handler**

```ts
// electron/main.ts
import { ipcMain, Menu } from 'electron';
import type { ExplorerContextMenuRequest } from '../src/lib/types.js';

ipcMain.handle('menu:show-explorer-context', async (_event, request: ExplorerContextMenuRequest) => {
  const template =
    request.kind === 'vault-root'
      ? [
          {
            label: 'New Note',
            click: () => broadcastMenuCommand({ command: 'new-note', targetPath: request.targetPath })
          },
          {
            label: 'New Folder',
            click: () => broadcastMenuCommand({ command: 'new-folder', targetPath: request.targetPath })
          }
        ]
      : request.kind === 'folder'
        ? [
            {
              label: 'New Note',
              click: () => broadcastMenuCommand({ command: 'new-note', targetPath: request.targetPath })
            },
            {
              label: 'New Folder',
              click: () => broadcastMenuCommand({ command: 'new-folder', targetPath: request.targetPath })
            },
            {
              label: 'Rename',
              click: () => broadcastMenuCommand({ command: 'rename-path', targetPath: request.targetPath })
            },
            {
              label: 'Delete',
              click: () => broadcastMenuCommand({ command: 'delete-path', targetPath: request.targetPath })
            }
          ]
        : [
            {
              label: 'Rename',
              click: () => broadcastMenuCommand({ command: 'rename-path', targetPath: request.targetPath })
            },
            {
              label: 'Delete',
              click: () => broadcastMenuCommand({ command: 'delete-path', targetPath: request.targetPath })
            }
          ];

  Menu.buildFromTemplate(template).popup();
});
```

- [ ] **Step 4: Add a vault-root header target in the renderer**

```tsx
// src/App.tsx
{vaultPath ? (
  <button
    className="vault-root-button"
    onContextMenu={(event) => {
      event.preventDefault();
      void window.vaultApi.showExplorerContextMenu({
        kind: 'vault-root',
        targetPath: vaultPath
      });
    }}
  >
    {vaultPath.split(/[\\/]/).filter(Boolean).at(-1) ?? vaultPath}
  </button>
) : null}
```

- [ ] **Step 5: Run the integration test**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add electron/main.ts electron/preload.cts src/types/ipc.ts src/App.tsx src/components/sidebar/vault-tree.tsx src/components/app.integration.test.tsx
git commit -m "feat: add native explorer context menus"
```

## Task 5: Add Real Create And Rename Prompt Dialogs

**Files:**
- Create: `src/components/dialogs/name-prompt-dialog.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/app.integration.test.tsx`

- [ ] **Step 1: Write the failing prompt-dialog integration test**

```tsx
test('opens a rename prompt from a menu command and submits the entered name', async () => {
  const renamePath = vi.fn();
  let menuListener: ((event: { command: 'rename-path'; targetPath: string }) => void) | undefined;

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
    renamePath,
    deletePath: async () => {
      throw new Error('unused');
    },
    watchVault: async () => {},
    unwatchVault: async () => {},
    onVaultChanged: () => () => {},
    onMenuCommand: (listener) => {
      menuListener = listener as typeof menuListener;
      return () => {
        menuListener = undefined;
      };
    },
    showExplorerContextMenu: async () => {}
  };

  render(<App />);
  menuListener?.({ command: 'rename-path', targetPath: 'C:/vault/welcome.md' });

  await userEvent.clear(await screen.findByRole('textbox', { name: 'Name' }));
  await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Renamed');
  await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

  expect(renamePath).toHaveBeenCalledWith('C:/vault/welcome.md', 'Renamed.md');
});
```

- [ ] **Step 2: Run the prompt-dialog test to verify it fails**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: FAIL because no prompt dialog exists yet

- [ ] **Step 3: Add the reusable name prompt dialog**

```tsx
// src/components/dialogs/name-prompt-dialog.tsx
import { useState } from 'react';

export function NamePromptDialog({
  title,
  initialValue,
  confirmLabel,
  onConfirm,
  onCancel
}: {
  title: string;
  initialValue: string;
  confirmLabel: string;
  onConfirm(value: string): void;
  onCancel(): void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div role="dialog" aria-label={title}>
      <label>
        Name
        <input aria-label="Name" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <button onClick={() => onConfirm(value.trim())} disabled={value.trim().length === 0}>
        {confirmLabel}
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}
```

- [ ] **Step 4: Track prompt state and execute real create or rename actions**

```tsx
// src/App.tsx
type PromptState =
  | null
  | { kind: 'rename-note'; targetPath: string; initialValue: string }
  | { kind: 'rename-folder'; targetPath: string; initialValue: string }
  | { kind: 'new-note'; targetPath: string; initialValue: string }
  | { kind: 'new-folder'; targetPath: string; initialValue: string };

function normalizeNoteName(name: string) {
  return name.toLowerCase().endsWith('.md') ? name : `${name}.md`;
}

function basenameForPrompt(targetPath: string) {
  return targetPath.split(/[\\/]/).filter(Boolean).at(-1) ?? targetPath;
}
```

```tsx
// src/App.tsx
const [promptState, setPromptState] = useState<PromptState>(null);

useEffect(() => {
  const unsubscribe = window.vaultApi.onMenuCommand((event) => {
    if (event.command === 'open-vault') {
      void handleOpenVault();
      return;
    }

    if (event.command === 'new-note') {
      setPromptState({ kind: 'new-note', targetPath: event.targetPath, initialValue: 'Untitled' });
      return;
    }

    if (event.command === 'new-folder') {
      setPromptState({ kind: 'new-folder', targetPath: event.targetPath, initialValue: 'New Folder' });
      return;
    }

    if (event.command === 'rename-path') {
      const initialValue = basenameForPrompt(event.targetPath);
      setPromptState({
        kind: initialValue.toLowerCase().endsWith('.md') ? 'rename-note' : 'rename-folder',
        targetPath: event.targetPath,
        initialValue
      });
      return;
    }

    if (event.command === 'delete-path') {
      void handleDeletePath(event.targetPath);
    }
  });

  return unsubscribe;
}, [handleDeletePath, handleOpenVault]);
```

- [ ] **Step 5: Render the prompt dialog and wire the minimal action handling**

```tsx
// src/App.tsx
async function handlePromptConfirm(value: string) {
  if (!promptState) {
    return;
  }

  if (promptState.kind === 'new-note') {
    await window.vaultApi.createNote(promptState.targetPath, normalizeNoteName(value));
  } else if (promptState.kind === 'new-folder') {
    await window.vaultApi.createFolder(promptState.targetPath, value);
  } else if (promptState.kind === 'rename-note') {
    await window.vaultApi.renamePath(promptState.targetPath, normalizeNoteName(value));
  } else {
    await window.vaultApi.renamePath(promptState.targetPath, value);
  }

  setPromptState(null);
  if (vaultPath) {
    await refreshTree(vaultPath);
  }
}
```

```tsx
// src/App.tsx
{promptState ? (
  <NamePromptDialog
    title={
      promptState.kind === 'new-note'
        ? 'New Note'
        : promptState.kind === 'new-folder'
          ? 'New Folder'
          : 'Rename'
    }
    initialValue={promptState.initialValue}
    confirmLabel="Confirm"
    onConfirm={(value) => {
      void handlePromptConfirm(value);
    }}
    onCancel={() => setPromptState(null)}
  />
) : null}
```

- [ ] **Step 6: Run the prompt-dialog integration test**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/dialogs/name-prompt-dialog.tsx src/components/app.integration.test.tsx
git commit -m "feat: add real create and rename prompts"
```

## Task 6: Clear The Active Note On Delete And Fill The Editor Pane

**Files:**
- Modify: `src/state/app-state.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/editor/markdown-editor.tsx`
- Modify: `src/styles/app.css`
- Modify: `src/components/app.integration.test.tsx`

- [ ] **Step 1: Write the failing delete-and-layout integration tests**

```tsx
test('clears the active note when the open note is deleted', async () => {
  const deletePath = vi.fn();
  let menuListener: ((event: { command: 'delete-path'; targetPath: string }) => void) | undefined;

  window.vaultApi = {
    getLastVaultPath: async () => 'C:/vault',
    setLastVaultPath: async () => {},
    chooseVault: async () => null,
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
    deletePath,
    watchVault: async () => {},
    unwatchVault: async () => {},
    onVaultChanged: () => () => {},
    onMenuCommand: (listener) => {
      menuListener = listener as typeof menuListener;
      return () => {
        menuListener = undefined;
      };
    },
    showExplorerContextMenu: async () => {}
  };

  render(<App />);
  await userEvent.click(await screen.findByRole('button', { name: 'welcome' }));
  menuListener?.({ command: 'delete-path', targetPath: 'C:/vault/welcome.md' });

  expect(deletePath).toHaveBeenCalledWith('C:/vault/welcome.md');
  expect(await screen.findByText('Select a note')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the delete-and-layout test to verify it fails**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: FAIL because deleting the active note does not clear the editor state yet

- [ ] **Step 3: Add an app-state method to clear the active note**

```tsx
// src/state/app-state.tsx
clearActiveNote() {
  setActiveNote(null);
  setDraftContents('');
  setHasConflict(false);
}
```

- [ ] **Step 4: Clear the editor state on delete and make the editor fill the pane**

```tsx
// src/App.tsx
async function handleDeletePath(targetPath: string) {
  await window.vaultApi.deletePath(targetPath);
  if (activeNote?.path === targetPath) {
    clearActiveNote();
  }

  if (vaultPath) {
    await refreshTree(vaultPath);
  }
}
```

```tsx
// src/components/editor/markdown-editor.tsx
export function MarkdownEditor({
  value,
  onChange
}: {
  value: string;
  onChange(value: string): void;
}) {
  return (
    <textarea
      className="markdown-editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
```

```css
/* src/styles/app.css */
.editor,
.preview {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.markdown-editor {
  width: 100%;
  flex: 1;
  min-height: 0;
  resize: none;
}
```

- [ ] **Step 5: Run the integration test and build**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/state/app-state.tsx src/App.tsx src/components/editor/markdown-editor.tsx src/styles/app.css src/components/app.integration.test.tsx
git commit -m "fix: clear active note on delete and fill editor pane"
```

## Task 7: Final Verification

**Files:**
- Modify: `playwright.config.ts` only if new menu-driven coverage proves necessary

- [ ] **Step 1: Run the full unit and integration suite**

Run: `npm test`
Expected: PASS with all Vitest tests green

- [ ] **Step 2: Run the browser workflow test**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 3: Build the app**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Rebuild the Windows installer**

Run: `npm run package:win`
Expected: PASS and `release/Markdown Vault Desktop Setup 0.1.0.exe` updated

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: verify enhancement 1 changes"
```

## Self-Review

### Spec Coverage Check

- Restore the last-used vault on startup: covered in Task 1
- Move `Open Vault` into the File menu: covered in Task 2
- Show note labels without `.md`: covered in Task 3
- Keep the explorer markdown-only: already enforced by the existing vault tree logic and preserved by Tasks 3 and 4
- Replace inline explorer buttons with native context menus: covered in Task 4
- Add vault-root context menu for `New Note` and `New Folder`: covered in Task 4
- Add real create and rename prompts: covered in Task 5
- Make the editor fill the panel: covered in Task 6

### Placeholder Scan

- No `TODO`, `TBD`, or deferred implementation markers remain
- Each task has exact file targets, code, commands, and expected results
- New IPC methods, event types, and prompt state are defined before later tasks use them

### Type Consistency Check

- `MenuCommandEvent` and `ExplorerContextMenuRequest` are introduced before preload and renderer code use them
- `getLastVaultPath`, `setLastVaultPath`, `onMenuCommand`, and `showExplorerContextMenu` are named consistently across shared types, preload, and app code
- `clearActiveNote` is added to app state before Task 6 uses it
