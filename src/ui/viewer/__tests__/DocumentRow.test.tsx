/**
 * DocumentRow Component Tests
 *
 * Tests for the document row component including archive status indicator,
 * tag display, expansion states, and kebab menu actions.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentRow } from '../DocumentRow';
import type { CatalogEntry } from '@core/catalog';
import type { RequestLogDoc } from '@core/models';

// Mock DocumentDetail component to simplify testing
vi.mock('../DocumentDetail', () => ({
  DocumentDetail: ({
    document,
    isLoading,
  }: {
    document: RequestLogDoc;
    isLoading: boolean;
    docPath?: string;
  }) => (
    <div data-testid="document-detail" data-loading={isLoading}>
      Document Detail: {document.doc_id}
    </div>
  ),
}));

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

// Mock full document for testing
const createMockDocument = (overrides: Partial<RequestLogDoc> = {}): RequestLogDoc => ({
  doc_id: 'REQ-20251231-test',
  title: 'Test Document',
  project_id: 'test-project',
  items: [],
  items_index: [],
  tags: [],
  item_count: 5,
  created_at: new Date('2025-12-31T09:00:00Z'),
  updated_at: new Date('2025-12-31T10:00:00Z'),
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

      // doc_id is now in the info button aria-label, not as visible text
      expect(
        screen.getByRole('button', { name: /Document ID: REQ-20251231-test/i })
      ).toBeInTheDocument();
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

      // Item count is now displayed as "X items" text
      expect(screen.getByText('5 items')).toBeInTheDocument();
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
            <DocumentRow {...defaultProps} onToggle={onToggle} onLoadDocument={onLoadDocument} />
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

    it('does not call onLoadDocument when already loading', async () => {
      const onLoadDocument = vi.fn();
      const onToggle = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <table>
          <tbody>
            <DocumentRow
              {...defaultProps}
              isLoading={true}
              onLoadDocument={onLoadDocument}
              onToggle={onToggle}
            />
          </tbody>
        </table>
      );

      const row = screen.getByRole('row');
      await user.click(row);

      // onToggle is called regardless, but onLoadDocument should not be
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onLoadDocument).not.toHaveBeenCalled();
    });

    it('does not call onLoadDocument when already expanded', async () => {
      const onLoadDocument = vi.fn();
      const onToggle = vi.fn();
      const user = userEvent.setup({ delay: null });

      const { container } = render(
        <table>
          <tbody>
            <DocumentRow
              {...defaultProps}
              isExpanded={true}
              onLoadDocument={onLoadDocument}
              onToggle={onToggle}
            />
          </tbody>
        </table>
      );

      // Get the main document row, not the detail row
      const row = container.querySelector('.viewer-document-row');
      await user.click(row!);

      // onToggle is called to collapse, but onLoadDocument should not be
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onLoadDocument).not.toHaveBeenCalled();
    });
  });

  describe('tags display', () => {
    it('shows placeholder when document is null', () => {
      const { container } = render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} document={null} />
          </tbody>
        </table>
      );

      // Should show placeholder when no document
      expect(container.querySelector('.doc-tags-placeholder')).toBeInTheDocument();
      expect(container.querySelector('.viewer-tags-wrapper')).not.toBeInTheDocument();
    });

    it('shows placeholder when document has empty tags array', () => {
      const document = createMockDocument({ tags: [] });
      const { container } = render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} document={document} />
          </tbody>
        </table>
      );

      // Should show placeholder when tags array is empty
      expect(container.querySelector('.doc-tags-placeholder')).toBeInTheDocument();
      expect(container.querySelector('.viewer-tags-wrapper')).not.toBeInTheDocument();
    });

    it('shows tags when document has tags', () => {
      const document = createMockDocument({ tags: ['ux', 'api', 'bug'] });
      const { container } = render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} document={document} />
          </tbody>
        </table>
      );

      // Should show tags wrapper with all tags
      expect(container.querySelector('.viewer-tags-wrapper')).toBeInTheDocument();
      expect(screen.getByText('ux')).toBeInTheDocument();
      expect(screen.getByText('api')).toBeInTheDocument();
      expect(screen.getByText('bug')).toBeInTheDocument();
    });

    it('shows first 3 tags with JS truncation and overflow indicator', () => {
      // Component uses MAX_VISIBLE_TAGS=3, then shows "+N" overflow badge
      const document = createMockDocument({
        tags: ['ux', 'api', 'bug', 'enhancement', 'review'],
      });
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} document={document} />
          </tbody>
        </table>
      );

      // Only first 3 tags should be in the DOM (MAX_VISIBLE_TAGS=3)
      expect(screen.getByText('ux')).toBeInTheDocument();
      expect(screen.getByText('api')).toBeInTheDocument();
      expect(screen.getByText('bug')).toBeInTheDocument();

      // Tags beyond the limit should NOT be rendered
      expect(screen.queryByText('enhancement')).not.toBeInTheDocument();
      expect(screen.queryByText('review')).not.toBeInTheDocument();

      // Overflow indicator shows remaining count
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('wraps tags with tooltip showing all tags', () => {
      const document = createMockDocument({ tags: ['ux', 'api', 'bug'] });
      const { container } = render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} document={document} />
          </tbody>
        </table>
      );

      // Tags should be wrapped in tooltip
      expect(container.querySelector('.tooltip-wrapper')).toBeInTheDocument();
    });
  });

  describe('date formatting', () => {
    it('shows "Today" for current day', () => {
      // Create a date that is today
      const today = new Date();
      today.setHours(8, 0, 0, 0);
      const entry = createMockEntry({
        updated_at: today,
      });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('shows "Yesterday" for previous day', () => {
      // Create a date that is yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(8, 0, 0, 0);
      const entry = createMockEntry({
        updated_at: yesterday,
      });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('shows "X days ago" for dates within a week', () => {
      // Create a date that is 3 days ago
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(8, 0, 0, 0);
      const entry = createMockEntry({
        updated_at: threeDaysAgo,
      });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      expect(screen.getByText('3 days ago')).toBeInTheDocument();
    });

    it('shows formatted date for dates older than a week', () => {
      // Create a date that is 11 days ago
      const elevenDaysAgo = new Date();
      elevenDaysAgo.setDate(elevenDaysAgo.getDate() - 11);
      elevenDaysAgo.setHours(8, 0, 0, 0);
      const entry = createMockEntry({
        updated_at: elevenDaysAgo,
      });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      // Should show localized date format
      const timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();
      // The exact format depends on locale, but should not be "X days ago"
      expect(screen.queryByText(/days ago/)).not.toBeInTheDocument();
    });
  });

  describe('expanded state with document', () => {
    it('shows DocumentDetail when expanded with document', () => {
      const document = createMockDocument();

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} isExpanded={true} document={document} />
          </tbody>
        </table>
      );

      expect(screen.getByTestId('document-detail')).toBeInTheDocument();
      expect(screen.getByText(/Document Detail:/)).toBeInTheDocument();
    });

    it('shows fallback placeholder when expanded without document', () => {
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} isExpanded={true} document={null} />
          </tbody>
        </table>
      );

      expect(screen.getByText('Failed to load document')).toBeInTheDocument();
      expect(screen.getByText(/Path:/)).toBeInTheDocument();
    });

    it('passes isLoading to DocumentDetail', () => {
      const document = createMockDocument();

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} isExpanded={true} document={document} isLoading={true} />
          </tbody>
        </table>
      );

      const detail = screen.getByTestId('document-detail');
      expect(detail).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('kebab menu', () => {
    it('renders kebab menu in document row', () => {
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} />
          </tbody>
        </table>
      );

      expect(screen.getByRole('button', { name: /actions for document/i })).toBeInTheDocument();
    });

    it('opens kebab menu on click', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} />
          </tbody>
        </table>
      );

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Add Item' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Edit Document' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Archive Document' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Delete Document' })).toBeInTheDocument();
    });

    it('shows Unarchive for archived documents', async () => {
      const user = userEvent.setup({ delay: null });
      const entry = createMockEntry({ archived: true });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      expect(screen.getByRole('menuitem', { name: 'Unarchive Document' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Archive Document' })).not.toBeInTheDocument();
    });

    it('clicking kebab menu does not toggle row expansion', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} onToggle={onToggle} />
          </tbody>
        </table>
      );

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      expect(onToggle).not.toHaveBeenCalled();
    });

    it('calls onAddItem callback when provided', async () => {
      const onAddItem = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} onAddItem={onAddItem} />
          </tbody>
        </table>
      );

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const addItemMenuItem = screen.getByRole('menuitem', { name: 'Add Item' });
      await user.click(addItemMenuItem);

      expect(onAddItem).toHaveBeenCalledTimes(1);
    });

    it('logs to console when Add Item clicked without onAddItem callback', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const user = userEvent.setup({ delay: null });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} />
          </tbody>
        </table>
      );

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const addItemMenuItem = screen.getByRole('menuitem', { name: 'Add Item' });
      await user.click(addItemMenuItem);

      expect(consoleSpy).toHaveBeenCalledWith('Add Item clicked for:', 'REQ-20251231-test');
      consoleSpy.mockRestore();
    });

    it('logs to console when Edit clicked', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const user = userEvent.setup({ delay: null });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} />
          </tbody>
        </table>
      );

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const editMenuItem = screen.getByRole('menuitem', { name: 'Edit Document' });
      await user.click(editMenuItem);

      expect(consoleSpy).toHaveBeenCalledWith('Edit clicked for:', 'REQ-20251231-test');
      consoleSpy.mockRestore();
    });

    it('logs to console when Archive clicked', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const user = userEvent.setup({ delay: null });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} />
          </tbody>
        </table>
      );

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const archiveMenuItem = screen.getByRole('menuitem', { name: 'Archive Document' });
      await user.click(archiveMenuItem);

      expect(consoleSpy).toHaveBeenCalledWith('Archive clicked for:', 'REQ-20251231-test');
      consoleSpy.mockRestore();
    });

    it('logs to console when Unarchive clicked for archived document', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const user = userEvent.setup({ delay: null });
      const entry = createMockEntry({ archived: true });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} entry={entry} />
          </tbody>
        </table>
      );

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const unarchiveMenuItem = screen.getByRole('menuitem', { name: 'Unarchive Document' });
      await user.click(unarchiveMenuItem);

      expect(consoleSpy).toHaveBeenCalledWith('Unarchive clicked for:', 'REQ-20251231-test');
      consoleSpy.mockRestore();
    });

    it('logs to console when Delete clicked', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const user = userEvent.setup({ delay: null });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} />
          </tbody>
        </table>
      );

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const deleteMenuItem = screen.getByRole('menuitem', { name: 'Delete Document' });
      await user.click(deleteMenuItem);

      expect(consoleSpy).toHaveBeenCalledWith('Delete clicked for:', 'REQ-20251231-test');
      consoleSpy.mockRestore();
    });
  });

  describe('keyboard navigation', () => {
    it('ignores non-Enter keys', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup({ delay: null });

      const { container } = render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} onToggle={onToggle} />
          </tbody>
        </table>
      );

      const row = container.querySelector('.viewer-document-row') as HTMLElement;
      row.focus();
      await user.keyboard('{ArrowDown}');
      await user.keyboard('a');

      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('expand button', () => {
    it('has correct aria-label when collapsed', () => {
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} isExpanded={false} />
          </tbody>
        </table>
      );

      const expandButton = screen.getByRole('button', { name: 'Expand row' });
      expect(expandButton).toBeInTheDocument();
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('has correct aria-label when expanded', () => {
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} isExpanded={true} />
          </tbody>
        </table>
      );

      const collapseButton = screen.getByRole('button', { name: 'Collapse row' });
      expect(collapseButton).toBeInTheDocument();
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('expands row when expand button is clicked', async () => {
      const onToggle = vi.fn();
      const onLoadDocument = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} onToggle={onToggle} onLoadDocument={onLoadDocument} />
          </tbody>
        </table>
      );

      const expandButton = screen.getByRole('button', { name: 'Expand row' });
      await user.click(expandButton);

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onLoadDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('row is focusable via tabindex', () => {
      const { container } = render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} />
          </tbody>
        </table>
      );

      const row = container.querySelector('.viewer-document-row');
      expect(row).toHaveAttribute('tabindex', '0');
    });

    it('has correct role attributes', () => {
      render(
        <table>
          <tbody>
            <DocumentRow {...defaultProps} />
          </tbody>
        </table>
      );

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);

      const cells = screen.getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
    });
  });
});
