# Browser Storage Adapters

localStorage-based implementations of MeatyCapture storage ports for web environments.

## Overview

The browser storage adapters enable MeatyCapture to work in web browsers without filesystem access. They implement the same port interfaces as the Tauri desktop adapters but use `localStorage` instead of the filesystem.

## Features

- **ProjectStore**: Manage projects in localStorage
- **FieldCatalogStore**: Manage field options (global and project-scoped)
- **Auto-initialization**: Automatically creates default field options on first use
- **Type-safe**: Full TypeScript support with strict type checking
- **Interface compatibility**: Drop-in replacement for Tauri adapters

## Storage Keys

The adapters use namespaced localStorage keys to avoid conflicts:

- `meatycapture_projects` - Project data
- `meatycapture_fields` - Field catalog data

## Usage

### Project Store

```typescript
import { createBrowserProjectStore } from '@adapters/browser-storage';

// Create store instance
const projectStore = createBrowserProjectStore();

// List all projects
const projects = await projectStore.list();

// Create a new project
const project = await projectStore.create({
  name: 'My Project',
  default_path: '/path/to/docs',
  enabled: true,
});

// Get a project by ID
const found = await projectStore.get('my-project');

// Update a project
const updated = await projectStore.update('my-project', {
  enabled: false,
});

// Delete a project
await projectStore.delete('my-project');
```

### Field Catalog Store

```typescript
import { createBrowserFieldCatalogStore } from '@adapters/browser-storage';

// Create store instance
const fieldStore = createBrowserFieldCatalogStore();

// Get global field options
const globalOptions = await fieldStore.getGlobal();

// Get effective options for a project (global + project-specific)
const projectOptions = await fieldStore.getForProject('my-project');

// Get options for a specific field
const typeOptions = await fieldStore.getByField('type');
const projectTypeOptions = await fieldStore.getByField('type', 'my-project');

// Add a new global option
const newOption = await fieldStore.addOption({
  field: 'type',
  value: 'spike',
  scope: 'global',
});

// Add a project-specific option
const projectOption = await fieldStore.addOption({
  field: 'domain',
  value: 'mobile',
  scope: 'project',
  project_id: 'my-project',
});

// Remove an option
await fieldStore.removeOption('type-spike-1234567890');
```

## Data Format

### Projects

```json
{
  "projects": [
    {
      "id": "my-project",
      "name": "My Project",
      "default_path": "/path/to/docs",
      "enabled": true,
      "created_at": "2025-12-03T10:00:00.000Z",
      "updated_at": "2025-12-03T10:00:00.000Z"
    }
  ]
}
```

### Fields

```json
{
  "global": [
    {
      "id": "type-enhancement-1234567890",
      "field": "type",
      "value": "enhancement",
      "scope": "global",
      "created_at": "2025-12-03T10:00:00.000Z"
    }
  ],
  "projects": {
    "my-project": [
      {
        "id": "domain-mobile-1234567890",
        "field": "domain",
        "value": "mobile",
        "scope": "project",
        "project_id": "my-project",
        "created_at": "2025-12-03T10:00:00.000Z"
      }
    ]
  }
}
```

## Default Field Options

On first access, the field catalog store automatically initializes with these global options:

- **type**: enhancement, bug, idea, task, question
- **priority**: low, medium, high, critical
- **status**: triage, backlog, planned, in-progress, done, wontfix

## Error Handling

All operations are wrapped in try-catch blocks and throw descriptive errors:

- **Project not found**: When updating/deleting a non-existent project
- **Duplicate project ID**: When creating a project with an existing ID
- **Invalid project name**: When project name cannot be slugified
- **Field option not found**: When removing a non-existent field option
- **Duplicate field option**: When adding a field option that already exists
- **Missing project_id**: When creating a project-scoped option without project_id
- **localStorage errors**: When localStorage operations fail (quota exceeded, etc.)

## Browser Compatibility

Requires browsers with localStorage support (all modern browsers):

- Chrome/Edge 4+
- Firefox 3.5+
- Safari 4+
- Opera 11.5+
- IE 8+

## Storage Limits

localStorage typically has a 5-10MB limit per origin. The adapters don't implement quota management, so applications should handle QuotaExceededError exceptions if needed.

## Testing

See the test suite at `src/adapters/browser-storage/__tests__/ls-config-stores.test.ts` for comprehensive examples and edge case handling.

## Architecture

These adapters follow the Port/Adapter pattern:

```
UI Layer
    ↓
Core Layer (Ports)
    ↓
Adapter Layer (Browser Storage)
    ↓
localStorage API
```

The adapters are interchangeable with the Tauri filesystem adapters, allowing the same core business logic to work in both web and desktop environments.
