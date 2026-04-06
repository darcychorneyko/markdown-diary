import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LinkRenderer } from './link-renderer.js';

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
      {value}
    </ReactMarkdown>
  );
}
