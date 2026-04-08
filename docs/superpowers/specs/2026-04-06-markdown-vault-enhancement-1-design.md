# Markdown Vault Desktop Enhancement 1 Design

## Goal

Refine the current desktop app so it behaves more like a Windows note application: reopen the last vault on startup, move vault opening into the application menu, simplify explorer labels, replace inline explorer action buttons with native context menus, and make the editor fully fill its pane.

## Scope

### In Scope

- Restore and automatically open the last-used vault on startup when it still exists
- Move the `Open Vault` action from the sidebar into the Electron `File` menu
- Display note labels in the explorer without the `.md` extension
- Keep the explorer markdown-only
- Replace inline file and folder action buttons with native Electron context menus
- Add a native context menu for the vault root header with `New Note` and `New Folder`
- Add real create and rename prompts with text entry
- Make the note editor fill the full height and width of the editor pane

### Out of Scope

- Search, backlinks, tags, graph view, or other knowledge features
- Multi-select, drag-and-drop reordering, or bulk actions
- Rich editor upgrades beyond the current plain text area
- Full settings UI
- Custom-styled renderer menus instead of native Electron menus

## Product Behavior

### Startup

- On launch, the app asks the Electron settings layer for the last-used vault path
- If the saved path exists and can still be read, the app loads that vault automatically
- If the saved path is missing or invalid, the app starts in the empty state without showing an error
- Whenever the user opens a different vault, that path becomes the new saved last-used vault

### App Menu

- Add a `File` menu in the Electron main process
- `File > Open Vault` triggers the same vault-selection flow that the sidebar button used previously
- Remove the sidebar `Open Vault` button once the menu action exists

### Explorer Labels

- Notes remain backed by real `.md` files on disk
- The explorer shows note names without the `.md` extension
- Folder labels remain unchanged
- Internal path handling continues to use full real filenames

### Explorer Actions

- File and folder rows no longer render inline `Rename`, `Delete`, `New Note`, or `New Folder` buttons
- Right-clicking a note opens a native Electron context menu with note actions
- Right-clicking a folder opens a native Electron context menu with folder actions
- Right-clicking the vault root header opens a native Electron context menu with `New Note` and `New Folder`

### Prompt Behavior

- Native Electron menus trigger renderer dialogs for `Rename`, `New Note`, and `New Folder`
- Dialogs include text input plus confirm/cancel buttons
- New note names automatically gain a `.md` extension if omitted
- Folder names are used as entered
- Renaming a note preserves markdown file semantics
- Renaming a folder preserves folder semantics

### Editor Layout

- The editor pane becomes a full-height layout
- The text editor grows to the available width and height of the panel
- The note header and save button remain visible above the editor

## Architecture Changes

### Electron Main Process

Responsibilities added:

- Build and register the `File` app menu
- Expose the saved last-vault path
- Persist the selected vault path
- Show native context menus for notes, folders, and vault root
- Send menu actions back to the renderer through IPC events

### Renderer

Responsibilities added:

- Load the saved last vault on startup
- React to `Open Vault` menu commands
- React to context-menu commands from Electron
- Render prompt dialogs for create and rename flows
- Format note labels for display without changing stored paths

### Settings Storage

- Persist only lightweight app settings
- A single local setting for `lastVaultPath` is enough for this enhancement
- If a library is not needed, a small JSON-backed implementation in the Electron app data directory is acceptable

## Data Flow

### Last Vault Startup

1. Renderer starts.
2. Renderer requests the saved last vault path from preload.
3. Electron settings layer returns the stored path or `null`.
4. Renderer tries to load the vault tree if the path exists.
5. On success, the app state is initialized with that vault.
6. On failure, startup falls back to the empty state.

### Open Vault From File Menu

1. User clicks `File > Open Vault`.
2. Electron main process emits a renderer event for the open-vault action.
3. Renderer runs the existing choose-vault flow.
4. Renderer loads the tree and updates app state.
5. Renderer or settings IPC persists the chosen vault as `lastVaultPath`.

### Context Menu Actions

1. User right-clicks a note, folder, or the vault root header.
2. Renderer sends the target kind and path to Electron.
3. Electron builds and shows the native menu for that target.
4. User picks an action.
5. Electron emits a renderer command describing the action and target path.
6. Renderer opens a prompt dialog if the action needs user input, then runs the existing file operation flow.

## UI Boundaries

### Native Menus

- Top-level `File` menu
- Right-click context menus in the explorer

### Renderer Dialogs

- Rename note
- Rename folder
- Create note
- Create folder

This split keeps desktop interactions native while keeping text-entry flows easy to implement and test.

## Error Handling

### Saved Vault

- Missing or unreadable saved vault paths should not block startup
- The app should clear or overwrite stale saved paths the next time a valid vault is opened

### Create And Rename

- Empty names should be rejected in the renderer dialog before submitting
- Invalid filesystem names should surface the existing file operation error rather than failing silently
- If a target already exists, the operation should fail clearly and leave the current UI state intact

### Delete Of Active Note

- If the open note is deleted from a context-menu action, clear the active note and preview instead of leaving stale content selected

### Menu Events Without Vault

- Root-level create actions should do nothing when no vault is open
- Context menu requests for stale paths should fail safely and refresh the tree if needed

## Testing Strategy

### Integration Tests

- Restore the last vault automatically on startup
- Render note labels without `.md`
- Confirm inline explorer action buttons are gone
- Confirm prompt dialogs appear for create or rename actions
- Confirm deleting the active note clears the editor state

### Config And Runtime Tests

- Confirm the Electron menu includes `File > Open Vault`
- Confirm the settings bridge exposes last-vault read and write operations
- Confirm context-menu command events are exposed through preload

### Manual Verification

- Launch the app twice and verify the second launch reopens the previous vault
- Open the `File` menu and use `Open Vault`
- Right-click a note, folder, and vault root and verify the appropriate menu options appear
- Create and rename notes and folders using typed names
- Confirm the editor fills its pane with no unused interior space

## Implementation Slice

1. Add settings persistence for `lastVaultPath`
2. Add `File > Open Vault` app menu and menu event bridge
3. Add last-vault restore on startup
4. Format note labels without extensions
5. Add native explorer context menus and event bridge
6. Add renderer prompt dialogs for create and rename
7. Make the editor fill the panel
8. Verify with integration tests, e2e coverage as needed, and packaging/build checks
