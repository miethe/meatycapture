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
export { StatsCard } from './StatsCard';

// Main component props and state
export type { ViewerContainerProps, ViewerState } from './types';

// Sub-component props for advanced usage and testing
export type { DocumentFiltersProps } from './DocumentFilters';
export type { FilterDropdownProps } from './FilterDropdown';
export type { FilterBadgeProps } from './FilterBadge';
export type { DocumentDetailProps } from './DocumentDetail';
export type { ItemCardProps } from './ItemCard';
export type { MarkdownRendererProps } from './MarkdownRenderer';
export type { StatsCardProps } from './StatsCard';

// Re-export core types for external use
export type {
  FilterState,
  CatalogEntry,
  FilterOptions,
  CatalogSort,
  GroupedCatalog,
  ProjectInfo,
} from './types';

// Mobile viewer components
export { MobileViewerContainer } from './mobile/MobileViewerContainer';
export { MobileDocList } from './mobile/MobileDocList';
export { MobileDocCard } from './mobile/MobileDocCard';
export { MobileViewerHeader } from './mobile/MobileViewerHeader';
export { MobileFilterFab } from './mobile/MobileFilterFab';
export { MobileFilterSheet } from './mobile/MobileFilterSheet';
export { MobileDetailSheet } from './mobile/MobileDetailSheet';
export { MobileSearchBar } from './mobile/MobileSearchBar';
export { MobileSortDropdown } from './mobile/MobileSortDropdown';

// Mobile component types
export type { MobileViewerContainerProps, SafeAreaInsets } from './mobile/MobileViewerContainer';
export type { MobileDocListProps } from './mobile/MobileDocList';
export type { MobileDocCardProps } from './mobile/MobileDocCard';
export type { MobileViewerHeaderProps } from './mobile/MobileViewerHeader';
export type { MobileFilterFabProps } from './mobile/MobileFilterFab';
export type { MobileFilterSheetProps } from './mobile/MobileFilterSheet';
export type { MobileDetailSheetProps } from './mobile/MobileDetailSheet';

// Mobile hooks
export { useBottomSheet } from './hooks/useBottomSheet';
export { useHalfSheet } from './hooks/useHalfSheet';
export { useSafeArea } from './hooks/useSafeArea';

// Mobile hook types
export type { UseBottomSheetResult } from './hooks/useBottomSheet';
export type { UseHalfSheetOptions, UseHalfSheetResult } from './hooks/useHalfSheet';
export type { SafeAreaInsets as HookSafeAreaInsets } from './hooks/useSafeArea';
export type { ViewportState } from './hooks/useMobileViewport';
export type { ReducedMotionResult } from './hooks/useReducedMotion';
