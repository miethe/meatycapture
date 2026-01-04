/**
 * MarkdownEditor Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkdownEditor } from '../MarkdownEditor';

describe('MarkdownEditor', () => {
  it('renders textarea with placeholder', () => {
    render(<MarkdownEditor value="" onChange={() => {}} placeholder="Enter markdown..." />);

    const textarea = screen.getByRole('textbox', { name: /markdown content/i });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('placeholder', 'Enter markdown...');
  });

  it('renders toolbar with all formatting buttons', () => {
    render(<MarkdownEditor value="" onChange={() => {}} />);

    const toolbar = screen.getByRole('toolbar', { name: /markdown formatting/i });
    expect(toolbar).toBeInTheDocument();

    // Check for all toolbar buttons by their aria-labels (using exact match to avoid conflicts)
    expect(screen.getByLabelText(/^Bold/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Italic/)).toBeInTheDocument();
    expect(screen.getByLabelText('Unordered list')).toBeInTheDocument();
    expect(screen.getByLabelText('Ordered list')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Insert link/)).toBeInTheDocument();
    expect(screen.getByLabelText('Inline code')).toBeInTheDocument();
    expect(screen.getByLabelText('Code block')).toBeInTheDocument();
  });

  it('displays current value in textarea', () => {
    render(<MarkdownEditor value="Hello **world**" onChange={() => {}} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Hello **world**');
  });

  it('calls onChange when textarea content changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<MarkdownEditor value="" onChange={handleChange} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello');

    expect(handleChange).toHaveBeenCalled();
  });

  it('disables textarea and buttons when disabled prop is true', () => {
    render(<MarkdownEditor value="" onChange={() => {}} disabled />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();

    const boldButton = screen.getByLabelText(/bold/i);
    expect(boldButton).toBeDisabled();
  });

  it('shows character count when maxLength is provided', () => {
    render(<MarkdownEditor value="Hello" onChange={() => {}} maxLength={100} />);

    expect(screen.getByText('5 / 100')).toBeInTheDocument();
  });

  it('does not show character count when maxLength is not provided', () => {
    render(<MarkdownEditor value="Hello" onChange={() => {}} />);

    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
  });

  describe('Bold formatting', () => {
    it('wraps selected text with ** when bold button is clicked', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="Hello world" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // Simulate text selection
      textarea.setSelectionRange(6, 11); // Select "world"

      const boldButton = screen.getByLabelText(/bold/i);
      fireEvent.click(boldButton);

      expect(handleChange).toHaveBeenCalledWith('Hello **world**');
    });

    it('inserts ** at cursor when no text is selected', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="Hello " onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // Position cursor at end
      textarea.setSelectionRange(6, 6);

      const boldButton = screen.getByLabelText(/bold/i);
      fireEvent.click(boldButton);

      expect(handleChange).toHaveBeenCalledWith('Hello ****');
    });
  });

  describe('Italic formatting', () => {
    it('wraps selected text with * when italic button is clicked', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="Hello world" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(6, 11);

      const italicButton = screen.getByLabelText(/italic/i);
      fireEvent.click(italicButton);

      expect(handleChange).toHaveBeenCalledWith('Hello *world*');
    });
  });

  describe('Unordered list formatting', () => {
    it('prefixes line with - when unordered list button is clicked', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="Item one" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 8);

      const listButton = screen.getByLabelText(/unordered list/i);
      fireEvent.click(listButton);

      expect(handleChange).toHaveBeenCalledWith('- Item one');
    });

    it('prefixes multiple lines with - for multi-line selection', () => {
      const handleChange = vi.fn();
      const multiLineValue = 'Item one\nItem two';
      render(<MarkdownEditor value={multiLineValue} onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, multiLineValue.length);

      const listButton = screen.getByLabelText('Unordered list');
      fireEvent.click(listButton);

      expect(handleChange).toHaveBeenCalledWith('- Item one\n- Item two');
    });
  });

  describe('Ordered list formatting', () => {
    it('prefixes lines with numbered list items', () => {
      const handleChange = vi.fn();
      const multiLineValue = 'First\nSecond\nThird';
      render(<MarkdownEditor value={multiLineValue} onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, multiLineValue.length);

      const listButton = screen.getByLabelText('Ordered list');
      fireEvent.click(listButton);

      expect(handleChange).toHaveBeenCalledWith('1. First\n2. Second\n3. Third');
    });
  });

  describe('Link formatting', () => {
    it('wraps selected text as link text when link button is clicked', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="Click here" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 10);

      const linkButton = screen.getByLabelText(/insert link/i);
      fireEvent.click(linkButton);

      expect(handleChange).toHaveBeenCalledWith('[Click here](url)');
    });

    it('inserts link template when no text is selected', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 0);

      const linkButton = screen.getByLabelText(/insert link/i);
      fireEvent.click(linkButton);

      expect(handleChange).toHaveBeenCalledWith('[link text](url)');
    });
  });

  describe('Inline code formatting', () => {
    it('wraps selected text with backticks when code button is clicked', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="const x = 1" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 11);

      const codeButton = screen.getByLabelText(/inline code/i);
      fireEvent.click(codeButton);

      expect(handleChange).toHaveBeenCalledWith('`const x = 1`');
    });
  });

  describe('Code block formatting', () => {
    it('wraps selected text with triple backticks', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="function test() {}" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 18);

      const codeBlockButton = screen.getByLabelText(/code block/i);
      fireEvent.click(codeBlockButton);

      expect(handleChange).toHaveBeenCalledWith('```\nfunction test() {}\n```');
    });
  });

  describe('Keyboard shortcuts', () => {
    it('applies bold formatting with Ctrl+B', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="test" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 4);

      fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });

      expect(handleChange).toHaveBeenCalledWith('**test**');
    });

    it('applies bold formatting with Cmd+B on Mac', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="test" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 4);

      fireEvent.keyDown(textarea, { key: 'b', metaKey: true });

      expect(handleChange).toHaveBeenCalledWith('**test**');
    });

    it('applies italic formatting with Ctrl+I', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="test" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 4);

      fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true });

      expect(handleChange).toHaveBeenCalledWith('*test*');
    });

    it('applies link formatting with Ctrl+K', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="link" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 4);

      fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });

      expect(handleChange).toHaveBeenCalledWith('[link](url)');
    });

    it('does not apply formatting without modifier key', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="test" onChange={handleChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 4);

      fireEvent.keyDown(textarea, { key: 'b' });

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('maxLength constraint', () => {
    it('prevents input exceeding maxLength', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<MarkdownEditor value="12345" onChange={handleChange} maxLength={5} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '6');

      // onChange should not be called with value exceeding maxLength
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1];
      if (lastCall) {
        expect(lastCall[0].length).toBeLessThanOrEqual(5);
      }
    });

    it('prevents formatting if it would exceed maxLength', () => {
      const handleChange = vi.fn();
      render(<MarkdownEditor value="test" onChange={handleChange} maxLength={5} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      textarea.setSelectionRange(0, 4);

      // Bold would add 4 characters (**test**), exceeding maxLength of 5
      const boldButton = screen.getByLabelText(/bold/i);
      fireEvent.click(boldButton);

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible toolbar', () => {
      render(<MarkdownEditor value="" onChange={() => {}} />);

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveAttribute('aria-label', 'Markdown formatting');
    });

    it('has accessible textarea', () => {
      render(<MarkdownEditor value="" onChange={() => {}} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label', 'Markdown content');
    });

    it('toolbar buttons have aria-labels', () => {
      render(<MarkdownEditor value="" onChange={() => {}} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('allows Tab navigation through toolbar', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor value="" onChange={() => {}} />);

      const boldButton = screen.getByLabelText(/bold/i);
      const italicButton = screen.getByLabelText(/italic/i);

      // Focus first button
      boldButton.focus();
      expect(document.activeElement).toBe(boldButton);

      // Tab to next button
      await user.tab();
      expect(document.activeElement).toBe(italicButton);
    });
  });

  describe('Custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(
        <MarkdownEditor value="" onChange={() => {}} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('markdown-editor');
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
