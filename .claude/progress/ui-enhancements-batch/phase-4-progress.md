---
# === PHASE 4 PROGRESS TRACKING ===
# Document Management for UI Enhancements Batch v1
# REQUIRED FIELDS: assigned_to, dependencies for EVERY task

# Metadata: Identification and Classification
type: progress
prd: "ui-enhancements-batch-v1"
phase: 4
title: "Document Management"
status: "in_progress"
started: "2026-01-01"
completed: null

# Overall Progress: Status and Estimates
overall_progress: 0
completion_estimate: "on-track"

# Task Counts: Machine-readable task state
total_tasks: 8
completed_tasks: 0
in_progress_tasks: 0
blocked_tasks: 0
at_risk_tasks: 0

# Ownership: Primary and secondary agents
owners: ["ui-engineer-enhanced", "frontend-developer"]
contributors: ["backend-typescript-architect"]

# === ORCHESTRATION QUICK REFERENCE ===
# For lead-architect and orchestration agents: All tasks with assignments and dependencies
# This section enables minimal-token delegation without reading full file
tasks:
  # Batch 1: Core kebab menu components (no dependencies - can run in parallel)
  - id: "D4.1"
    description: "Create KebabMenu component - Generic menu component with items, icons, dangerous styling"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_effort: "3h"
    priority: "high"
    acceptance_criteria:
      - Component at src/ui/shared/KebabMenu.tsx
      - Props with items array (label, icon?, onClick, isDangerous?)
      - Trigger is 3-dot icon button (kebab)
      - Menu items list with hover/focus states
      - Dangerous items highlighted in red
      - Closes on item selection or outside click
      - Keyboard navigation (arrow keys, Enter)
      - Accessible role=menu, aria-haspopup
      - Touch-friendly positioning
      - Snapshot tests

  - id: "D4.5"
    description: "Create DocumentEditForm component for editing document-level fields (title, optional description)"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_effort: "2h"
    priority: "medium"
    acceptance_criteria:
      - Component at src/ui/viewer/DocumentEditForm.tsx
      - Editable fields title (required)
      - Optional description/notes field for document metadata
      - Form validation
      - Props doc, onSave, onCancel
      - Snapshot tests

  # Batch 2: DocumentKebabMenu and operations (depends on D4.1)
  - id: "D4.2"
    description: "Create DocumentKebabMenu component - Specialized menu for document operations (Delete/Archive/Edit/Add Item)"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["D4.1"]
    estimated_effort: "2h"
    priority: "high"
    acceptance_criteria:
      - Component at src/ui/viewer/DocumentKebabMenu.tsx
      - Menu items Delete Document (red), Archive Document (orange), Edit Document (blue), Add Item (green)
      - Props doc, onDelete, onArchive, onEdit, onAddItem
      - Uses KebabMenu component
      - Snapshot tests

  - id: "D4.3"
    description: "Create DocumentDeleteConfirm flow - Delete confirmation for document with cascading items count"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["D4.2"]
    estimated_effort: "2h"
    priority: "high"
    acceptance_criteria:
      - Confirmation dialog shows doc_id and item count
      - Message shows delete warning with item count
      - Calls onDocumentDeleted(docId) callback
      - Parent handles document removal and persistence
      - Success Toast feedback
      - Error handling

  - id: "D4.4"
    description: "Create DocumentArchiveConfirm flow - Archive confirmation (non-destructive, hides from active view)"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["D4.2"]
    estimated_effort: "2h"
    priority: "high"
    acceptance_criteria:
      - Confirmation dialog shows doc_id
      - Message explains archive is non-destructive
      - On confirm, sets archived to true
      - Calls onDocumentArchived(docId) callback
      - Document removed from active list
      - Success Toast feedback
      - Includes Unarchive option for archived docs
      - Error handling

  # Batch 2 parallel: Filtering components (can run parallel with D4.2-D4.4)
  - id: "D4.6"
    description: "Add document status filter to DocumentFilters - New filter for All/Active/Archived documents"
    status: "pending"
    assigned_to: ["frontend-developer"]
    dependencies: ["D4.1"]
    estimated_effort: "2h"
    priority: "medium"
    acceptance_criteria:
      - Filter dropdown added to DocumentFilters toolbar
      - Options All, Active (not archived), Archived
      - Default Active
      - Integrated with existing FilterState
      - Affects catalog display (filters by archived status)
      - Badge shows if filtering is active
      - Accessible aria-label for dropdown

  - id: "D4.7"
    description: "Update DocumentCatalog to show archive status - Visual indicator for archived documents"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["D4.6"]
    estimated_effort: "1h"
    priority: "medium"
    acceptance_criteria:
      - Archived documents show badge/flag in catalog
      - Can be toggled off via status filter
      - Styling grayed out or badge indicator
      - Snapshot tests

  # Batch 3: Add Item navigation (depends on document menu being complete)
  - id: "D4.8"
    description: "Implement Add Item menu action - Navigate to capture wizard at Step 3 with document pre-selected"
    status: "pending"
    assigned_to: ["frontend-developer"]
    dependencies: ["D4.2"]
    estimated_effort: "2h"
    priority: "medium"
    acceptance_criteria:
      - KebabMenu Add Item action navigates to capture
      - Captures selected document ID and passes to capture flow
      - Capture wizard opens at Step 3 (Item Details)
      - Project and Document are pre-selected (read-only)
      - User can immediately enter item details
      - Integration with existing navigation/routing
      - Works on web and Tauri

