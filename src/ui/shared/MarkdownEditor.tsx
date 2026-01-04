/**
 * MarkdownEditor Component
 *
 * A markdown editor with formatting toolbar and keyboard shortcut support.
 * Provides toolbar buttons for common markdown formatting operations.
 *
 * Accessibility:
 * - Toolbar supports arrow key navigation (WAI-ARIA toolbar pattern)
 * - Textarea has proper labeling via aria-labelledby
 * - Character count announced via aria-live
 * - Keyboard shortcuts documented in button labels
 */

import React, { useRef, useCallback, useState, useId } from 'react';
import './MarkdownEditor.css';

export interface MarkdownEditorProps {
  /** Current markdown content */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Maximum character length */
  maxLength?: number;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** ID for the label element that labels this editor (for aria-labelledby) */
  labelId?: string;
}

interface FormatAction {
  id: string;
  label: string;
  ariaLabel: string;
  icon: string;
  shortcut?: string;
  handler: (
    textarea: HTMLTextAreaElement,
    value: string
  ) => { newValue: string; cursorStart: number; cursorEnd: number };
}

/**
 * Insert markdown syntax around the current selection or at cursor position.
 */
function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  before: string,
  after: string = ''
): { newValue: string; cursorStart: number; cursorEnd: number } {
  const { selectionStart, selectionEnd } = textarea;
  const selectedText = value.substring(selectionStart, selectionEnd);

  const newValue =
    value.substring(0, selectionStart) +
    before +
    selectedText +
    after +
    value.substring(selectionEnd);

  // Position cursor after the inserted text (or select the wrapped text)
  const cursorStart = selectionStart + before.length;
  const cursorEnd = cursorStart + selectedText.length;

  return { newValue, cursorStart, cursorEnd };
}

/**
 * Prefix each line in selection with a string (for lists).
 */
function prefixLines(
  textarea: HTMLTextAreaElement,
  value: string,
  getPrefix: (lineIndex: number) => string
): { newValue: string; cursorStart: number; cursorEnd: number } {
  const { selectionStart, selectionEnd } = textarea;

  // Expand selection to full lines
  let lineStart = selectionStart;
  while (lineStart > 0 && value[lineStart - 1] !== '\n') {
    lineStart--;
  }

  let lineEnd = selectionEnd;
  while (lineEnd < value.length && value[lineEnd] !== '\n') {
    lineEnd++;
  }

  const selectedLines = value.substring(lineStart, lineEnd);
  const lines = selectedLines.split('\n');

  const prefixedLines = lines.map((line, index) => {
    const trimmed = line.trimStart();
    // Skip empty lines
    if (trimmed === '') return line;
    return getPrefix(index) + trimmed;
  });

  const newText = prefixedLines.join('\n');
  const newValue = value.substring(0, lineStart) + newText + value.substring(lineEnd);

  // Position cursor at end of modified text
  const cursorStart = lineStart;
  const cursorEnd = lineStart + newText.length;

  return { newValue, cursorStart, cursorEnd };
}

/**
 * Insert a link template at cursor position.
 */
function insertLink(
  textarea: HTMLTextAreaElement,
  value: string
): { newValue: string; cursorStart: number; cursorEnd: number } {
  const { selectionStart, selectionEnd } = textarea;
  const selectedText = value.substring(selectionStart, selectionEnd);

  let newText: string;
  let cursorStart: number;
  let cursorEnd: number;

  if (selectedText) {
    // Wrap selection as link text
    newText = `[${selectedText}](url)`;
    cursorStart = selectionStart + selectedText.length + 3; // Position at 'url'
    cursorEnd = cursorStart + 3;
  } else {
    // Insert template
    newText = '[link text](url)';
    cursorStart = selectionStart + 1; // Position at 'link text'
    cursorEnd = cursorStart + 9;
  }

  const newValue = value.substring(0, selectionStart) + newText + value.substring(selectionEnd);

  return { newValue, cursorStart, cursorEnd };
}

/**
 * Insert a code block around selection.
 */
function insertCodeBlock(
  textarea: HTMLTextAreaElement,
  value: string
): { newValue: string; cursorStart: number; cursorEnd: number } {
  const { selectionStart, selectionEnd } = textarea;
  const selectedText = value.substring(selectionStart, selectionEnd);

  // Determine if we need newlines before/after
  const needsNewlineBefore = selectionStart > 0 && value[selectionStart - 1] !== '\n';
  const needsNewlineAfter = selectionEnd < value.length && value[selectionEnd] !== '\n';

  const before = (needsNewlineBefore ? '\n' : '') + '```\n';
  const after = '\n```' + (needsNewlineAfter ? '\n' : '');

  const newText = before + selectedText + after;
  const newValue = value.substring(0, selectionStart) + newText + value.substring(selectionEnd);

  const cursorStart = selectionStart + before.length;
  const cursorEnd = cursorStart + selectedText.length;

  return { newValue, cursorStart, cursorEnd };
}

