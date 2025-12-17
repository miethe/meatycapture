/**
 * Request Log Viewer Module
 *
 * Read-only catalog viewer for browsing and filtering request-log documents.
 *
 * This module provides a comprehensive UI for searching, filtering, and inspecting
 * request-log documents with multi-faceted filtering, sorting, and detailed views.
 *
 * @module @ui/viewer
 *
 * @example
 * ```tsx
 * import { ViewerContainer } from '@ui/viewer';
 * import { createProjectStore, createDocStore } from '@adapters/...';
 *
 * function App() {
 *   return (
 *     <ViewerContainer
 *       projectStore={createProjectStore()}
 *       docStore={createDocStore()}
 *     />
 *   );
 * }
 * ```
 *
 * ## Component Hierarchy
 *
 * ```
 * ViewerContainer (orchestration)
 * ├── DocumentFilters (filter controls)
 * │   ├── FilterDropdown (multi-select)
 * │   └── FilterBadge (active filter chip)
 * ├── DocumentCatalog (TanStack Table)
 * │   ├── ProjectGroupRow (collapsible header)
 * │   └── DocumentRow (expandable row)
 * │       └── DocumentDetail (expanded content)
 * │           ├── ItemCard (item display)
 * │           └── MarkdownRenderer (notes)
 * └── Loading/Error/Empty states
 * ```
 *
 * ## Features
 *
 * - **Multi-faceted Filtering**: Filter by project, type, domain, priority, status, tags, and text
 * - **Flexible Sorting**: Sort by document ID, title, item count, or update date
 * - **Project Grouping**: Documents organized by project with collapsible groups
 * - **Document Expansion**: Click rows to view full document details with all items
 * - **Text Search**: Type-ahead search across document titles and notes with debounce
 * - **Tag Autocomplete**: Suggestions based on available tags in catalog
 * - **Keyboard Navigation**: Full accessibility with arrow keys and Enter
 * - **Responsive Design**: Glass morphism styling for modern appearance
 * - **WCAG AA Compliance**: Full accessibility support
 */

// Main container (orchestration + state management)
export { ViewerContainer } from './ViewerContainer';

// Catalog and filtering components
export { DocumentFilters } from './DocumentFilters';
export { DocumentCatalog } from './DocumentCatalog';
export { FilterDropdown } from './FilterDropdown';
export { FilterBadge } from './FilterBadge';

// Table row and detail components
export { ProjectGroupRow } from './ProjectGroupRow';
export { DocumentRow } from './DocumentRow';
export { DocumentDetail } from './DocumentDetail';

// Item and content components
export { ItemCard } from './ItemCard';
export { MarkdownRenderer } from './MarkdownRenderer';

// Main component props and state
export type { ViewerContainerProps, ViewerState } from './types';

// Sub-component props for advanced usage and testing
export type { DocumentFiltersProps } from './DocumentFilters';
export type { FilterDropdownProps } from './FilterDropdown';
export type { FilterBadgeProps } from './FilterBadge';
export type { DocumentDetailProps } from './DocumentDetail';
export type { ItemCardProps } from './ItemCard';
export type { MarkdownRendererProps } from './MarkdownRenderer';

// Re-export core types for external use
export type {
  FilterState,
  CatalogEntry,
  FilterOptions,
  CatalogSort,
  GroupedCatalog,
  ProjectInfo,
} from './types';
