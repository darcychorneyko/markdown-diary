import { useState } from 'react';

export function Shell({
  sidebar,
  editor,
  preview
}: {
  sidebar: React.ReactNode;
  editor: React.ReactNode;
  preview: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <main
      className={`app-shell${isSidebarCollapsed ? ' app-shell-sidebar-collapsed' : ''}`}
      aria-label="Markdown vault workspace"
    >
      <header className="app-toolbar">
        <button
          type="button"
          className="sidebar-toggle"
          aria-expanded={!isSidebarCollapsed}
          aria-controls="vault-sidebar"
          aria-label={isSidebarCollapsed ? 'Expand vault sidebar' : 'Collapse vault sidebar'}
          onClick={() => {
            setIsSidebarCollapsed((currentValue) => !currentValue);
          }}
        >
          <span aria-hidden="true">{isSidebarCollapsed ? '▸' : '◂'}</span>
        </button>
      </header>
      <aside
        id="vault-sidebar"
        className={`sidebar${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}
        aria-label="Vault explorer"
      >
        {sidebar}
      </aside>
      <section className="editor">{editor}</section>
      <section className="preview">{preview}</section>
    </main>
  );
}
