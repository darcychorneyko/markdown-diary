# Markdown Vault Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows desktop app that opens a local markdown vault, shows a folder tree, edits one note as raw text, renders a live preview, and navigates markdown plus wiki links.

**Architecture:** Use Electron for the desktop shell, a React/TypeScript renderer for the UI, and a preload bridge for all filesystem access. Keep note contents on disk as the source of truth, use a small React state layer for session coordination, and isolate parsing and vault logic into testable utility modules.

**Tech Stack:** Electron, React, TypeScript, Vite, Vitest, Testing Library, Playwright, CodeMirror 6, react-markdown, remark-gfm, chokidar

---

## File Structure

### Root Project Files

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.gitignore`
- Create: `index.html`

### Electron Process Files

- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron/ipc/filesystem.ts`
- Create: `electron/ipc/window.ts`

### Renderer Application Files

- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/app.css`
- Create: `src/types/ipc.ts`
- Create: `src/state/app-state.tsx`
- Create: `src/components/layout/shell.tsx`
- Create: `src/components/sidebar/vault-tree.tsx`
- Create: `src/components/sidebar/tree-node.tsx`
- Create: `src/components/editor/markdown-editor.tsx`
- Create: `src/components/editor/markdown-preview.tsx`
- Create: `src/components/editor/link-renderer.tsx`
- Create: `src/components/dialogs/conflict-dialog.tsx`
- Create: `src/components/dialogs/ambiguous-link-dialog.tsx`
- Create: `src/components/dialogs/create-note-dialog.tsx`

### Domain Logic Files

- Create: `src/lib/fs/vault-tree.ts`
- Create: `src/lib/fs/file-operations.ts`
- Create: `src/lib/links/wiki-links.ts`
- Create: `src/lib/links/markdown-links.ts`
- Create: `src/lib/links/link-resolution.ts`
- Create: `src/lib/markdown/rendering.ts`
- Create: `src/lib/types.ts`

### Tests

- Create: `src/lib/links/wiki-links.test.ts`
- Create: `src/lib/links/link-resolution.test.ts`
- Create: `src/lib/fs/vault-tree.test.ts`
- Create: `src/lib/fs/file-operations.test.ts`
- Create: `src/components/app.integration.test.tsx`
- Create: `tests/e2e/vault-workflow.spec.ts`

## Task 1: Scaffold The Electron + React Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.gitignore`
- Create: `index.html`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/app.css`

- [ ] **Step 1: Create the npm package manifest**

```json
{
  "name": "markdown-vault-desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently -k \"vite\" \"tsc -p tsconfig.node.json --watch\" \"wait-on tcp:5173 dist-electron/main.js && electron .\"",
    "build": "vite build && tsc -p tsconfig.node.json",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@codemirror/lang-markdown": "^6.3.0",
    "@codemirror/state": "^6.5.0",
    "@codemirror/view": "^6.36.0",
    "@uiw/react-codemirror": "^4.23.0",
    "chokidar": "^4.0.0",
    "electron": "^35.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^10.0.0",
    "remark-gfm": "^4.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.53.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/node": "^22.14.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "concurrently": "^9.1.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.8.0",
    "vite": "^6.2.0",
    "vitest": "^3.1.0",
    "wait-on": "^8.0.0"
  }
}
```

- [ ] **Step 2: Add TypeScript and Vite config**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```json
// tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "outDir": "dist-electron",
    "strict": true,
    "types": ["node", "electron"]
  },
  "include": ["electron/**/*.ts"]
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  },
  test: {
    environment: 'jsdom'
  }
});
```

- [ ] **Step 3: Add the Electron shell entrypoints**

```ts
// electron/main.ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

