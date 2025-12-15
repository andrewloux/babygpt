import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import styles from './CodeBlock.module.css';

type CodeBlockProps = {
  filename?: string;
  children: React.ReactNode;
  lang?: string;
};

// Infer language from filename
const inferLang = (filename?: string): string => {
  if (!filename) return 'text';
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    py: 'python',
    js: 'javascript',
    ts: 'typescript',
    tsx: 'tsx',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'markdown',
    sh: 'bash',
    bash: 'bash',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
  };
  return langMap[ext || ''] || 'text';
};

export const CodeBlock = ({ filename, children, lang }: CodeBlockProps) => {
  const [html, setHtml] = useState<string | null>(null);
  const code = String(children).trim();
  const language = lang || inferLang(filename);

  useEffect(() => {
    let cancelled = false;

    codeToHtml(code, {
      lang: language,
      theme: 'github-dark',
    })
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        // Fallback to plain text on error
        if (!cancelled) setHtml(null);
      });

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <div className={styles.codeBlock}>
      {filename && <div className={styles.header}>{filename}</div>}
      {html ? (
        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className={styles.content}>{code}</pre>
      )}
    </div>
  );
};
