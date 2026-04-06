export function ConflictDialog({
  onReload,
  onKeepMine
}: {
  onReload(): void;
  onKeepMine(): void;
}) {
  return (
    <div className="conflict-dialog" role="dialog" aria-label="File changed on disk">
      <p>File changed on disk while you have unsaved edits.</p>
      <button onClick={onReload}>Reload from disk</button>
      <button onClick={onKeepMine}>Keep my edits</button>
    </div>
  );
}
