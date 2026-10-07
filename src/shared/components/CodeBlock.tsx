import { CopyButton } from './CopyButton';

export function CodeBlock({ code, lang, title }: { code: string; lang: string; title?: string }) {
  return (
    <div className="code">
      <div className="codehead">
        <span>{title ?? lang}</span>
        <CopyButton text={code} />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
