import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LinkRenderer } from './link-renderer.js';

function convertWikiLinksToMarkdown(value: string) {
  return value.replace(/\[\[([^[\]]+)\]\]/g, (_match, label: string) => {
    const trimmed = label.trim();
    return `[${trimmed}](__wiki__/${encodeURIComponent(trimmed)})`;
  });
}

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
      {convertWikiLinksToMarkdown(value)}
    </ReactMarkdown>
  );
}