# Parallelization Strategy (computed from dependencies)
parallelization:
  batch_1: ["D4.1", "D4.5"]                   # Can run simultaneously - no dependencies
  batch_2: ["D4.2", "D4.6"]                   # D4.2 depends on D4.1, D4.6 depends on D4.1
  batch_3: ["D4.3", "D4.4", "D4.7", "D4.8"]   # Depends on D4.2 or D4.6
  critical_path: ["D4.1", "D4.2", "D4.3"]     # Longest dependency chain
  estimated_total_time: "10h"                  # Optimal parallel execution

# Critical Blockers: For immediate visibility
blockers: []

# Success Criteria: Acceptance conditions for phase completion
success_criteria:
  - id: "SC-1"
    description: "Document kebab menu renders and shows options"
    status: "pending"
  - id: "SC-2"
    description: "Delete/Archive confirmations work correctly"
    status: "pending"
  - id: "SC-3"
    description: "Document status filter works"
    status: "pending"
  - id: "SC-4"
    description: "Archive badge displays on archived docs"
    status: "pending"
  - id: "SC-5"
    description: "Add Item navigation works"
    status: "pending"
  - id: "SC-6"
    description: "All accessibility tests pass"
    status: "pending"
  - id: "SC-7"
    description: "Mobile-responsive"
    status: "pending"
  - id: "SC-8"
    description: "Component tests >80% coverage"
    status: "pending"

# Files Modified: What's being changed in this phase
files_to_modify:
  - "src/ui/shared/KebabMenu.tsx"
  - "src/ui/shared/KebabMenu.css"
  - "src/ui/viewer/DocumentKebabMenu.tsx"
  - "src/ui/viewer/DocumentEditForm.tsx"
  - "src/ui/viewer/DocumentFilters.tsx"
  - "src/ui/viewer/DocumentCatalog.tsx"
  - "src/ui/shared/__tests__/KebabMenu.test.tsx"
  - "src/ui/viewer/__tests__/DocumentKebabMenu.test.tsx"
  - "src/ui/viewer/__tests__/DocumentEditForm.test.tsx"
---

# ui-enhancements-batch-v1 - Phase 4: Document Management

**Phase**: 4 of 6
**Status**: 🔄 In Progress (0% complete)
**Duration**: Started 2026-01-01, estimated completion 2-2.5 days
**Owner**: ui-engineer-enhanced, frontend-developer
**Contributors**: backend-typescript-architect

---

## Orchestration Quick Reference

> **For Orchestration Agents**: Use this section to delegate tasks without reading the full file.

### Parallelization Strategy

**Batch 1** (Parallel - No Dependencies):
- D4.1 → `ui-engineer-enhanced` (3h) - Create KebabMenu component
- D4.5 → `ui-engineer-enhanced` (2h) - Create DocumentEditForm component

**Batch 2** (Parallel - Depends on Batch 1):
- D4.2 → `ui-engineer-enhanced` (2h) - **Blocked by**: D4.1 - Create DocumentKebabMenu
- D4.6 → `frontend-developer` (2h) - **Blocked by**: D4.1 - Add document status filter

