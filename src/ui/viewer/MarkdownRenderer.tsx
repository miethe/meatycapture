/**
 * MarkdownRenderer Component
 *
 * Simple markdown renderer for item notes.
 * Supports basic markdown syntax without external dependencies.
 *
 * Features:
 * - **bold** text
 * - *italic* text
 * - [links](url)
 * - `inline code`
 * - ```code blocks```
 * - - unordered lists
 * - 1. ordered lists
 * - Sanitized output (no HTML injection)
 */

import React, { useMemo } from 'react';

export interface MarkdownRendererProps {
  /** Markdown content to render */
  content: string;

  /** Optional CSS class name */
  className?: string;
}

/**
 * MarkdownRenderer
 *
 * Renders markdown content with basic syntax support.
 * Uses regex-based parsing for lightweight implementation.
 *
 * @param props - MarkdownRendererProps
 * @returns Rendered markdown content
 */
export function MarkdownRenderer({
  content,
  className = '',
}: MarkdownRendererProps): React.JSX.Element {
  /**
   * Parse and render markdown content
   * Memoized to prevent unnecessary re-renders
   */
  const renderedContent = useMemo(() => {
    return parseMarkdown(content);
  }, [content]);

  return (
    <div className={`viewer-markdown ${className}`.trim()}>
      {renderedContent}
    </div>
  );
}

/**
 * Parse markdown content into React elements
 *
 * Processes markdown line by line and applies formatting.
 * Handles code blocks, lists, and inline formatting.
 *
 * @param markdown - Raw markdown string
 * @returns Array of React elements
 */
function parseMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' = 'ul';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    // Code block start/end
    if (line.trimStart().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <pre key={`code-${i}`} className="viewer-markdown-codeblock">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        inCodeBlock = false;
        codeBlockContent = [];
      } else {
        // Start code block
        inCodeBlock = true;
      }
      continue;
    }

    // Inside code block
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Unordered list item
    if (line.trimStart().match(/^[-*+]\s/)) {
      const content = line.trimStart().substring(2);
      if (!inList || listType !== 'ul') {
        // Flush previous list if different type
        if (inList && listItems.length > 0) {
          elements.push(
            listType === 'ul' ? (
              <ul key={`list-${i}`} className="viewer-markdown-list">
                {listItems}
              </ul>
            ) : (
              <ol key={`list-${i}`} className="viewer-markdown-list">
                {listItems}
              </ol>
            )
          );
          listItems = [];
        }
        inList = true;
        listType = 'ul';
      }
      listItems.push(
        <li key={`li-${i}`} className="viewer-markdown-list-item">
          {renderInline(content)}
        </li>
      );
      continue;
    }

    // Ordered list item
    if (line.trimStart().match(/^\d+\.\s/)) {
      const content = line.trimStart().replace(/^\d+\.\s/, '');
      if (!inList || listType !== 'ol') {
        // Flush previous list if different type
        if (inList && listItems.length > 0) {
          elements.push(
            listType === 'ul' ? (
              <ul key={`list-${i}`} className="viewer-markdown-list">
                {listItems}
              </ul>
            ) : (
              <ol key={`list-${i}`} className="viewer-markdown-list">
                {listItems}
              </ol>
            )
          );
          listItems = [];
        }
        inList = true;
        listType = 'ol';
      }
      listItems.push(
        <li key={`li-${i}`} className="viewer-markdown-list-item">
          {renderInline(content)}
        </li>
      );
      continue;
    }

    // Flush list if we're not in a list item anymore
    if (inList && line.trim() !== '') {
      elements.push(
        listType === 'ul' ? (
          <ul key={`list-${i}`} className="viewer-markdown-list">
            {listItems}
          </ul>
        ) : (
          <ol key={`list-${i}`} className="viewer-markdown-list">
            {listItems}
          </ol>
        )
      );
      listItems = [];
      inList = false;
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      elements.push(
        <HeadingTag key={`h${level}-${i}`} className={`viewer-markdown-h${level}`}>
          {renderInline(content)}
        </HeadingTag>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="viewer-markdown-paragraph">
        {renderInline(line)}
      </p>
    );
  }

  // Flush any remaining list
  if (inList && listItems.length > 0) {
    elements.push(
      listType === 'ul' ? (
        <ul key="list-final" className="viewer-markdown-list">
          {listItems}
        </ul>
      ) : (
        <ol key="list-final" className="viewer-markdown-list">
          {listItems}
        </ol>
      )
    );
  }

  return elements;
}

/**
 * Render inline markdown formatting
 *
 * Handles bold, italic, links, and inline code.
 *
 * @param text - Text with inline markdown
 * @returns React nodes with formatting applied
 */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code (highest priority to avoid conflicts)
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push(
        <code key={`code-${key++}`} className="viewer-markdown-code">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.substring(codeMatch[0].length);
      continue;
    }

    // Bold (**text**)
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      nodes.push(
        <strong key={`bold-${key++}`} className="viewer-markdown-bold">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    // Italic (*text*)
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      nodes.push(
        <em key={`italic-${key++}`} className="viewer-markdown-italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.substring(italicMatch[0].length);
      continue;
    }

    // Link ([text](url))
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch && linkMatch[1] && linkMatch[2]) {
      const linkText = linkMatch[1];
      const linkUrl = sanitizeUrl(linkMatch[2]);
      nodes.push(
        <a
          key={`link-${key++}`}
          href={linkUrl}
          className="viewer-markdown-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkText}
        </a>
      );
      remaining = remaining.substring(linkMatch[0].length);
      continue;
    }

    // Plain text (consume until next special character)
    const plainMatch = remaining.match(/^[^*`[]+/);
    if (plainMatch) {
      nodes.push(plainMatch[0]);
      remaining = remaining.substring(plainMatch[0].length);
      continue;
    }

    // Single character that didn't match anything
    nodes.push(remaining[0]);
    remaining = remaining.substring(1);
  }

  return nodes;
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or '#' if invalid
 */
function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '#';
  }
  return url.trim();
}

export default MarkdownRenderer;
