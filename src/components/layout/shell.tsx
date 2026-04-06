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
