# Pane Resizing And Vault Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mouse-driven resizable vault, editor, and preview panes, with vault collapse redistributing width equally to the remaining panes and restore consuming width equally from them.

**Architecture:** Keep layout ownership inside `src/components/layout/shell.tsx`. The shell will own pane-width state, collapse state, and pointer-drag state, and will render explicit splitter handles between panels. CSS will switch from fixed column fractions to state-driven grid columns while preserving independent scrolling inside each pane.

**Tech Stack:** React 19, TypeScript, Testing Library, Vitest, CSS Grid

---

## File Structure

- Modify: `src/components/layout/shell.tsx`
  Responsibility: own pane widths, collapse/expand redistribution, drag handlers, and render splitters.
- Modify: `src/styles/app.css`
  Responsibility: style splitter handles, state-driven grid columns, hidden vault state, and pane overflow behavior.
- Modify: `src/components/app.integration.test.tsx`
  Responsibility: cover collapse/expand width redistribution and mouse-driven splitter resizing.

### Task 1: Add Failing Integration Coverage For Resizing And Width Redistribution

**Files:**
- Modify: `src/components/app.integration.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add these tests near the existing sidebar-collapse coverage:

```tsx
test('collapsing the vault shares its width equally with editor and preview', async () => {
  window.vaultApi = createVaultApi();

  render(<App />);

  const shell = screen.getByRole('main', { name: /markdown vault workspace/i });
  const toggle = screen.getByRole('button', { name: 'Collapse vault sidebar' });

  expect(shell).toHaveStyle({
    gridTemplateColumns: '280px 8px 1fr 8px 1fr'
  });

  await userEvent.click(toggle);

  expect(shell).toHaveStyle({
    gridTemplateColumns: '0px 0px 1fr 8px 1fr'
  });
});

test('expanding the vault restores it and takes space equally from editor and preview', async () => {
  window.vaultApi = createVaultApi();

  render(<App />);

  const shell = screen.getByRole('main', { name: /markdown vault workspace/i });
  const collapse = screen.getByRole('button', { name: 'Collapse vault sidebar' });
  await userEvent.click(collapse);

  await userEvent.click(screen.getByRole('button', { name: 'Expand vault sidebar' }));

  expect(shell).toHaveStyle({
    gridTemplateColumns: '280px 8px 1fr 8px 1fr'
  });
});

test('dragging the left splitter resizes only the vault and editor panes', async () => {
  window.vaultApi = createVaultApi();

  render(<App />);

  const shell = screen.getByRole('main', { name: /markdown vault workspace/i });
  const leftSplitter = screen.getByRole('separator', { name: 'Resize vault and editor' });

  fireEvent.pointerDown(leftSplitter, { clientX: 280 });
  fireEvent.pointerMove(window, { clientX: 340 });
  fireEvent.pointerUp(window);

  expect(shell.style.gridTemplateColumns).toContain('340px 8px');
});

