/**
 * MobileDocCard Component Tests
 *
 * Tests for the mobile document card including archive status indicator.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileDocCard } from '../MobileDocCard';
import type { CatalogEntry } from '@core/catalog';

// Mock catalog entry for testing
const createMockEntry = (overrides: Partial<CatalogEntry> = {}): CatalogEntry => ({
  path: '/test/path/REQ-20251231-test.md',
  doc_id: 'REQ-20251231-test',
  title: 'Test Document Title',
  item_count: 5,
  updated_at: new Date('2025-12-31T10:00:00Z'),
  project_id: 'test-project',
  project_name: 'Test Project',
  archived: false,
  ...overrides,
});

describe('MobileDocCard', () => {
  const defaultProps = {
    entry: createMockEntry(),
    onTap: vi.fn(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders document ID and title', () => {
      render(<MobileDocCard {...defaultProps} />);

      expect(screen.getByText('REQ-20251231-test')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Test Document Title' })).toBeInTheDocument();
    });

    it('renders item count', () => {
      render(<MobileDocCard {...defaultProps} />);

      expect(screen.getByText('5 items')).toBeInTheDocument();
    });

    it('renders project name', () => {
      render(<MobileDocCard {...defaultProps} />);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('displays singular "item" for count of 1', () => {
      const entry = createMockEntry({ item_count: 1 });
      render(<MobileDocCard {...defaultProps} entry={entry} />);

      expect(screen.getByText('1 item')).toBeInTheDocument();
    });
  });

  describe('archive status indicator', () => {
    it('does not show archived badge for non-archived documents', () => {
      const entry = createMockEntry({ archived: false });
      render(<MobileDocCard {...defaultProps} entry={entry} />);

      expect(screen.queryByText('Archived')).not.toBeInTheDocument();
    });

    it('shows archived badge for archived documents', () => {
      const entry = createMockEntry({ archived: true });
      render(<MobileDocCard {...defaultProps} entry={entry} />);

      expect(screen.getByText('Archived')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /archived/i })).toBeInTheDocument();
    });

    it('applies archived class to card when document is archived', () => {
      const entry = createMockEntry({ archived: true });
      const { container } = render(<MobileDocCard {...defaultProps} entry={entry} />);

      const card = container.querySelector('.mobile-doc-card');
      expect(card).toHaveClass('mobile-doc-card--archived');
    });

    it('does not apply archived class to card when document is not archived', () => {
      const entry = createMockEntry({ archived: false });
      const { container } = render(<MobileDocCard {...defaultProps} entry={entry} />);

      const card = container.querySelector('.mobile-doc-card');
      expect(card).not.toHaveClass('mobile-doc-card--archived');
    });

    it('includes archived status in accessible label', () => {
      const entry = createMockEntry({ archived: true });
      render(<MobileDocCard {...defaultProps} entry={entry} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('(Archived)'));
    });

    it('does not include archived in accessible label for non-archived documents', () => {
      const entry = createMockEntry({ archived: false });
      render(<MobileDocCard {...defaultProps} entry={entry} />);

      const card = screen.getByRole('button');
      expect(card.getAttribute('aria-label')).not.toContain('Archived');
    });

    it('archived badge has correct CSS class', () => {
      const entry = createMockEntry({ archived: true });
      const { container } = render(<MobileDocCard {...defaultProps} entry={entry} />);

      const badge = container.querySelector('.mobile-doc-card__archived-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Archived');
    });
  });

  describe('interaction', () => {
    it('calls onTap when card is clicked', async () => {
      const onTap = vi.fn();
      const entry = createMockEntry();
      const user = userEvent.setup({ delay: null });

      render(<MobileDocCard entry={entry} onTap={onTap} />);

      const card = screen.getByRole('button');
      await user.click(card);

      expect(onTap).toHaveBeenCalledTimes(1);
      expect(onTap).toHaveBeenCalledWith(entry, expect.any(HTMLElement));
    });

    it('calls onTap when Enter key is pressed', async () => {
      const onTap = vi.fn();
      const entry = createMockEntry();
      const user = userEvent.setup({ delay: null });

      render(<MobileDocCard entry={entry} onTap={onTap} />);

      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Enter}');

      expect(onTap).toHaveBeenCalledTimes(1);
    });

    it('calls onTap when Space key is pressed', async () => {
      const onTap = vi.fn();
      const entry = createMockEntry();
      const user = userEvent.setup({ delay: null });

      render(<MobileDocCard entry={entry} onTap={onTap} />);

      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard(' ');

      expect(onTap).toHaveBeenCalledTimes(1);
    });
  });

  describe('selected state', () => {
    it('applies selected class when isSelected is true', () => {
      const { container } = render(<MobileDocCard {...defaultProps} isSelected={true} />);

      const card = container.querySelector('.mobile-doc-card');
      expect(card).toHaveClass('mobile-doc-card--selected');
    });

    it('does not apply selected class when isSelected is false', () => {
      const { container } = render(<MobileDocCard {...defaultProps} isSelected={false} />);

      const card = container.querySelector('.mobile-doc-card');
      expect(card).not.toHaveClass('mobile-doc-card--selected');
    });

    it('can be both selected and archived', () => {
      const entry = createMockEntry({ archived: true });
      const { container } = render(
        <MobileDocCard entry={entry} onTap={vi.fn()} isSelected={true} />
      );

      const card = container.querySelector('.mobile-doc-card');
      expect(card).toHaveClass('mobile-doc-card--selected');
      expect(card).toHaveClass('mobile-doc-card--archived');
    });
  });

  describe('accessibility', () => {
    it('has correct role and aria-pressed attributes', () => {
      render(<MobileDocCard {...defaultProps} isSelected={true} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-pressed', 'true');
    });

    it('is focusable with tabIndex', () => {
      render(<MobileDocCard {...defaultProps} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('has descriptive aria-label', () => {
      render(<MobileDocCard {...defaultProps} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('REQ-20251231-test'));
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Test Document Title'));
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('5 items'));
    });
  });
});