const FORMAT_ACTIONS: FormatAction[] = [
  {
    id: 'bold',
    label: 'B',
    ariaLabel: 'Bold (Cmd/Ctrl+B)',
    icon: 'B',
    shortcut: 'b',
    handler: (textarea, value) => wrapSelection(textarea, value, '**', '**'),
  },
  {
    id: 'italic',
    label: 'I',
    ariaLabel: 'Italic (Cmd/Ctrl+I)',
    icon: 'I',
    shortcut: 'i',
    handler: (textarea, value) => wrapSelection(textarea, value, '*', '*'),
  },
  {
    id: 'unordered-list',
    label: 'List',
    ariaLabel: 'Unordered list',
    icon: '\u2022', // bullet point
    handler: (textarea, value) => prefixLines(textarea, value, () => '- '),
  },
  {
    id: 'ordered-list',
    label: 'Numbered list',
    ariaLabel: 'Ordered list',
    icon: '1.',
    handler: (textarea, value) => prefixLines(textarea, value, (index) => `${index + 1}. `),
  },
  {
    id: 'link',
    label: 'Link',
    ariaLabel: 'Insert link (Cmd/Ctrl+K)',
    icon: '\uD83D\uDD17', // link emoji
    shortcut: 'k',
    handler: insertLink,
  },
  {
    id: 'inline-code',
    label: 'Code',
    ariaLabel: 'Inline code',
    icon: '</>',
    handler: (textarea, value) => wrapSelection(textarea, value, '`', '`'),
  },
  {
    id: 'code-block',
    label: 'Code block',
    ariaLabel: 'Code block',
    icon: '```',
    handler: insertCodeBlock,
  },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Enter markdown text...',
  maxLength,
  disabled = false,
  className = '',
  labelId,
}: MarkdownEditorProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(0);

  // Generate unique IDs for this instance
  const instanceId = useId();
  const textareaId = `markdown-editor-textarea-${instanceId}`;
  const charCountId = `markdown-editor-char-count-${instanceId}`;

  /**
   * Apply a format action and update the value.
   */
  const applyFormat = useCallback(
    (action: FormatAction) => {
      const textarea = textareaRef.current;
      if (!textarea || disabled) return;

      const { newValue, cursorStart, cursorEnd } = action.handler(textarea, value);

      // Check maxLength constraint
      if (maxLength && newValue.length > maxLength) {
        return;
      }

      onChange(newValue);

      // Restore focus and cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorStart, cursorEnd);
      });
    },
    [value, onChange, disabled, maxLength]
  );

  /**
   * Handle keyboard shortcuts in textarea.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isModKey = e.metaKey || e.ctrlKey;
      if (!isModKey) return;

      const action = FORMAT_ACTIONS.find(
        (a) => a.shortcut && a.shortcut.toLowerCase() === e.key.toLowerCase()
      );

      if (action) {
        e.preventDefault();
        applyFormat(action);
      }
    },
    [applyFormat]
  );

  /**
   * Handle toolbar keyboard navigation (arrow keys per WAI-ARIA toolbar pattern).
   */
  const handleToolbarKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const buttonCount = FORMAT_ACTIONS.length;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = (focusedButtonIndex + 1) % buttonCount;
          setFocusedButtonIndex(nextIndex);
          buttonRefs.current[nextIndex]?.focus();
          break;
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = (focusedButtonIndex - 1 + buttonCount) % buttonCount;
          setFocusedButtonIndex(prevIndex);
          buttonRefs.current[prevIndex]?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          setFocusedButtonIndex(0);
          buttonRefs.current[0]?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          const lastIndex = buttonCount - 1;
          setFocusedButtonIndex(lastIndex);
          buttonRefs.current[lastIndex]?.focus();
          break;
        }
      }
    },
    [focusedButtonIndex]
  );

  /**
   * Handle toolbar button clicks.
   */
  const handleToolbarClick = useCallback(
    (action: FormatAction, index: number) => {
      setFocusedButtonIndex(index);
      applyFormat(action);
    },
    [applyFormat]
  );

  /**
   * Handle textarea value changes.
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (maxLength && newValue.length > maxLength) {
        return;
      }
      onChange(newValue);
    },
    [onChange, maxLength]
  );

  // Build aria-labelledby value
  const ariaLabelledBy = labelId || undefined;

  return (
    <div className={`markdown-editor ${className}`}>
      {/* Toolbar with arrow key navigation */}
      <div
        ref={toolbarRef}
        className="markdown-editor-toolbar"
        role="toolbar"
        aria-label="Markdown formatting"
        aria-controls={textareaId}
        onKeyDown={handleToolbarKeyDown}
      >
        {FORMAT_ACTIONS.map((action, index) => (
          <button
            key={action.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            className={`markdown-editor-toolbar-btn ${action.id === 'bold' ? 'bold' : ''} ${action.id === 'italic' ? 'italic' : ''}`}
            aria-label={action.ariaLabel}
            onClick={() => handleToolbarClick(action, index)}
            disabled={disabled}
            tabIndex={index === focusedButtonIndex ? 0 : -1}
          >
            {action.icon}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        id={textareaId}
        ref={textareaRef}
        className="markdown-editor-textarea input-base"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        aria-label={ariaLabelledBy ? undefined : 'Markdown content'}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={maxLength ? charCountId : undefined}
      />

      {/* Character count (optional) */}
      {maxLength && (
        <div
          id={charCountId}
          className="markdown-editor-char-count"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="sr-only">Character count: </span>
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  );
}

export default MarkdownEditor;
