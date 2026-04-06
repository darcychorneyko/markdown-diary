# Markdown Vault Desktop Design

## Goal

Build a simplified Obsidian-like Windows desktop application for managing a local archive of markdown documents stored directly in a folder tree on disk. The app must let the user organize notes into folders, edit markdown as plain text, view rendered markdown, and navigate both standard markdown links and Obsidian-style wiki links.

## Product Scope

### In Scope

- Open a vault folder from the local filesystem
- Display the vault's folder and markdown file tree
- Create, rename, and delete markdown files and folders
- Open one markdown note at a time
- Edit note contents as raw markdown text
- Render the current note as markdown in a preview pane
- Support standard markdown links such as `[Note](folder/note.md)`
- Support wiki links such as `[[Note Name]]`
- Navigate links from the rendered preview
- Save edited content back to the source file on disk
- Detect external file changes and refresh the UI

### Out of Scope

- Full-text search
- Graph view, backlinks, tags, or note metadata panes
- Plugin system
- Cloud sync
- Mobile support
- Multiple open tabs
- Advanced rich-text editing
- Theme customization
- Embedded asset management beyond basic markdown rendering behavior

## Platform And Constraints

- Target platform: Windows only
- Storage model: plain `.md` files and folders on disk, with no database
- Editing model: split view with text editor and rendered preview shown together
- Link model: support both standard markdown links and wiki links
- Source of truth: the filesystem, not application state

## Technical Approach

Use Electron with a React and TypeScript renderer process.

Electron is the recommended fit for the first version because it offers straightforward Windows desktop packaging, stable filesystem integration, and a mature UI ecosystem for tree navigation, markdown editing, and preview rendering. The UI should remain in the renderer process, while filesystem operations should stay behind a preload bridge so the UI does not access Node APIs directly.

## Architecture

The application is a local desktop shell around a user-selected vault folder.

The user chooses a root folder on disk. The app reads the directory tree under that folder, displays it in a sidebar, and opens markdown files into the main workspace. The main workspace shows a split layout with the markdown source editor on the left and the rendered preview on the right.

Saving writes back to the same file on disk. The app does not maintain a separate content store. A small settings file may persist UI-level preferences such as the last-opened vault path, but note contents always come from the markdown files themselves.

Wiki links are resolved by scanning the vault for matching note filenames. Standard markdown links are treated as relative file paths. Clicking either style of link in the preview navigates to the target note when it resolves inside the vault.

## Components

### 1. Vault Manager

Responsibilities:

- Open and validate the selected vault folder
- Read the folder and file tree
- Load file contents from disk
- Save edited file contents back to disk
- Watch the vault for file additions, removals, renames, and content changes

Notes:

- Only markdown files need to be first-class note entries in the navigation tree
- Non-markdown files may be ignored in the first version unless needed for link rendering

### 2. Navigation Sidebar

Responsibilities:

- Display the vault folder structure
- Expand and collapse folders
- Select a note to open
- Create files and folders
- Rename files and folders
- Delete files and folders

Notes:

- The tree should reflect on-disk structure directly
- UI state such as expanded folders may live in memory and optionally in local settings

### 3. Editor Workspace

Responsibilities:

- Show plain-text markdown editing on the left
- Show rendered markdown preview on the right
- Keep preview synchronized with current in-memory text
- Track dirty state for unsaved edits

Notes:

- The first version should edit a single open note at a time
- Save can be explicit, auto-save on short debounce, or both; implementation should choose a predictable model and document it clearly

### 4. Link Resolver

Responsibilities:

- Parse standard markdown links from note content
- Parse wiki links from note content
- Resolve wiki links by note filename within the vault
- Report unresolved and ambiguous targets

Notes:

- For `[[Note Name]]`, the resolver should prefer exact filename matches without extension
- If multiple files match the same note title, the UI must not silently choose one

### 5. App State Layer

Responsibilities:

- Track current vault path
- Track selected and open note
- Track current editor contents and dirty state
- Coordinate tree updates, file operations, and preview navigation

Notes:

- This layer should be small and explicit
- File contents remain on disk; state only coordinates the current session

## Data Flow

1. User selects a vault folder.
2. Vault manager scans the folder tree and returns a structured view model for the sidebar.
3. User selects a markdown file.
4. Vault manager reads the file from disk.
5. App state stores the current note path and in-memory text.
6. The editor displays raw markdown text.
7. The preview renders markdown from the same in-memory text.
8. On save, the vault manager writes the current text back to disk.
9. File watchers detect external changes and trigger tree or note refresh behavior.
10. Clicking a link in preview asks the link resolver for a target and opens the matching note when resolution succeeds.

## Link Resolution Rules

### Standard Markdown Links

- Interpret links such as `[label](path/to/file.md)` as relative paths from the current note
- Resolve only local vault paths in the first version
- External URLs may render normally in preview but are outside the vault navigation model

### Wiki Links

- Support `[[Note Name]]` in the first version
- Resolve by matching `Note Name` to a markdown filename within the vault, ignoring the `.md` extension
- Prefer exact case-preserving filename match when available
- If no match exists, treat the link as unresolved
- If multiple matches exist, require the UI to surface a chooser or explicit ambiguity warning

## Error Handling

### Broken Links

- Broken links should remain visible in the preview
- Clicking a broken wiki link should offer to create a note with that title
- Broken standard markdown file links should be shown as unresolved and should not crash navigation

### Ambiguous Wiki Links

- When more than one file matches a wiki link target, the app must show a chooser or ambiguity dialog
- The app must not silently route to an arbitrary match

### External File Changes

- If the currently open file changes on disk and there are no unsaved local edits, reload it
- If the currently open file changes on disk while local unsaved edits exist, warn before overwriting in-memory content
- If a file is deleted externally, close it gracefully and notify the user

### Rendering Failures

- Malformed markdown must not break editing
- If preview rendering encounters an error, keep the editor usable and show a preview error state

### File Operation Failures

- Show clear errors for permissions issues, invalid filenames, failed renames, and failed saves
- Do not silently discard user edits after a failed save

## First-Version UX

- Start with a simple three-region layout: sidebar, editor, preview
- Let the user pick a vault on first launch
- Show the current file path or note title clearly
- Indicate unsaved changes visibly
- Keep interactions predictable and low-friction rather than feature-rich

## Testing Strategy

### Unit Tests

- Wiki link parsing
- Standard markdown link parsing
- Link resolution behavior for exact match, missing target, and ambiguous target
- File tree transformation logic
- Save and reload logic around file operations

### Integration Tests

- Open a vault and render the tree
- Open a note and display both source and preview
- Edit a note and save it back to disk
- Click a resolved link in preview and navigate to the target note
- Handle an external file change while the note is open

### Manual Verification

- Create, rename, and delete folders and files from the UI
- Edit a note with both markdown links and wiki links
- Confirm preview updates as text changes
- Confirm broken and ambiguous links behave as specified

## Open Implementation Choices

These are implementation details, not unresolved product requirements:

- Which React state library to use, if any
- Which code editor component to embed
- Whether save is explicit, debounced auto-save, or both
- Which markdown renderer to use

These choices should be made in the implementation plan with a bias toward the smallest dependable stack.

## Recommended Build Boundary

The initial deliverable should be a usable desktop app that can:

- open a vault,
- show a folder tree,
- open and edit one markdown note,
- render a live preview,
- save the note,
- and navigate standard plus wiki links.

That boundary is sufficient to validate the product direction before adding search, tabs, or any higher-level knowledge-management features.