**Batch 3** (Parallel - Depends on Batch 2):
- D4.3 → `ui-engineer-enhanced` (2h) - **Blocked by**: D4.2 - DocumentDeleteConfirm flow
- D4.4 → `ui-engineer-enhanced` (2h) - **Blocked by**: D4.2 - DocumentArchiveConfirm flow
- D4.7 → `ui-engineer-enhanced` (1h) - **Blocked by**: D4.6 - Update DocumentCatalog archive status
- D4.8 → `frontend-developer` (2h) - **Blocked by**: D4.2 - Implement Add Item navigation

**Critical Path**: D4.1 → D4.2 → D4.3 (7h total)

### Task Delegation Commands

```
# Batch 1 (Launch in parallel)
Task("ui-engineer-enhanced", "D4.1: Create KebabMenu component at src/ui/shared/KebabMenu.tsx. Generic menu with 3-dot trigger, items array (label, icon?, onClick, isDangerous?), dangerous items in red, keyboard navigation (arrow keys, Enter), closes on selection/outside click, accessible (role=menu, aria-haspopup), touch-friendly positioning. Include snapshot tests. Follow existing shared component patterns from MultiSelectCombobox and ConfirmationDialog.")

Task("ui-engineer-enhanced", "D4.5: Create DocumentEditForm component at src/ui/viewer/DocumentEditForm.tsx. Form for editing document title (required) and optional description/notes. Props: doc: RequestLogDoc, onSave, onCancel. Include form validation and snapshot tests. Follow ItemEditForm patterns.")

# Batch 2 (After Batch 1 completes)
Task("ui-engineer-enhanced", "D4.2: Create DocumentKebabMenu component at src/ui/viewer/DocumentKebabMenu.tsx. Uses KebabMenu component. Menu items: Delete Document (red, dangerous), Archive Document (orange, confirm required), Edit Document (blue), Add Item (green). Props: doc, onDelete, onArchive, onEdit, onAddItem. Include snapshot tests.")

Task("frontend-developer", "D4.6: Add document status filter to DocumentFilters component. New dropdown filter with options: All, Active (default, not archived), Archived. Integrate with existing FilterState. Show badge when non-default filter active. Affects DocumentCatalog display. Accessible with aria-label.")

# Batch 3 (After Batch 2 completes)
Task("ui-engineer-enhanced", "D4.3: Create DocumentDeleteConfirm flow. When DocumentKebabMenu Delete clicked, open ConfirmationDialog showing doc_id and item count with warning message. On confirm, call onDocumentDeleted(docId). Show success Toast. Handle errors gracefully.")

Task("ui-engineer-enhanced", "D4.4: Create DocumentArchiveConfirm flow. When DocumentKebabMenu Archive clicked, open ConfirmationDialog explaining archive is non-destructive and can be restored. On confirm, set archived=true, call onDocumentArchived(docId). Also implement Unarchive for archived docs. Success Toast and error handling.")

Task("ui-engineer-enhanced", "D4.7: Update DocumentCatalog to show archive status. Archived documents show badge/flag in catalog. Grayed styling for archived. Respects status filter from D4.6. Include snapshot tests.")

Task("frontend-developer", "D4.8: Implement Add Item menu action. When DocumentKebabMenu 'Add Item' clicked, navigate to capture wizard at Step 3 with document pre-selected. Project and Document are read-only. User enters item details. Works on web and Tauri platforms.")
```

---

## Overview

Add document-level CRUD operations: kebab menu with Delete/Archive/Edit/Add Item actions, document status filtering (Active/Archived), and archive status indicators in the catalog.

**Why This Phase**: Enable users to manage documents holistically - archive old logs, delete unwanted ones, edit document titles, and quickly add new items without navigating through the full wizard.

**Scope**:
- IN: KebabMenu component, DocumentKebabMenu, Delete/Archive confirmations, status filter, catalog badges, Add Item navigation
- OUT: Bulk operations, document versioning, undo functionality

---

## Success Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| SC-1 | Document kebab menu renders and shows options | ⏳ Pending |
| SC-2 | Delete/Archive confirmations work correctly | ⏳ Pending |
| SC-3 | Document status filter works | ⏳ Pending |
| SC-4 | Archive badge displays on archived docs | ⏳ Pending |
| SC-5 | Add Item navigation works | ⏳ Pending |
| SC-6 | All accessibility tests pass | ⏳ Pending |
| SC-7 | Mobile-responsive | ⏳ Pending |
| SC-8 | Component tests >80% coverage | ⏳ Pending |

---

## Tasks

