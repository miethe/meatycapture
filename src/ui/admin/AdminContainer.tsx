/**
 * AdminContainer Component
 *
 * Main container that orchestrates the admin UI.
 * Manages data loading, state, and CRUD operations for field options.
 * Wires AdminPage and FieldGroupTab to ProjectStore and FieldCatalogStore.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { ProjectStore, FieldCatalogStore } from '@core/ports';
import type { Project, FieldOption, FieldName } from '@core/models';
import { AdminPage } from './AdminPage';
import { FieldGroupTab } from './FieldGroupTab';
import './admin.css';

export interface AdminContainerProps {
  /** ProjectStore for loading projects */
  projectStore: ProjectStore;
  /** FieldCatalogStore for managing field options */
  fieldCatalogStore: FieldCatalogStore;
}

/**
 * All available field names for tab navigation
 */
const FIELD_NAMES: FieldName[] = ['type', 'domain', 'context', 'priority', 'status', 'tags'];

/**
 * AdminContainer orchestrates the field options management UI.
 *
 * Responsibilities:
 * - Loads projects and field options from stores
 * - Manages selected scope (global or project ID)
 * - Handles tab navigation between field groups
 * - Wires CRUD callbacks to FieldCatalogStore
 * - Refreshes data after mutations
 *
 * @example
 * ```tsx
 * import { AdminContainer } from '@ui/admin';
 * import { createProjectStore, createFieldCatalogStore } from '@adapters/config-local';
 *
 * const projectStore = createProjectStore();
 * const fieldCatalogStore = createFieldCatalogStore();
 *
 * <AdminContainer
 *   projectStore={projectStore}
 *   fieldCatalogStore={fieldCatalogStore}
 * />
 * ```
 */
