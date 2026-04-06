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
