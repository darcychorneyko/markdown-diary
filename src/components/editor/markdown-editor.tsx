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
      rows={20}
    />
  );
}
