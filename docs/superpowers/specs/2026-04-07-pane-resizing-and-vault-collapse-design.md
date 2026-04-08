# Pane Resizing And Vault Collapse Design

## Goal

Add mouse-driven pane resizing to the desktop shell so the vault, editor, and preview panels can be resized directly by dragging splitters, while preserving the existing vault collapse toggle and per-panel scrolling behavior.

## Scope

### In Scope

- Mouse-only resize handles between adjacent panels
- Independent resizing of vault, editor, and preview widths
- Vault collapse behavior that removes the vault panel from layout
- Equal redistribution of vault width to editor and preview when collapsing
- Equal subtraction from editor and preview when restoring the vault panel
- Minimum width clamping so resized panels remain usable
- Integration coverage for collapse/expand redistribution and drag resizing

### Out Of Scope

- Keyboard resizing
- Persisting pane widths across app restarts
- Touch input handling
- Arbitrary panel docking or rearrangement

## Current Context

The shell currently uses a three-column CSS grid with a top toolbar row. The vault sidebar can already be collapsed by a toolbar button, but panel widths are still effectively fixed by CSS. The tree, editor, and preview panes already have independent scroll containers and should keep that behavior.

## Recommended Approach

Store the three pane widths in `Shell` state and render explicit vertical splitter handles between adjacent panes.

This approach fits the current app because all layout responsibility already lives in the shell component. A small amount of pointer logic inside `Shell` is enough to support resizing without adding a library or fighting CSS grid defaults.

## Layout Model

The shell should manage three width values:

- `sidebarWidth`
- `editorWidth`
- `previewWidth`

These widths should be interpreted as pixel widths for the current window size.

The shell should also track:

- `isSidebarCollapsed`
- `lastExpandedSidebarWidth`
- active drag state identifying which splitter is being dragged and the starting widths

## Resize Behavior

There are two splitter handles:

- one between vault and editor
- one between editor and preview

Dragging a splitter updates only the two adjacent panes.

Rules:

- Dragging the left splitter changes vault and editor widths
- Dragging the right splitter changes editor and preview widths
- Preview width is unaffected by the left splitter
- Vault width is unaffected by the right splitter
- Every pane has a minimum width
- Width changes clamp so no pane drops below its minimum

## Collapse And Expand Rules

### Collapse Vault

When the vault is collapsed:

- Save the current non-zero vault width to `lastExpandedSidebarWidth`
- Set the vault width to `0`
- Add half of the freed width to editor
- Add half of the freed width to preview
- If the freed width is odd, give the remainder to preview

This keeps the remaining two panels balanced after the vault disappears.

### Expand Vault

When the vault is restored:

- Restore the vault width from `lastExpandedSidebarWidth`
- Subtract half of that width from editor
- Subtract half of that width from preview
- If equal subtraction would drive one pane below minimum width, clamp that pane and take the remaining subtraction from the other pane

This preserves the user’s last sidebar size while still sharing the cost of restoration equally across the remaining panes.

## Rendering Model

The shell should render:

- toolbar
- sidebar pane
- left splitter
- editor pane
- right splitter
- preview pane

The shell layout can remain CSS-grid-based, but the column list should be computed from state so the pane widths and splitter widths are explicit.

When the vault is collapsed:

- the sidebar column width should become `0`
- the left splitter should also become `0`
- the sidebar should not remain visible as a thin rail

## Interaction Details

- Splitter handles should use `col-resize`
- During a drag, pointer movement should continue resizing even if the cursor leaves the handle
- Pointer listeners should clean up on drag end
- Text selection during resize should be suppressed to avoid a broken drag feel

## Error Handling

- If the shell mounts before its width can be measured, initialize from reasonable defaults and reconcile after first layout
- If the app window is resized smaller than the total of current widths, widths should be normalized while honoring minimum widths
- If normalization cannot preserve all preferred widths, prioritize keeping each pane at minimum width before distributing remaining space

## Testing Strategy

### Integration Tests

- collapsing the vault redistributes the freed width equally to editor and preview
- expanding the vault consumes width equally from editor and preview
- dragging the left splitter resizes only vault and editor
- dragging the right splitter resizes only editor and preview
- collapsed vault keeps the sidebar hidden from layout

### Manual Verification

- drag both splitters through a wide range of positions
- collapse and expand after manual resizing
- resize the app window after manual resizing
- confirm each pane still scrolls independently

## Files Expected To Change

- `src/components/layout/shell.tsx`
- `src/styles/app.css`
- `src/components/app.integration.test.tsx`

## Design Check

This design stays focused on the current shell and does not introduce persistence, keyboard support, or layout presets. The behavior is consistent with the existing UI direction: direct manipulation for layout, clear collapse semantics for the vault pane, and independent scrolling inside each panel.