const isDev = !app.isPackaged;

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist-electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    void window.loadURL('http://127.0.0.1:5173');
  } else {
    void window.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

```ts
// electron/preload.ts
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('vaultApi', {});
```

- [ ] **Step 4: Add the renderer bootstrap**

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```tsx
// src/App.tsx
export default function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">Vault</aside>
      <section className="editor">Editor</section>
      <section className="preview">Preview</section>
    </main>
  );
}
```

- [ ] **Step 5: Add base styling and ignore rules**

```css
/* src/styles/app.css */
:root {
  color-scheme: light;
  font-family: "Segoe UI", sans-serif;
  color: #1f2937;
  background: #f3f4f6;
}

body,
#root {
  margin: 0;
  min-height: 100vh;
}

.app-shell {
  display: grid;
  grid-template-columns: 280px 1fr 1fr;
  min-height: 100vh;
}
```

```gitignore
node_modules
dist
dist-electron
playwright-report
test-results
coverage
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: package lock generated and install completes without errors

- [ ] **Step 7: Verify the scaffold boots**

Run: `npm run dev`
Expected: Electron launches a window with `Vault`, `Editor`, and `Preview` placeholder panes

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: scaffold electron markdown vault app"
```

## Task 2: Define Shared Types And The Filesystem IPC Boundary

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/types/ipc.ts`
- Create: `electron/ipc/filesystem.ts`
- Create: `electron/ipc/window.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: Write the failing IPC contract test**

```ts
// src/lib/fs/file-operations.test.ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/fs/file-operations.test.ts`
Expected: FAIL because `src/types/ipc.ts` does not exist yet

- [ ] **Step 3: Define the shared domain types**

```ts
// src/lib/types.ts
export type VaultNode =
  | {
      kind: 'folder';
      name: string;
      path: string;
      children: VaultNode[];
    }
  | {
      kind: 'note';
      name: string;
      path: string;
    };

export type NoteDocument = {
  path: string;
  name: string;
  contents: string;
  updatedAtMs: number;
};

export type LinkResolution =
  | { kind: 'resolved'; path: string }
  | { kind: 'missing'; label: string }
  | { kind: 'ambiguous'; label: string; matches: string[] };
```

```ts
// src/types/ipc.ts
import type { NoteDocument, VaultNode } from '../lib/types';

export type VaultApi = {
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
};
```

- [ ] **Step 4: Implement the IPC registration surface**

```ts
// electron/ipc/filesystem.ts
import { dialog, ipcMain } from 'electron';

export function registerFilesystemIpc() {
  ipcMain.handle('vault:choose', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });

    return result.canceled ? null : result.filePaths[0];
  });
}
```

```ts
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import type { VaultApi } from '../src/types/ipc';

const vaultApi: VaultApi = {
  chooseVault: () => ipcRenderer.invoke('vault:choose'),
  readVaultTree: (rootPath) => ipcRenderer.invoke('vault:tree', rootPath),
  readNote: (path) => ipcRenderer.invoke('vault:read-note', path),
  saveNote: (path, contents) => ipcRenderer.invoke('vault:save-note', path, contents),
  createNote: (parentPath, name) => ipcRenderer.invoke('vault:create-note', parentPath, name),
  createFolder: (parentPath, name) => ipcRenderer.invoke('vault:create-folder', parentPath, name),
  renamePath: (oldPath, newName) => ipcRenderer.invoke('vault:rename-path', oldPath, newName),
  deletePath: (targetPath) => ipcRenderer.invoke('vault:delete-path', targetPath),
  watchVault: (rootPath) => ipcRenderer.invoke('vault:watch', rootPath),
  unwatchVault: (rootPath) => ipcRenderer.invoke('vault:unwatch', rootPath)
};

contextBridge.exposeInMainWorld('vaultApi', vaultApi);
```

- [ ] **Step 5: Register the IPC handlers in the Electron main process**

```ts
// electron/main.ts
import { registerFilesystemIpc } from './ipc/filesystem';

app.whenReady().then(() => {
  registerFilesystemIpc();
  createWindow();
});
```

- [ ] **Step 6: Run the IPC contract test**

Run: `npm test -- src/lib/fs/file-operations.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add electron src package.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts
git commit -m "feat: add filesystem ipc contract"
```

## Task 3: Implement Vault Tree Loading And File Operations

**Files:**
- Create: `src/lib/fs/vault-tree.ts`
- Create: `src/lib/fs/file-operations.ts`
- Create: `src/lib/fs/vault-tree.test.ts`
- Modify: `electron/ipc/filesystem.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write the failing vault tree tests**

```ts
// src/lib/fs/vault-tree.test.ts
import { describe, expect, it } from 'vitest';
import { buildVaultTree } from './vault-tree';

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
```

- [ ] **Step 2: Run the vault tree test to verify it fails**

Run: `npm test -- src/lib/fs/vault-tree.test.ts`
Expected: FAIL because `buildVaultTree` is undefined

- [ ] **Step 3: Implement the pure tree builder**

```ts
// src/lib/fs/vault-tree.ts
import path from 'node:path';
import type { VaultNode } from '../types';

export function buildVaultTree(rootPath: string, discoveredPaths: string[]): VaultNode[] {
  const folders = new Map<string, VaultNode & { kind: 'folder' }>();
  const roots: VaultNode[] = [];

  for (const discoveredPath of discoveredPaths) {
    const relativePath = path.relative(rootPath, discoveredPath);
    if (!relativePath || relativePath.startsWith('..')) continue;

    const ext = path.extname(discoveredPath).toLowerCase();
    const isDirectory = ext === '';

    if (!isDirectory && ext !== '.md') continue;
  }

  return roots;
}
```

- [ ] **Step 4: Implement the filesystem-backed IPC handlers**

```ts
// electron/ipc/filesystem.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { dialog, ipcMain } from 'electron';
import { buildVaultTree } from '../../src/lib/fs/vault-tree';

async function walkMarkdownPaths(rootPath: string): Promise<string[]> {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      paths.push(fullPath, ...(await walkMarkdownPaths(fullPath)));
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
      paths.push(fullPath);
    }
  }

  return paths;
}