test('dragging the right splitter resizes only the editor and preview panes', async () => {
  window.vaultApi = createVaultApi();

  render(<App />);

  const shell = screen.getByRole('main', { name: /markdown vault workspace/i });
  const rightSplitter = screen.getByRole('separator', { name: 'Resize editor and preview' });

  fireEvent.pointerDown(rightSplitter, { clientX: 700 });
  fireEvent.pointerMove(window, { clientX: 760 });
  fireEvent.pointerUp(window);

  expect(shell.style.gridTemplateColumns).toContain('8px');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/app.integration.test.tsx`

Expected: FAIL because the shell does not yet render `separator` handles or a state-driven `gridTemplateColumns` string for resizable panes.

- [ ] **Step 3: Commit**

```bash
git add src/components/app.integration.test.tsx
git commit -m "test: cover pane resizing behavior"
```

### Task 2: Implement Shell Width State And Collapse Redistribution

**Files:**
- Modify: `src/components/layout/shell.tsx`

- [ ] **Step 1: Write the failing implementation target in the shell**

Replace the current fixed-state shell with a width-driven shell structure like this:

```tsx
import { useMemo, useRef, useState } from 'react';

const DEFAULT_SIDEBAR_WIDTH = 280;
const DEFAULT_SPLITTER_WIDTH = 8;
const MIN_SIDEBAR_WIDTH = 180;
const MIN_CONTENT_WIDTH = 240;

type DragTarget = 'sidebar-editor' | 'editor-preview';

type DragState = {
  target: DragTarget;
  startX: number;
  startSidebarWidth: number;
  startEditorWidth: number;
  startPreviewWidth: number;
} | null;
```

and:

```tsx
const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
const [editorWidth, setEditorWidth] = useState<number | null>(null);
const [previewWidth, setPreviewWidth] = useState<number | null>(null);
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
const [lastExpandedSidebarWidth, setLastExpandedSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
const [dragState, setDragState] = useState<DragState>(null);
const shellRef = useRef<HTMLElement | null>(null);
```

- [ ] **Step 2: Implement equal redistribution helpers**

Add helper functions above `Shell`:

```tsx
function splitEvenly(width: number) {
  const left = Math.floor(width / 2);
  return { left, right: width - left };
}

function clampWidth(width: number, minimum: number) {
  return Math.max(width, minimum);
}
```

and collapse/expand logic like:

```tsx
function handleToggleSidebar() {
  if (isSidebarCollapsed) {
    const restoredSidebarWidth = lastExpandedSidebarWidth;
    const { left, right } = splitEvenly(restoredSidebarWidth);

    setSidebarWidth(restoredSidebarWidth);
    setEditorWidth((current) => Math.max(MIN_CONTENT_WIDTH, (current ?? 0) - left));
    setPreviewWidth((current) => Math.max(MIN_CONTENT_WIDTH, (current ?? 0) - right));
    setIsSidebarCollapsed(false);
    return;
  }

  const freedWidth = sidebarWidth;
  const { left, right } = splitEvenly(freedWidth);
  setLastExpandedSidebarWidth(sidebarWidth);
  setSidebarWidth(0);
  setEditorWidth((current) => (current ?? 0) + left);
  setPreviewWidth((current) => (current ?? 0) + right);
  setIsSidebarCollapsed(true);
}
```

- [ ] **Step 3: Implement state-driven columns and splitters**

Render the shell like this:

```tsx
const gridTemplateColumns = useMemo(() => {
  const sidebarColumn = isSidebarCollapsed ? '0px' : `${sidebarWidth}px`;
  const leftSplitter = isSidebarCollapsed ? '0px' : `${DEFAULT_SPLITTER_WIDTH}px`;
  const editorColumn = editorWidth ? `${editorWidth}px` : '1fr';
  const rightSplitter = `${DEFAULT_SPLITTER_WIDTH}px`;
  const previewColumn = previewWidth ? `${previewWidth}px` : '1fr';

  return `${sidebarColumn} ${leftSplitter} ${editorColumn} ${rightSplitter} ${previewColumn}`;
}, [editorWidth, isSidebarCollapsed, previewWidth, sidebarWidth]);
```

and:

```tsx
<main
  ref={shellRef}
  className={`app-shell${isSidebarCollapsed ? ' app-shell-sidebar-collapsed' : ''}`}
  aria-label="Markdown vault workspace"
  style={{ gridTemplateColumns }}
>
  <header className="app-toolbar">
    <button
      type="button"
      className="sidebar-toggle"
      aria-expanded={!isSidebarCollapsed}
      aria-controls="vault-sidebar"
      aria-label={isSidebarCollapsed ? 'Expand vault sidebar' : 'Collapse vault sidebar'}
      onClick={handleToggleSidebar}
    >
      <span aria-hidden="true">{isSidebarCollapsed ? '▸' : '◂'}</span>
    </button>
  </header>
  <aside id="vault-sidebar" className={`sidebar${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`} aria-label="Vault explorer">
    {sidebar}
  </aside>
  <div
    className="pane-splitter"
    role="separator"
    aria-label="Resize vault and editor"
    onPointerDown={(event) => {
      setDragState({
        target: 'sidebar-editor',
        startX: event.clientX,
        startSidebarWidth: sidebarWidth,
        startEditorWidth: editorWidth ?? 0,
        startPreviewWidth: previewWidth ?? 0
      });
    }}
  />
  <section className="editor">{editor}</section>
  <div
    className="pane-splitter"
    role="separator"
    aria-label="Resize editor and preview"
    onPointerDown={(event) => {
      setDragState({
        target: 'editor-preview',
        startX: event.clientX,
        startSidebarWidth: sidebarWidth,
        startEditorWidth: editorWidth ?? 0,
        startPreviewWidth: previewWidth ?? 0
      });
    }}
  />
  <section className="preview">{preview}</section>
</main>
```

- [ ] **Step 4: Run test to verify partial behavior passes**

Run: `npm test -- src/components/app.integration.test.tsx`

Expected: the new collapse/expand layout assertions pass, but drag tests may still fail until pointer-move logic is added.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/shell.tsx
git commit -m "feat: add pane width state to shell"
```

### Task 3: Add Pointer Dragging And Width Clamping

**Files:**
- Modify: `src/components/layout/shell.tsx`

- [ ] **Step 1: Write the failing drag logic target**

Add an effect that reacts to `dragState`:

```tsx
useEffect(() => {
  if (!dragState) {
    return;
  }

  function handlePointerMove(event: PointerEvent) {
    const delta = event.clientX - dragState.startX;

    if (dragState.target === 'sidebar-editor') {
      const nextSidebarWidth = clampWidth(
        dragState.startSidebarWidth + delta,
        MIN_SIDEBAR_WIDTH
      );
      const sidebarDelta = nextSidebarWidth - dragState.startSidebarWidth;
      const nextEditorWidth = clampWidth(
        dragState.startEditorWidth - sidebarDelta,
        MIN_CONTENT_WIDTH
      );

      setSidebarWidth(nextSidebarWidth);
      setEditorWidth(nextEditorWidth);
      return;
    }

    const nextEditorWidth = clampWidth(
      dragState.startEditorWidth + delta,
      MIN_CONTENT_WIDTH
    );
    const editorDelta = nextEditorWidth - dragState.startEditorWidth;
    const nextPreviewWidth = clampWidth(
      dragState.startPreviewWidth - editorDelta,
      MIN_CONTENT_WIDTH
    );

    setEditorWidth(nextEditorWidth);
    setPreviewWidth(nextPreviewWidth);
  }

  function handlePointerUp() {
    setDragState(null);
  }

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp, { once: true });

  return () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };
}, [dragState]);
```

- [ ] **Step 2: Tighten clamp math so only adjacent panes move**

Refine the drag math to preserve the untouched pane:

```tsx
if (dragState.target === 'sidebar-editor') {
  const rawSidebarWidth = dragState.startSidebarWidth + delta;
  const nextSidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, rawSidebarWidth);
  const actualDelta = nextSidebarWidth - dragState.startSidebarWidth;
  const nextEditorWidth = Math.max(MIN_CONTENT_WIDTH, dragState.startEditorWidth - actualDelta);

  setSidebarWidth(nextSidebarWidth);
  setEditorWidth(nextEditorWidth);
  setPreviewWidth(dragState.startPreviewWidth);
  return;
}
```

and:

```tsx
const rawEditorWidth = dragState.startEditorWidth + delta;
const nextEditorWidth = Math.max(MIN_CONTENT_WIDTH, rawEditorWidth);
const actualDelta = nextEditorWidth - dragState.startEditorWidth;
const nextPreviewWidth = Math.max(MIN_CONTENT_WIDTH, dragState.startPreviewWidth - actualDelta);

setSidebarWidth(dragState.startSidebarWidth);
setEditorWidth(nextEditorWidth);
setPreviewWidth(nextPreviewWidth);
```

- [ ] **Step 3: Run test to verify drag behavior passes**

Run: `npm test -- src/components/app.integration.test.tsx`

Expected: PASS, including the new splitter drag tests.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/shell.tsx
git commit -m "feat: add mouse resizing for adjacent panes"
```

### Task 4: Style Splitters And Hidden Sidebar Layout

**Files:**
- Modify: `src/styles/app.css`

- [ ] **Step 1: Write the failing CSS target**

Add splitter styles:

```css
.pane-splitter {
  width: 8px;
  cursor: col-resize;
  background: #e5e7eb;
}

.pane-splitter:hover {
  background: #cbd5e1;
}

.app-shell-sidebar-collapsed .pane-splitter:first-of-type {
  width: 0;
}
```

and update the shell layout away from hard-coded fixed columns:

```css
.app-shell {
  display: grid;
  grid-template-areas:
    "toolbar toolbar toolbar toolbar toolbar"
    "sidebar leftsplit editor rightsplit preview";
}

.sidebar {
  grid-area: sidebar;
}

.editor {
  grid-area: editor;
}

.preview {
  grid-area: preview;
}
```

- [ ] **Step 2: Implement the actual CSS**

Use these selectors:

```css
.app-shell {
  display: grid;
  grid-template-areas:
    "toolbar toolbar toolbar toolbar toolbar"
    "sidebar leftsplit editor rightsplit preview";
  grid-template-rows: auto 1fr;
  height: 100vh;
  overflow: hidden;
}

.pane-splitter {
  min-height: 0;
  background: #e5e7eb;
  cursor: col-resize;
}

.pane-splitter:hover {
  background: #cbd5e1;
}

.pane-splitter:first-of-type {
  grid-area: leftsplit;
}

.pane-splitter:last-of-type {
  grid-area: rightsplit;
}

.app-shell-sidebar-collapsed .sidebar {
  width: 0;
  padding: 0;
  border-right: 0;
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 3: Run test to verify visual layout hooks still pass**

Run: `npm test -- src/components/app.integration.test.tsx`

Expected: PASS, with existing editor/preview layout tests still green.

- [ ] **Step 4: Commit**

```bash
git add src/styles/app.css
git commit -m "style: add splitter layout for resizable panes"
```

### Task 5: Final Verification

**Files:**
- Modify: `src/components/layout/shell.tsx`
- Modify: `src/styles/app.css`
- Modify: `src/components/app.integration.test.tsx`

- [ ] **Step 1: Run the focused integration suite**

Run: `npm test -- src/components/app.integration.test.tsx`

Expected: PASS with all pane-resizing, collapse, explorer, editor, preview, and dialog tests green.

- [ ] **Step 2: Run the broader test suite**

Run: `npm test`

Expected: PASS for the repository test suite with no regressions introduced by shell layout changes.

- [ ] **Step 3: Manual verification**

Run the app and check:

```text
1. Drag the vault/editor splitter and confirm only those two panes change.
2. Drag the editor/preview splitter and confirm only those two panes change.
3. Collapse the vault and confirm editor and preview share the freed space equally.
4. Expand the vault and confirm editor and preview each give up equal space.
5. Confirm all three panes still scroll independently.
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/shell.tsx src/styles/app.css src/components/app.integration.test.tsx
git commit -m "feat: add resizable shell panes"
```

## Self-Review

- Spec coverage: covered mouse-only splitters, equal redistribution on collapse, equal consumption on restore, minimum-width clamping, hidden collapsed vault, and integration tests.
- Placeholder scan: no `TBD`, `TODO`, or deferred implementation notes remain.
- Type consistency: the plan uses a single `DragState` model, consistent pane-width state names, and the same splitter labels across tests and implementation.
