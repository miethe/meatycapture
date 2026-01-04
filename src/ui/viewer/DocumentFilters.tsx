/**
 * DocumentFilters Component
 *
 * Filter toolbar for the Request Log Viewer.
 * Provides multi-faceted filtering with:
 * - Project single-select dropdown (Radix UI Select)
 * - Archive status single-select dropdown (All/Active/Archived)
 * - Type, Domain, Priority, Status multi-selects
 * - Tags multi-select with type-to-filter
 * - Text search with debounce
 * - Active filter badges
 * - Result count display
 * - Clear all filters button
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as Select from '@radix-ui/react-select';
import {
  GlobeIcon,
  BadgeIcon,
  LayersIcon,
  BarChartIcon,
  CircleIcon,
  ChevronDownIcon,
  MixerVerticalIcon,
  ArchiveIcon,
} from '@radix-ui/react-icons';
import type { FilterState, FilterOptions, ArchiveStatus } from '@core/catalog';
import { FilterDropdown } from './FilterDropdown';
import { FilterBadge } from './FilterBadge';
import { useDebounce } from '@ui/shared/hooks/useDebounce';
import './viewer.css';

// Sentinel value for "All Projects" option (Radix UI Select prohibits empty string)
const ALL_PROJECTS_VALUE = '__all__';

/** Archive status display labels */
const ARCHIVE_STATUS_LABELS: Record<ArchiveStatus, string> = {
  all: 'All Documents',
  active: 'Active',
  archived: 'Archived',
};

export interface DocumentFiltersProps {
  /** Current filter state */
  filterState: FilterState;
  /** Available filter options from catalog */
  filterOptions: FilterOptions;
  /** Called when a filter changes */
  onFilterChange: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void;
  /** Called when user clears all filters */
  onClearFilters: () => void;
  /** Number of results matching current filters */
  resultCount: number;
  /** Total documents before filtering */
  totalCount: number;
}

/**
 * DocumentFilters
 *
 * Main filter toolbar component for the Request Log Viewer.
 * Provides all filter controls and displays active filters as removable badges.
 *
 * Filter Controls:
 * - Project: Single-select dropdown (Radix UI)
 * - Archive Status: Single-select dropdown (All/Active/Archived)
 * - Type, Domain, Priority, Status: Multi-select dropdowns with checkboxes
 * - Tags: Multi-select with type-to-filter autocomplete
 * - Text: Search input with 300ms debounce
 *
 * Features:
 * - Active filter badges with individual removal
 * - Clear all filters button
 * - Result count badge
 * - Keyboard navigation
 * - ARIA labels and roles
 * - Responsive layout
 *
 * @param props - DocumentFiltersProps
 */