ipcMain.handle('vault:tree', async (_event, rootPath: string) => {
  const paths = await walkMarkdownPaths(rootPath);
  return buildVaultTree(rootPath, paths);
});

ipcMain.handle('vault:read-note', async (_event, notePath: string) => {
  const contents = await fs.readFile(notePath, 'utf8');
  const stat = await fs.stat(notePath);
  return {
    path: notePath,
    name: path.basename(notePath),
    contents,
    updatedAtMs: stat.mtimeMs
  };
});
```

- [ ] **Step 5: Add file mutation helpers**

```ts
// src/lib/fs/file-operations.ts
import path from 'node:path';

export function buildNotePath(parentPath: string, name: string) {
  const normalized = name.endsWith('.md') ? name : `${name}.md`;
  return path.join(parentPath, normalized);
}

export function buildRenamedPath(targetPath: string, newName: string) {
  return path.join(path.dirname(targetPath), newName);
}
```

- [ ] **Step 6: Extend the IPC handlers for create, rename, and delete**

```ts
// electron/ipc/filesystem.ts
ipcMain.handle('vault:create-note', async (_event, parentPath: string, name: string) => {
  const nextPath = path.join(parentPath, name.endsWith('.md') ? name : `${name}.md`);
  await fs.writeFile(nextPath, '', 'utf8');
  return nextPath;
});

ipcMain.handle('vault:create-folder', async (_event, parentPath: string, name: string) => {
  const nextPath = path.join(parentPath, name);
  await fs.mkdir(nextPath, { recursive: false });
  return nextPath;
});

ipcMain.handle('vault:rename-path', async (_event, oldPath: string, newName: string) => {
  const nextPath = path.join(path.dirname(oldPath), newName);
  await fs.rename(oldPath, nextPath);
  return nextPath;
});

ipcMain.handle('vault:delete-path', async (_event, targetPath: string) => {
  await fs.rm(targetPath, { recursive: true, force: false });
});
```

- [ ] **Step 7: Run the vault tree tests**

Run: `npm test -- src/lib/fs/vault-tree.test.ts src/lib/fs/file-operations.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add electron src
git commit -m "feat: add vault tree and file operations"
```

## Task 4: Build The App State, Vault Picker, And Sidebar Navigation

**Files:**
- Create: `src/state/app-state.tsx`
- Create: `src/components/layout/shell.tsx`
- Create: `src/components/sidebar/vault-tree.tsx`
- Create: `src/components/sidebar/tree-node.tsx`
- Create: `src/components/app.integration.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/app.css`

- [ ] **Step 1: Write the failing integration test for vault loading**

```tsx
// src/components/app.integration.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

declare global {
  interface Window {
    vaultApi: {
      chooseVault(): Promise<string | null>;
      readVaultTree(rootPath: string): Promise<Array<{ kind: string; name: string; path: string }>>;
    };
  }
}