export function AdminContainer({
  projectStore,
  fieldCatalogStore,
}: AdminContainerProps): React.JSX.Element {
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedScope, setSelectedScope] = useState<'global' | string>('global');
  const [activeTab, setActiveTab] = useState<FieldName>('type');
  const [currentOptions, setCurrentOptions] = useState<FieldOption[]>([]);
  const [globalOptions, setGlobalOptions] = useState<FieldOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects on mount
  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      try {
        setIsLoading(true);
        const allProjects = await projectStore.list();
        if (mounted) {
          setProjects(allProjects);
          // Auto-select first enabled project if in project scope
          if (selectedScope !== 'global' && allProjects.length > 0) {
            const firstEnabled = allProjects.find((p) => p.enabled);
            if (firstEnabled) {
              setSelectedScope(firstEnabled.id);
            }
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load projects');
          console.error('Failed to load projects:', err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      mounted = false;
    };
  }, [projectStore, selectedScope]);

  // Load field options when scope or active tab changes
  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      try {
        setIsLoading(true);

        if (selectedScope === 'global') {
          // Global scope: load only global options for this field
          const options = await fieldCatalogStore.getByField(activeTab);
          if (mounted) {
            setCurrentOptions(options);
            setGlobalOptions([]);
          }
        } else {
          // Project scope: load both global and project options for this field
          const [global, project] = await Promise.all([
            fieldCatalogStore.getByField(activeTab),
            fieldCatalogStore.getByField(activeTab, selectedScope),
          ]);

          if (mounted) {
            setGlobalOptions(global);
            setCurrentOptions(project);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load field options');
          console.error('Failed to load field options:', err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      mounted = false;
    };
  }, [fieldCatalogStore, selectedScope, activeTab]);

  /**
   * Refreshes options for the current scope and tab
   */
  const refreshOptions = useCallback(async () => {
    try {
      if (selectedScope === 'global') {
        const options = await fieldCatalogStore.getByField(activeTab);
        setCurrentOptions(options);
        setGlobalOptions([]);
      } else {
        const [global, project] = await Promise.all([
          fieldCatalogStore.getByField(activeTab),
          fieldCatalogStore.getByField(activeTab, selectedScope),
        ]);
        setGlobalOptions(global);
        setCurrentOptions(project);
      }
    } catch (err) {
      console.error('Failed to refresh options:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh options');
    }
  }, [fieldCatalogStore, selectedScope, activeTab]);

  /**
   * Handles scope change from AdminPage
   */
  const handleScopeChange = useCallback((scope: 'global' | string) => {
    setSelectedScope(scope);
    setError(null);
  }, []);

  /**
   * Handles tab change
   */
  const handleTabChange = useCallback((field: FieldName) => {
    setActiveTab(field);
    setError(null);
  }, []);

  /**
   * Adds a new option for the current scope and field
   */
  const handleAddOption = useCallback(
    async (value: string) => {
      try {
        const optionData:
          | { field: FieldName; value: string; scope: 'global' }
          | { field: FieldName; value: string; scope: 'project'; project_id: string } =
          selectedScope === 'global'
            ? { field: activeTab, value, scope: 'global' }
            : { field: activeTab, value, scope: 'project', project_id: selectedScope };

        await fieldCatalogStore.addOption(optionData);
        await refreshOptions();
      } catch (err) {
        console.error('Failed to add option:', err);
        throw err; // Re-throw to let FieldGroupTab handle error state
      }
    },
    [fieldCatalogStore, activeTab, selectedScope, refreshOptions]
  );

  /**
   * Removes an option by ID
   */
  const handleRemoveOption = useCallback(
    async (id: string) => {
      try {
        await fieldCatalogStore.removeOption(id);
        await refreshOptions();
      } catch (err) {
        console.error('Failed to remove option:', err);
        throw err; // Re-throw to let FieldGroupTab handle error state
      }
    },
    [fieldCatalogStore, refreshOptions]
  );

  /**
   * Enables a global option for the current project
   */
  const handleEnableForProject = useCallback(
    async (globalOptionId: string) => {
      if (selectedScope === 'global') {
        console.warn('Cannot enable option for project in global scope');
        return;
      }

      try {
        // Find the global option
        const globalOption = globalOptions.find((opt) => opt.id === globalOptionId);
        if (!globalOption) {
          throw new Error('Global option not found');
        }

        // Create a project-scoped copy
        await fieldCatalogStore.addOption({
          field: globalOption.field,
          value: globalOption.value,
          scope: 'project',
          project_id: selectedScope,
        });

        await refreshOptions();
      } catch (err) {
        console.error('Failed to enable option for project:', err);
        throw err; // Re-throw to let FieldGroupTab handle error state
      }
    },
    [fieldCatalogStore, selectedScope, globalOptions, refreshOptions]
  );

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1 className="admin-title">Field Options Manager</h1>
        </div>
        <div
          className="glass"
          style={{ padding: 'var(--spacing-lg)', color: 'var(--color-error)' }}
        >
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <AdminPage projects={projects} selectedScope={selectedScope} onScopeChange={handleScopeChange}>
      {/* Tab navigation */}
      <div className="admin-tabs">
        {FIELD_NAMES.map((field) => (
          <button
            key={field}
            className={`admin-tab ${activeTab === field ? 'active' : ''}`}
            onClick={() => handleTabChange(field)}
            disabled={isLoading}
            aria-label={`${field.charAt(0).toUpperCase() + field.slice(1)} tab`}
            aria-current={activeTab === field ? 'page' : undefined}
          >
            {field.charAt(0).toUpperCase() + field.slice(1)}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {selectedScope === 'global' ? (
        <FieldGroupTab
          field={activeTab}
          options={currentOptions}
          scope={selectedScope}
          onAddOption={handleAddOption}
          onRemoveOption={handleRemoveOption}
          isLoading={isLoading}
        />
      ) : (
        <FieldGroupTab
          field={activeTab}
          options={currentOptions}
          globalOptions={globalOptions}
          scope={selectedScope}
          onAddOption={handleAddOption}
          onRemoveOption={handleRemoveOption}
          onEnableForProject={handleEnableForProject}
          isLoading={isLoading}
        />
      )}
    </AdminPage>
  );
}

export default AdminContainer;