export function DocumentFilters({
  filterState,
  filterOptions,
  onFilterChange,
  onClearFilters,
  resultCount,
  totalCount,
}: DocumentFiltersProps): React.JSX.Element {
  // Local state for text search input
  const [textInput, setTextInput] = useState(filterState.text);

  // Debounce text search (300ms)
  const debouncedTextInput = useDebounce(textInput, 300);

  // Sync text input with filter state when it changes externally
  useEffect(() => {
    setTextInput(filterState.text);
  }, [filterState.text]);

  // Update filter state when debounced value changes
  useEffect(() => {
    if (debouncedTextInput !== filterState.text) {
      onFilterChange('text', debouncedTextInput);
    }
  }, [debouncedTextInput, filterState.text, onFilterChange]);

  // Handle project selection
  const handleProjectChange = useCallback(
    (value: string) => {
      // Sentinel value means "All Projects"
      onFilterChange('project_id', value === ALL_PROJECTS_VALUE ? undefined : value);
    },
    [onFilterChange]
  );

  // Handle archive status selection
  const handleArchiveStatusChange = useCallback(
    (value: string) => {
      onFilterChange('archiveStatus', value as ArchiveStatus);
    },
    [onFilterChange]
  );

  // Handle multi-select filter changes
  const handleMultiSelectChange = useCallback(
    (key: 'types' | 'domains' | 'priorities' | 'statuses' | 'tags', values: string[]) => {
      onFilterChange(key, values);
    },
    [onFilterChange]
  );

  // Tags filter state with autocomplete
  const [tagsInput, setTagsInput] = useState('');
  const [showTagsSuggestions, setShowTagsSuggestions] = useState(false);

  // Filter tags based on input
  const filteredTags = useMemo(() => {
    if (!tagsInput.trim()) {
      return filterOptions.tags;
    }
    const search = tagsInput.toLowerCase();
    return filterOptions.tags.filter((tag) => tag.toLowerCase().includes(search));
  }, [tagsInput, filterOptions.tags]);

  // Add tag from input or suggestion
  const handleAddTag = useCallback(
    (tag: string) => {
      if (tag && !filterState.tags.includes(tag)) {
        onFilterChange('tags', [...filterState.tags, tag]);
      }
      setTagsInput('');
      setShowTagsSuggestions(false);
    },
    [filterState.tags, onFilterChange]
  );

  // Remove individual tag
  const handleRemoveTag = useCallback(
    (tag: string) => {
      onFilterChange(
        'tags',
        filterState.tags.filter((t) => t !== tag)
      );
    },
    [filterState.tags, onFilterChange]
  );

  // Check if any filters are active (including non-default archive status)
  const hasActiveFilters = useMemo(() => {
    return (
      filterState.project_id !== undefined ||
      filterState.types.length > 0 ||
      filterState.domains.length > 0 ||
      filterState.priorities.length > 0 ||
      filterState.statuses.length > 0 ||
      filterState.tags.length > 0 ||
      filterState.text.trim() !== '' ||
      filterState.archiveStatus !== 'active'
    );
  }, [filterState]);

  // Get active filter badges
  const activeFilterBadges = useMemo(() => {
    const badges: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];

    // Project filter
    if (filterState.project_id) {
      const project = filterOptions.projects.find((p) => p.id === filterState.project_id);
      if (project) {
        badges.push({
          key: `project-${project.id}`,
          label: 'Project',
          value: project.name,
          onRemove: () => onFilterChange('project_id', undefined),
        });
      }
    }

    // Archive status filter (only show badge if not default 'active')
    if (filterState.archiveStatus !== 'active') {
      badges.push({
        key: 'archiveStatus',
        label: 'Status',
        value: ARCHIVE_STATUS_LABELS[filterState.archiveStatus],
        onRemove: () => onFilterChange('archiveStatus', 'active'),
      });
    }

    // Multi-select filters
    filterState.types.forEach((type) => {
      badges.push({
        key: `type-${type}`,
        label: 'Type',
        value: type,
        onRemove: () =>
          onFilterChange(
            'types',
            filterState.types.filter((t) => t !== type)
          ),
      });
    });

    filterState.domains.forEach((domain) => {
      badges.push({
        key: `domain-${domain}`,
        label: 'Domain',
        value: domain,
        onRemove: () =>
          onFilterChange(
            'domains',
            filterState.domains.filter((d) => d !== domain)
          ),
      });
    });

    filterState.priorities.forEach((priority) => {
      badges.push({
        key: `priority-${priority}`,
        label: 'Priority',
        value: priority,
        onRemove: () =>
          onFilterChange(
            'priorities',
            filterState.priorities.filter((p) => p !== priority)
          ),
      });
    });

    filterState.statuses.forEach((status) => {
      badges.push({
        key: `status-${status}`,
        label: 'Status',
        value: status,
        onRemove: () =>
          onFilterChange(
            'statuses',
            filterState.statuses.filter((s) => s !== status)
          ),
      });
    });

    filterState.tags.forEach((tag) => {
      badges.push({
        key: `tag-${tag}`,
        label: 'Tag',
        value: tag,
        onRemove: () => handleRemoveTag(tag),
      });
    });

    // Text search filter
    if (filterState.text.trim()) {
      badges.push({
        key: 'text',
        label: 'Search',
        value: filterState.text,
        onRemove: () => {
          setTextInput('');
          onFilterChange('text', '');
        },
      });
    }

    return badges;
  }, [filterState, filterOptions.projects, onFilterChange, handleRemoveTag]);

  return (
    <div className="viewer-filters glass" role="search" aria-label="Document filters">
      {/* Filter Controls Row */}
      <div className="viewer-filters-row">
        {/* Project Selector (Radix UI Select) */}
        <div className="filter-control">
          <Select.Root
            value={filterState.project_id ?? ALL_PROJECTS_VALUE}
            onValueChange={handleProjectChange}
          >
            <Select.Trigger
              className="filter-select-trigger input-base select-base"
              aria-label="Project filter"
            >
              <span className="filter-icon" aria-hidden="true">
                <GlobeIcon />
              </span>
              <Select.Value placeholder="All Projects" />
              <ChevronDownIcon className="filter-chevron" aria-hidden="true" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="filter-select-content" position="popper" sideOffset={4}>
                <Select.Viewport className="filter-select-viewport">
                  <Select.Item value={ALL_PROJECTS_VALUE} className="filter-select-item">
                    <Select.ItemText>All Projects</Select.ItemText>
                  </Select.Item>
                  {filterOptions.projects.map((project) => (
                    <Select.Item key={project.id} value={project.id} className="filter-select-item">
                      <Select.ItemText>{project.name}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Archive Status Selector (Radix UI Select) */}
        <div className="filter-control">
          <Select.Root value={filterState.archiveStatus} onValueChange={handleArchiveStatusChange}>
            <Select.Trigger
              className="filter-select-trigger input-base select-base"
              aria-label="Archive status filter"
              data-has-active={filterState.archiveStatus !== 'active' ? 'true' : undefined}
            >
              <span className="filter-icon" aria-hidden="true">
                <ArchiveIcon />
              </span>
              <Select.Value placeholder="Active" />
              {filterState.archiveStatus !== 'active' && (
                <span className="filter-dropdown-badge" aria-label="Non-default filter active">
                  1
                </span>
              )}
              <ChevronDownIcon className="filter-chevron" aria-hidden="true" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="filter-select-content" position="popper" sideOffset={4}>
                <Select.Viewport className="filter-select-viewport">
                  <Select.Item value="active" className="filter-select-item">
                    <Select.ItemText>Active</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="archived" className="filter-select-item">
                    <Select.ItemText>Archived</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="all" className="filter-select-item">
                    <Select.ItemText>All Documents</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Type Multi-Select */}
        <FilterDropdown
          icon={<BadgeIcon />}
          label="Type"
          options={filterOptions.types}
          selected={filterState.types}
          onChange={(values) => handleMultiSelectChange('types', values)}
          placeholder="All Types"
        />

        {/* Domain Multi-Select */}
        <FilterDropdown
          icon={<LayersIcon />}
          label="Domain"
          options={filterOptions.domains}
          selected={filterState.domains}
          onChange={(values) => handleMultiSelectChange('domains', values)}
          placeholder="All Domains"
        />

        {/* Priority Multi-Select */}
        <FilterDropdown
          icon={<BarChartIcon />}
          label="Priority"
          options={filterOptions.priorities}
          selected={filterState.priorities}
          onChange={(values) => handleMultiSelectChange('priorities', values)}
          placeholder="All Priorities"
        />

        {/* Status Multi-Select */}
        <FilterDropdown
          icon={<CircleIcon />}
          label="Status"
          options={filterOptions.statuses}
          selected={filterState.statuses}
          onChange={(values) => handleMultiSelectChange('statuses', values)}
          placeholder="All Statuses"
        />

        {/* Filter Button */}
        <div className="filter-row-actions">
          <button
            type="button"
            className="filter-button-primary"
            onClick={() => {
              // Filter button is currently decorative - could trigger filter panel in future
              console.log('Filter button clicked');
            }}
            aria-label="Filter options"
          >
            <MixerVerticalIcon aria-hidden="true" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Tags and Search Row */}
      <div className="viewer-filters-row">
        {/* Tags Multi-Select with Autocomplete */}
        <div className="filter-control filter-tags-control">
          <div className="filter-tags-container">
            {/* Selected tags as chips */}
            {filterState.tags.length > 0 && (
              <div className="filter-tags-chips" role="list" aria-label="Selected tags">
                {filterState.tags.map((tag) => (
                  <div key={tag} className="chip" role="listitem">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      aria-label={`Remove tag: ${tag}`}
                      title={`Remove tag: ${tag}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tag input with autocomplete */}
            <div className="filter-tags-input-wrapper">
              <input
                type="text"
                className="viewer-filters-search input-base"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onFocus={() => setShowTagsSuggestions(true)}
                onBlur={() => {
                  // Delay to allow clicking suggestions
                  setTimeout(() => setShowTagsSuggestions(false), 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagsInput.trim()) {
                    e.preventDefault();
                    handleAddTag(tagsInput.trim());
                  }
                }}
                placeholder="Filter by tags..."
                aria-label="Tag filter input"
                aria-autocomplete="list"
                aria-controls="tags-suggestions"
                aria-expanded={showTagsSuggestions}
              />

              {/* Tag suggestions dropdown */}
              {showTagsSuggestions && filteredTags.length > 0 && (
                <div
                  id="tags-suggestions"
                  className="filter-tags-suggestions filter-dropdown-menu"
                  role="listbox"
                  aria-label="Tag suggestions"
                >
                  {filteredTags.slice(0, 10).map((tag) => {
                    const isSelected = filterState.tags.includes(tag);
                    return (
                      <div
                        key={tag}
                        className={`filter-dropdown-option ${isSelected ? 'selected' : ''}`}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleAddTag(tag)}
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur
                      >
                        <div
                          className={`filter-dropdown-checkbox ${isSelected ? 'checked' : ''}`}
                          aria-hidden="true"
                        >
                          {isSelected && '✓'}
                        </div>
                        <span>{tag}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Text Search */}
        <div className="filter-control">
          <input
            type="search"
            className="viewer-filters-search input-base"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Search documents..."
            aria-label="Text search"
          />
        </div>

        {/* Filter All Button */}
        <div className="filter-row-actions">
          <button
            type="button"
            className="filter-button-secondary"
            onClick={() => {
              // Could be used to show/hide filter panels or reset to default view
              console.log('Filter all button clicked');
            }}
            aria-label="Filter all options"
          >
            Filter all
          </button>
        </div>
      </div>

      {/* Active Filters and Actions Row */}
      <div className="viewer-filters-actions">
        {/* Result count */}
        <div className="viewer-filters-result-count" role="status" aria-live="polite">
          <span className="viewer-filters-count-badge">
            {resultCount} of {totalCount}
          </span>
          <span className="viewer-filters-count-label">
            {resultCount === 1 ? 'document' : 'documents'}
          </span>
        </div>

        {/* Active filter badges */}
        {activeFilterBadges.length > 0 && (
          <div className="viewer-filters-badges" role="list" aria-label="Active filters">
            {activeFilterBadges.map((badge) => (
              <FilterBadge
                key={badge.key}
                label={badge.label}
                value={badge.value}
                onRemove={badge.onRemove}
              />
            ))}
          </div>
        )}

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            className="filter-button-secondary"
            onClick={onClearFilters}
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}

export default DocumentFilters;