test('opens a vault and renders note names in the sidebar', async () => {
  window.vaultApi = {
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [
      { kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }
    ]
  } as never;

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /open vault/i }));

  expect(await screen.findByText('welcome.md')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: FAIL because the app does not yet render an open-vault flow

- [ ] **Step 3: Create the app state provider**

```tsx
// src/state/app-state.tsx
import { createContext, useContext, useState } from 'react';
import type { VaultNode } from '../lib/types';

type AppStateValue = {
  vaultPath: string | null;
  tree: VaultNode[];
  setVault(vaultPath: string, tree: VaultNode[]): void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [tree, setTree] = useState<VaultNode[]>([]);

  const value: AppStateValue = {
    vaultPath,
    tree,
    setVault(nextPath, nextTree) {
      setVaultPath(nextPath);
      setTree(nextTree);
    }
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('AppStateProvider missing');
  return value;
}
```

- [ ] **Step 4: Build the shell and sidebar components**

```tsx
// src/components/layout/shell.tsx
export function Shell({
  sidebar,
  editor,
  preview
}: {
  sidebar: React.ReactNode;
  editor: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <main className="app-shell">
      <aside className="sidebar">{sidebar}</aside>
      <section className="editor">{editor}</section>
      <section className="preview">{preview}</section>
    </main>
  );
}
```

```tsx
// src/components/sidebar/vault-tree.tsx
import type { VaultNode } from '../../lib/types';

export function VaultTree({
  nodes,
  onOpenNote,
  onCreateNote,
  onCreateFolder,
  onRenamePath,
  onDeletePath
}: {
  nodes: VaultNode[];
  onOpenNote(path: string): void;
  onCreateNote(parentPath: string): void;
  onCreateFolder(parentPath: string): void;
  onRenamePath(targetPath: string): void;
  onDeletePath(targetPath: string): void;
}) {
  return (
    <ul className="tree-root">
      {nodes.map((node) => (
        <li key={node.path}>
          <button onClick={() => node.kind === 'note' && onOpenNote(node.path)}>{node.name}</button>
          <button onClick={() => onRenamePath(node.path)}>Rename</button>
          <button onClick={() => onDeletePath(node.path)}>Delete</button>
          {node.kind === 'folder' ? (
            <>
              <button onClick={() => onCreateNote(node.path)}>New Note</button>
              <button onClick={() => onCreateFolder(node.path)}>New Folder</button>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Wire the App component to open a vault and call file actions**

```tsx
// src/App.tsx
import { AppStateProvider, useAppState } from './state/app-state';
import { Shell } from './components/layout/shell';
import { VaultTree } from './components/sidebar/vault-tree';

function AppBody() {
  const { tree, vaultPath, setVault } = useAppState();

  async function handleOpenVault() {
    const vaultPath = await window.vaultApi.chooseVault();
    if (!vaultPath) return;
    const nextTree = await window.vaultApi.readVaultTree(vaultPath);
    setVault(vaultPath, nextTree);
  }

  async function refreshTree(rootPath: string) {
    const nextTree = await window.vaultApi.readVaultTree(rootPath);
    setVault(rootPath, nextTree);
  }

  async function handleCreateNote(parentPath: string) {
    await window.vaultApi.createNote(parentPath, 'Untitled');
    if (vaultPath) await refreshTree(vaultPath);
  }

  async function handleCreateFolder(parentPath: string) {
    await window.vaultApi.createFolder(parentPath, 'New Folder');
    if (vaultPath) await refreshTree(vaultPath);
  }

  async function handleRenamePath(targetPath: string) {
    await window.vaultApi.renamePath(targetPath, 'Renamed.md');
    if (vaultPath) await refreshTree(vaultPath);
  }

  async function handleDeletePath(targetPath: string) {
    await window.vaultApi.deletePath(targetPath);
    if (vaultPath) await refreshTree(vaultPath);
  }

  return (
    <Shell
      sidebar={
        <>
          <button onClick={handleOpenVault}>Open Vault</button>
          <VaultTree
            nodes={tree}
            onOpenNote={() => {}}
            onCreateNote={handleCreateNote}
            onCreateFolder={handleCreateFolder}
            onRenamePath={handleRenamePath}
            onDeletePath={handleDeletePath}
          />
        </>
      }
      editor={<div>Select a note</div>}
      preview={<div>Preview unavailable</div>}
    />
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppBody />
    </AppStateProvider>
  );
}
```

- [ ] **Step 6: Run the integration test**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: PASS

- [ ] **Step 7: Manually verify sidebar file actions**

Run: `npm run dev`
Expected: the sidebar can create, rename, and delete notes or folders, and the tree refreshes after each action

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: add vault picker and sidebar navigation"
```

## Task 5: Add The Markdown Editor, Preview, And Explicit Save Flow

**Files:**
- Create: `src/components/editor/markdown-editor.tsx`
- Create: `src/components/editor/markdown-preview.tsx`
- Create: `src/lib/markdown/rendering.ts`
- Modify: `src/state/app-state.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/app.integration.test.tsx`
- Modify: `src/styles/app.css`

- [ ] **Step 1: Write the failing integration test for opening and editing a note**

```tsx
// src/components/app.integration.test.tsx
test('loads a note into the editor and saves changes', async () => {
  const saveNote = vi.fn();

  window.vaultApi = {
    chooseVault: async () => 'C:/vault',
    readVaultTree: async () => [
      { kind: 'note', name: 'welcome.md', path: 'C:/vault/welcome.md' }
    ],
    readNote: async () => ({
      path: 'C:/vault/welcome.md',
      name: 'welcome.md',
      contents: '# Welcome',
      updatedAtMs: 1
    }),
    saveNote
  } as never;

  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /open vault/i }));
  await userEvent.click(await screen.findByText('welcome.md'));
  await userEvent.type(screen.getByRole('textbox'), '\nEdited');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));

  expect(saveNote).toHaveBeenCalledWith('C:/vault/welcome.md', '# Welcome\nEdited');
});
```

- [ ] **Step 2: Run the note editing integration test to verify it fails**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: FAIL because note loading and saving are not implemented yet

- [ ] **Step 3: Extend app state for the active note**

```tsx
// src/state/app-state.tsx
import type { NoteDocument } from '../lib/types';

type AppStateValue = {
  vaultPath: string | null;
  tree: VaultNode[];
  activeNote: NoteDocument | null;
  draftContents: string;
  setVault(vaultPath: string, tree: VaultNode[]): void;
  openNote(note: NoteDocument): void;
  updateDraft(contents: string): void;
};
```

```tsx
// src/state/app-state.tsx
const [activeNote, setActiveNote] = useState<NoteDocument | null>(null);
const [draftContents, setDraftContents] = useState('');

openNote(note) {
  setActiveNote(note);
  setDraftContents(note.contents);
},
updateDraft(contents) {
  setDraftContents(contents);
}
```

- [ ] **Step 4: Add the editor and preview components**

```tsx
// src/components/editor/markdown-editor.tsx
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';

export function MarkdownEditor({
  value,
  onChange
}: {
  value: string;
  onChange(value: string): void;
}) {
  return <CodeMirror value={value} extensions={[markdown()]} onChange={onChange} />;
}
```

```tsx
// src/components/editor/markdown-preview.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownPreview({ value }: { value: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>;
}
```

- [ ] **Step 5: Wire note open and save behavior into the app**

```tsx
// src/App.tsx
async function handleOpenNote(notePath: string) {
  const note = await window.vaultApi.readNote(notePath);
  openNote(note);
}

async function handleSave() {
  if (!activeNote) return;
  await window.vaultApi.saveNote(activeNote.path, draftContents);
}
```

```tsx
// src/App.tsx
editor={
  activeNote ? (
    <>
      <header className="pane-header">
        <strong>{activeNote.name}</strong>
        <button onClick={handleSave}>Save</button>
      </header>
      <MarkdownEditor value={draftContents} onChange={updateDraft} />
    </>
  ) : (
    <div>Select a note</div>
  )
}
preview={<MarkdownPreview value={draftContents} />}
```

- [ ] **Step 6: Run the integration test**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: add markdown editor and preview"
```

## Task 6: Implement Markdown Link Parsing, Wiki Link Resolution, And Preview Navigation

**Files:**
- Create: `src/lib/links/wiki-links.ts`
- Create: `src/lib/links/markdown-links.ts`
- Create: `src/lib/links/link-resolution.ts`
- Create: `src/lib/links/wiki-links.test.ts`
- Create: `src/lib/links/link-resolution.test.ts`
- Create: `src/components/editor/link-renderer.tsx`
- Create: `src/components/dialogs/ambiguous-link-dialog.tsx`
- Create: `src/components/dialogs/create-note-dialog.tsx`
- Modify: `src/components/editor/markdown-preview.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing unit tests for wiki links and resolution**

```ts
// src/lib/links/wiki-links.test.ts
import { describe, expect, it } from 'vitest';
import { extractWikiLinks } from './wiki-links';

describe('extractWikiLinks', () => {
  it('extracts wiki link labels from markdown text', () => {
    expect(extractWikiLinks('See [[Daily Note]] and [[Ideas]]')).toEqual([
      'Daily Note',
      'Ideas'
    ]);
  });
});
```

```ts
// src/lib/links/link-resolution.test.ts
import { describe, expect, it } from 'vitest';
import { resolveWikiLink } from './link-resolution';

describe('resolveWikiLink', () => {
  it('resolves an exact filename match', () => {
    const resolution = resolveWikiLink('Daily Note', [
      'C:/vault/Daily Note.md',
      'C:/vault/Elsewhere.md'
    ]);

    expect(resolution).toEqual({
      kind: 'resolved',
      path: 'C:/vault/Daily Note.md'
    });
  });
});
```

- [ ] **Step 2: Run the link tests to verify they fail**

Run: `npm test -- src/lib/links/wiki-links.test.ts src/lib/links/link-resolution.test.ts`
Expected: FAIL because the link modules do not exist yet

- [ ] **Step 3: Implement the parsing and resolution modules**

```ts
// src/lib/links/wiki-links.ts
const WIKI_LINK_RE = /\[\[([^[\]]+)\]\]/g;

export function extractWikiLinks(markdown: string) {
  return [...markdown.matchAll(WIKI_LINK_RE)].map((match) => match[1].trim());
}
```

```ts
// src/lib/links/link-resolution.ts
import path from 'node:path';
import type { LinkResolution } from '../types';

export function resolveWikiLink(label: string, notePaths: string[]): LinkResolution {
  const normalized = label.trim().toLowerCase();
  const matches = notePaths.filter((notePath) => {
    return path.basename(notePath, '.md').toLowerCase() === normalized;
  });

  if (matches.length === 1) return { kind: 'resolved', path: matches[0] };
  if (matches.length > 1) return { kind: 'ambiguous', label, matches };
  return { kind: 'missing', label };
}
```

- [ ] **Step 4: Add a custom preview link renderer**

```tsx
// src/components/editor/link-renderer.tsx
export function LinkRenderer({
  href,
  children,
  onNavigate
}: {
  href?: string;
  children: React.ReactNode;
  onNavigate(target: string): void;
}) {
  if (!href) return <span>{children}</span>;

  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
    >
      {children}
    </a>
  );
}
```

- [ ] **Step 5: Integrate wiki-link resolution into preview navigation**

```tsx
// src/components/editor/markdown-preview.tsx
import { LinkRenderer } from './link-renderer';

export function MarkdownPreview({
  value,
  onNavigate
}: {
  value: string;
  onNavigate(target: string): void;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <LinkRenderer href={href} onNavigate={onNavigate}>
            {children}
          </LinkRenderer>
        )
      }}
    >
      {value}
    </ReactMarkdown>
  );
}
```

- [ ] **Step 6: Add ambiguous and missing-link UI**

```tsx
// src/components/dialogs/ambiguous-link-dialog.tsx
export function AmbiguousLinkDialog({
  matches,
  onPick
}: {
  matches: string[];
  onPick(path: string): void;
}) {
  return (
    <div role="dialog" aria-label="Ambiguous link">
      {matches.map((match) => (
        <button key={match} onClick={() => onPick(match)}>
          {match}
        </button>
      ))}
    </div>
  );
}
```

```tsx
// src/components/dialogs/create-note-dialog.tsx
export function CreateNoteDialog({
  label,
  onCreate
}: {
  label: string;
  onCreate(): void;
}) {
  return (
    <div role="dialog" aria-label="Create linked note">
      <p>Create note for {label}?</p>
      <button onClick={onCreate}>Create note</button>
    </div>
  );
}
```

- [ ] **Step 7: Run the unit tests and app integration tests**

Run: `npm test -- src/lib/links/wiki-links.test.ts src/lib/links/link-resolution.test.ts src/components/app.integration.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: add markdown and wiki link navigation"
```

## Task 7: Add Vault Watching, Conflict Handling, And End-To-End Coverage

**Files:**
- Create: `src/components/dialogs/conflict-dialog.tsx`
- Create: `tests/e2e/vault-workflow.spec.ts`
- Modify: `electron/ipc/filesystem.ts`
- Modify: `src/state/app-state.tsx`
- Modify: `src/App.tsx`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Write the failing conflict-handling integration test**

```tsx
// src/components/app.integration.test.tsx
test('shows a conflict warning when the open note changes externally while dirty', async () => {
  render(<App />);
  expect(screen.queryByText(/file changed on disk/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the conflict test to verify it fails**

Run: `npm test -- src/components/app.integration.test.tsx`
Expected: FAIL because no conflict UI exists yet

- [ ] **Step 3: Add file watching in the Electron process**

```ts
// electron/ipc/filesystem.ts
import chokidar, { type FSWatcher } from 'chokidar';
import { BrowserWindow, ipcMain } from 'electron';

const watchers = new Map<string, FSWatcher>();

ipcMain.handle('vault:watch', async (_event, rootPath: string) => {
  if (watchers.has(rootPath)) return;

  const watcher = chokidar.watch(rootPath, {
    ignoreInitial: true,
    depth: 10
  });

  watcher.on('all', (eventName, changedPath) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('vault:changed', {
        eventName,
        path: changedPath
      });
    }
  });

  watchers.set(rootPath, watcher);
});
```

- [ ] **Step 4: Expose watcher events in preload and app state**

```ts
// electron/preload.ts
onVaultChanged: (listener) => {
  const wrapped = (_event, payload) => listener(payload);
  ipcRenderer.on('vault:changed', wrapped);
  return () => ipcRenderer.off('vault:changed', wrapped);
}
```

```tsx
// src/state/app-state.tsx
type AppStateValue = {
  hasConflict: boolean;
  markConflict(): void;
  clearConflict(): void;
};
```

- [ ] **Step 5: Render the conflict dialog and refresh behavior**

```tsx
// src/components/dialogs/conflict-dialog.tsx
export function ConflictDialog({
  onReload,
  onKeepMine
}: {
  onReload(): void;
  onKeepMine(): void;
}) {
  return (
    <div role="dialog" aria-label="File changed on disk">
      <p>File changed on disk while you have unsaved edits.</p>
      <button onClick={onReload}>Reload from disk</button>
      <button onClick={onKeepMine}>Keep my edits</button>
    </div>
  );
}
```

- [ ] **Step 6: Add the end-to-end vault workflow test**

```ts
// tests/e2e/vault-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('opens a vault, edits a note, and saves it', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByText('Open Vault')).toBeVisible();
});
```

- [ ] **Step 7: Run full verification**

Run: `npm test`
Expected: PASS for all unit and integration tests

Run: `npm run test:e2e`
Expected: PASS for the basic vault workflow

Run: `npm run build`
Expected: renderer and Electron bundles compile without TypeScript errors

- [ ] **Step 8: Commit**

```bash
git add electron src tests playwright.config.ts
git commit -m "feat: add vault watching and conflict handling"
```

## Self-Review

### Spec Coverage Check

- Open vault folder: covered in Task 4
- Show folder tree: covered in Tasks 3 and 4
- Create, rename, delete files/folders: covered in Task 3 and wired into the sidebar in Task 4
- Open and edit one note: covered in Task 5
- Render live markdown preview: covered in Task 5
- Support markdown links and wiki links: covered in Task 6
- Navigate links from preview: covered in Task 6
- Detect external file changes and warn on conflicts: covered in Task 7

### Placeholder Scan

- No `TODO`, `TBD`, or deferred implementation markers remain in tasks
- Each code-bearing step includes concrete file targets and starter code
- Each verification step includes exact commands and expected outcomes

### Type Consistency Check

- `VaultNode`, `NoteDocument`, and `LinkResolution` are defined centrally in `src/lib/types.ts`
- `VaultApi` references those shared types directly
- The app state steps use `NoteDocument` and `VaultNode` consistently across later tasks
