/**
 * Viewer Hooks Module
 *
 * Re-exports all hooks used by the Request Log Viewer feature.
 * Provides common hooks for document caching, filter management,
 * mobile interactions, and accessibility.
 */

// Document caching
export { useDocumentCache } from './useDocumentCache';
export type { DocumentCacheResult } from './useDocumentCache';

// Filter management
export { useViewerFilters } from './useViewerFilters';
export type { UseViewerFiltersReturn } from './useViewerFilters';

// Mobile viewport and interactions
export { useMobileViewport } from './useMobileViewport';
export type { ViewportState } from './useMobileViewport';

export { useSafeArea } from './useSafeArea';
export type { SafeAreaInsets } from './useSafeArea';

export { useBottomSheet } from './useBottomSheet';
export type { UseBottomSheetResult } from './useBottomSheet';

export { useHalfSheet } from './useHalfSheet';
export type { UseHalfSheetOptions, UseHalfSheetResult } from './useHalfSheet';

// Accessibility
export { useReducedMotion } from './useReducedMotion';
export type { ReducedMotionResult } from './useReducedMotion';
