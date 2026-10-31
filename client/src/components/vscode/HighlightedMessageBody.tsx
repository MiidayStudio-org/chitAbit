import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  parseMessageLanguageAndContent,
  parseMessageSegments,
  getCachedHighlight,
  highlightMessage,
  MessageSegment,
} from '../../utils/shikiHighlighter';
import { CodeBlock } from './CodeBlock';

export interface HighlightedMessageBodyProps {
  rawContent: string;
  messageLanguage?: string;
  theme?: string;
  highlightAllMessages?: boolean;
  onAskBot?: (query: string) => void;
  isDraft?: boolean;
  isLightMode?: boolean;
}

const HighlightedTextSegment: React.FC<{
  text: string;
  lang: string;
  theme: string;
}> = ({ text, lang, theme }) => {
  const cached = getCachedHighlight(text, lang, theme);
  const [html, setHtml] = useState<string | null>(cached);

  useEffect(() => {
    let isCancelled = false;
    const current = getCachedHighlight(text, lang, theme);
    if (current) {
      setHtml(current);
      return;
    }

    highlightMessage(text, lang, theme).then((res) => {
      if (!isCancelled) {
        setHtml(res);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [text, lang, theme]);

  if (html) {
    return (
      <div
        className="shiki-message-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="shiki-message-body text-[var(--text)] font-mono whitespace-pre-wrap">
      {text}
    </div>
  );
};

export const HighlightedMessageBody: React.FC<HighlightedMessageBodyProps> = ({
  rawContent,
  messageLanguage = 'typescript',
  theme = 'dark-plus',
  highlightAllMessages = true,
  onAskBot,
  isDraft = false,
  isLightMode = false,
}) => {
  // Parse override tag (e.g. `py: print("hi")` or `sql: SELECT * FROM users`)
  const { lang, content: cleanContent } = useMemo(
    () => parseMessageLanguageAndContent(rawContent, messageLanguage),
    [rawContent, messageLanguage]
  );

  // If highlightAllMessages is toggled OFF:
  // Render normal text as standard Markdown/plain text, but preserve fenced code blocks with CodeBlock
  if (!highlightAllMessages) {
    return (
      <div className="text-[13px] leading-relaxed break-words text-[var(--text)] font-mono">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node: _node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              if (!inline && (match || String(children).includes('\n'))) {
                return (
                  <CodeBlock
                    language={match ? match[1] : ''}
                    code={String(children).replace(/\n$/, '')}
                    onAskBot={onAskBot}
                    isLightMode={isLightMode}
                    theme={theme}
                  />
                );
              }
              return (
                <code className="vscode-inline" {...props}>
                  {children}
                </code>
              );
            },
            a({ href, children }: any) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="vscode-link"
                >
                  {children}
                </a>
              );
            },
            p({ children }: any) {
              return <p className="my-0.5">{children}</p>;
            },
          }}
        >
          {cleanContent}
        </ReactMarkdown>
        {isDraft && (
          <span className="inline-block w-1.5 h-3.5 bg-[var(--accent)] animate-pulse align-middle ml-0.5" />
        )}
      </div>
    );
  }

  // Highlight all messages like code:
  // Split into text segments (token highlighted via Shiki in lang + theme) and fenced code blocks
  const segments: MessageSegment[] = useMemo(
    () => parseMessageSegments(cleanContent),
    [cleanContent]
  );

  return (
    <div className="text-[13px] leading-relaxed break-words">
      {segments.map((seg, idx) => {
        if (seg.type === 'code') {
          return (
            <CodeBlock
              key={`code-${idx}`}
              language={seg.lang || lang}
              code={seg.content.replace(/\n$/, '')}
              onAskBot={onAskBot}
              isLightMode={isLightMode}
              theme={theme}
            />
          );
        }

        return (
          <HighlightedTextSegment
            key={`text-${idx}-${seg.content.slice(0, 20)}`}
            text={seg.content}
            lang={lang}
            theme={theme}
          />
        );
      })}

      {/* Blinking cursor for ghost drafts */}
      {isDraft && (
        <span className="inline-block w-1.5 h-3.5 bg-[var(--accent)] animate-pulse align-middle ml-0.5" />
      )}
    </div>
  );
};