| ID | Task | Status | Agent | Dependencies | Est | Notes |
|----|------|--------|-------|--------------|-----|-------|
| D4.1 | Create KebabMenu component | ⏳ | ui-engineer-enhanced | None | 3h | Generic reusable menu |
| D4.2 | Create DocumentKebabMenu component | ⏳ | ui-engineer-enhanced | D4.1 | 2h | Document-specific menu |
| D4.3 | Create DocumentDeleteConfirm flow | ⏳ | ui-engineer-enhanced | D4.2 | 2h | Cascading delete warning |
| D4.4 | Create DocumentArchiveConfirm flow | ⏳ | ui-engineer-enhanced | D4.2 | 2h | Non-destructive archive |
| D4.5 | Create DocumentEditForm component | ⏳ | ui-engineer-enhanced | None | 2h | Title + description edit |
| D4.6 | Add document status filter | ⏳ | frontend-developer | D4.1 | 2h | All/Active/Archived |
| D4.7 | Update DocumentCatalog for archive status | ⏳ | ui-engineer-enhanced | D4.6 | 1h | Badge/grayed styling |
| D4.8 | Implement Add Item menu action | ⏳ | frontend-developer | D4.2 | 2h | Navigate to wizard Step 3 |

**Status Legend**:
- `⏳` Not Started (Pending)
- `🔄` In Progress
- `✓` Complete
- `🚫` Blocked
- `⚠️` At Risk

---

## Architecture Context

### Current State

Phase 2 created shared components (ConfirmationDialog, EditModal) that will be reused here. Phase 3 established the pattern for item CRUD operations that document management will mirror.

**Key Files**:
- `src/ui/shared/ConfirmationDialog.tsx` - Reuse for delete/archive confirmations
- `src/ui/shared/EditModal.tsx` - Reuse for document edit modal
- `src/ui/viewer/ItemCard.tsx` - Reference for CRUD icon pattern
- `src/ui/viewer/ItemEditForm.tsx` - Reference for form pattern

### Reference Patterns

**Similar Features**:
- ItemCard Edit/Delete icons in Phase 3 - mirror for document kebab menu positioning
- ConfirmationDialog usage in ItemCard - same pattern for document operations
- FilterState in DocumentFilters - extend for archive status

---

## Implementation Details

### Technical Approach

1. **KebabMenu Component**: Generic menu component with slot-based items, keyboard navigation, outside-click handling
2. **DocumentKebabMenu**: Composition over KebabMenu with document-specific menu items and callbacks
3. **Delete/Archive Flows**: Use ConfirmationDialog with appropriate messaging and callbacks
4. **Status Filter**: Extend existing FilterState with `archiveFilter: 'all' | 'active' | 'archived'`
5. **Add Item Navigation**: Use React Router or existing navigation pattern to jump to wizard Step 3

### Known Gotchas

- KebabMenu positioning: ensure menu doesn't overflow viewport on mobile
- Archive status must persist to document frontmatter via serializer (already added in Phase 1)
- Add Item navigation needs to pass document context to wizard without breaking existing flows

---

## Blockers

### Active Blockers

None.

### Resolved Blockers

None.

---

## Dependencies

### External Dependencies

- Phase 1 (Model Layer): `archived` field already added to RequestLogDoc ✓
- Phase 2 (Shared Components): ConfirmationDialog, EditModal available ✓

### Internal Integration Points

- KebabMenu integrates with DocumentKebabMenu at viewer level
- DocumentFilters integrates with FilterState for archive filtering
- DocumentCatalog uses filter state to show/hide archived documents

---

## Testing Strategy

| Test Type | Scope | Coverage | Status |
|-----------|-------|----------|--------|
| Unit | KebabMenu, DocumentKebabMenu | 85%+ | ⏳ |
| Component | Delete/Archive flows | Core flows | ⏳ |
| Integration | Filter + Catalog interaction | All filter states | ⏳ |
| A11y | Keyboard nav, ARIA | All interactive elements | ⏳ |

---

## Work Log

### 2026-01-01

**Session Start**: Phase 4 initiated after Phase 3 completion.

**Completed**:
- Created phase-4-progress.md tracking file

**In Progress**:
- Ready to execute Batch 1 tasks

**Next Actions**:
- Launch D4.1 and D4.5 in parallel
- After Batch 1, launch D4.2 and D4.6
- Continue with Batch 3 tasks

---
