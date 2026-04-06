import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownPreview({ value }: { value: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>;
}
