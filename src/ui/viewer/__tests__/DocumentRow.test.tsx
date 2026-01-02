/**
 * DocumentRow Component Tests
 *
 * Tests for the document row component including archive status indicator.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentRow } from '../DocumentRow';
import type { CatalogEntry } from '@core/catalog';

// Mock catalog entry for testing
const createMockEntry = (overrides: Partial<CatalogEntry> = {}): CatalogEntry => ({
  path: '/test/path/REQ-20251231-test.md',
  doc_id: 'REQ-20251231-test',
  title: 'Test Document',
  item_count: 5,
  updated_at: new Date('2025-12-31T10:00:00Z'),
  project_id: 'test-project',
  project_name: 'Test Project',
  archived: false,
  ...overrides,
});


describe('DocumentRow', () => {
  const defaultProps = {
    entry: createMockEntry(),
    isExpanded: false,
    onToggle: vi.fn(),
    onLoadDocument: vi.fn(),
    isLoading: false,
    document: null,
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders document ID and title', () => {
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} />
          </tbody>
        </table>
      );

      expect(screen.getByText('REQ-20251231-test')).toBeInTheDocument();
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    it('renders item count', () => {
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} />
          </tbody>
        </table>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('archive status indicator', () => {
    it('does not show archived badge for non-archived documents', () => {
      const entry = createMockEntry({ archived: false });
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      expect(screen.queryByText('Archived')).not.toBeInTheDocument();
      expect(screen.queryByRole('status', { name: /archived/i })).not.toBeInTheDocument();
    });

    it('shows archived badge for archived documents', () => {
      const entry = createMockEntry({ archived: true });
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      expect(screen.getByText('Archived')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /archived document/i })).toBeInTheDocument();
    });

    it('applies archived class to row when document is archived', () => {
      const entry = createMockEntry({ archived: true });
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('row', { name: /REQ-20251231-test/i });
      expect(row).toHaveClass('archived');
    });

    it('does not apply archived class to row when document is not archived', () => {
      const entry = createMockEntry({ archived: false });
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('row', { name: /REQ-20251231-test/i });
      expect(row).not.toHaveClass('archived');
    });

    it('includes archived status in accessible label', () => {
      const entry = createMockEntry({ archived: true });
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('row');
      expect(row).toHaveAttribute('aria-label', expect.stringContaining('(Archived)'));
    });

    it('does not include archived in accessible label for non-archived documents', () => {
      const entry = createMockEntry({ archived: false });
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('row');
      expect(row.getAttribute('aria-label')).not.toContain('Archived');
    });

    it('archived badge has correct visual elements', () => {
      const entry = createMockEntry({ archived: true });
      const { container } = render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      const badge = container.querySelector('.doc-archived-badge');
      expect(badge).toBeInTheDocument();

      const icon = badge?.querySelector('.doc-archived-icon');
      expect(icon).toBeInTheDocument();

      const text = badge?.querySelector('.doc-archived-text');
      expect(text).toBeInTheDocument();
      expect(text).toHaveTextContent('Archived');
    });
  });

  describe('interaction', () => {
    it('calls onToggle and onLoadDocument when row is clicked', async () => {
      const onToggle = vi.fn();
      const onLoadDocument = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <table>
          <tbody>
            <DocumentRow
              {...defaultProps}
              onToggle={onToggle}
              onLoadDocument={onLoadDocument}
            />
          </tbody>
        </table>
      );

      const row = screen.getByRole('row');
      await user.click(row);

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onLoadDocument).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation with Enter key', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} onToggle={onToggle} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('row');
      row.focus();
      await user.keyboard('{Enter}');

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('expansion state', () => {
    it('applies expanded class when isExpanded is true', () => {
      const { container } = render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} isExpanded={true} />
          </tbody>
        </table>
      );

      // Get the document row (not the detail row)
      const documentRow = container.querySelector('.viewer-document-row');
      expect(documentRow).toHaveClass('expanded');
    });

    it('sets aria-expanded attribute correctly', () => {
      const { container, rerender } = render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} isExpanded={false} />
          </tbody>
        </table>
      );

      let documentRow = container.querySelector('.viewer-document-row');
      expect(documentRow).toHaveAttribute('aria-expanded', 'false');

      rerender(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} isExpanded={true} />
          </tbody>
        </table>
      );

      documentRow = container.querySelector('.viewer-document-row');
      expect(documentRow).toHaveAttribute('aria-expanded', 'true');
    });

    it('can be both expanded and archived', () => {
      const entry = createMockEntry({ archived: true });
      const { container } = render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} isExpanded={true} />
          </tbody>
        </table>
      );

      // Get the document row (not the detail row)
      const documentRow = container.querySelector('.viewer-document-row');
      expect(documentRow).toHaveClass('expanded');
      expect(documentRow).toHaveClass('archived');
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} isLoading={true} />
          </tbody>
        </table>
      );

      expect(screen.getByLabelText('Loading document')).toBeInTheDocument();
    });
  });
});
