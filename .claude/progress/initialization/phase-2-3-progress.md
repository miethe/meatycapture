---
prd_name: initialization
phase: "2-3"
title: "Wizard UI + Admin UI"
status: in_progress
completion: 0%
started_at: 2025-12-06
completed_at: null
tasks:
  - id: TASK-2.0
    title: "Shared UI components"
    description: "DropdownWithAdd, MultiSelectWithAdd, StepShell, PathField components"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_time: "2h"
    status: pending
  - id: TASK-2.1
    title: "ProjectStep component"
    description: "Project selection dropdown with inline Add New modal (name, default_path, repo_url)"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-2.0"]
    estimated_time: "1.5h"
    status: pending
  - id: TASK-2.2
    title: "DocStep component"
    description: "Doc selection - new doc vs existing list from project path, path override option"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-2.0"]
    estimated_time: "1.5h"
    status: pending
  - id: TASK-2.3
    title: "ItemStep component"
    description: "Item details form with typed dropdowns (type, domain, context, priority, status), tags multi-select, notes textarea"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-2.0"]
    estimated_time: "2h"
    status: pending
  - id: TASK-2.4
    title: "ReviewStep component"
    description: "Review/confirm step showing item summary, submit button, 'Add another item' option"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-2.3"]
    estimated_time: "1h"
    status: pending
  - id: TASK-2.5
    title: "WizardFlow state machine"
    description: "Multi-step wizard controller with state machine, step navigation, batching mode (Project/Doc fixed after first item)"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-2.1", "TASK-2.2", "TASK-2.3", "TASK-2.4"]
    estimated_time: "2h"
    status: pending
  - id: TASK-2.6
    title: "Wizard integration with stores"
    description: "Connect wizard to ProjectStore, FieldCatalogStore, DocStore; handle async operations"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-2.5"]
    estimated_time: "1.5h"
    status: pending
  - id: TASK-3.1
    title: "Admin page layout"
    description: "Admin page with Global/Project toggle, field group tabs (type, domain, context, priority, status, tags)"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-2.0"]
    estimated_time: "1h"
    status: pending
  - id: TASK-3.2
    title: "Field options CRUD"
    description: "Add/edit/delete field options, global options greyed in project view, 'Enable for project' action"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-3.1"]
    estimated_time: "2h"
    status: pending
  - id: TASK-3.3
    title: "Admin integration with FieldCatalogStore"
    description: "Connect admin UI to FieldCatalogStore for persistence"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-3.2"]
    estimated_time: "1h"
    status: pending
  - id: TASK-4.1
    title: "Animations and transitions"
    description: "Step transition animations, micro-interactions, loading states"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-2.5", "TASK-3.2"]
    estimated_time: "1h"
    status: pending
  - id: TASK-4.2
    title: "Keyboard shortcuts"
    description: "Next/Back shortcuts, focus management, accessibility"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-2.5"]
    estimated_time: "1h"
    status: pending
  - id: TASK-4.3
    title: "Error handling UI"
    description: "Error surfaces for path/write issues, validation messages"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-2.6"]
    estimated_time: "1h"
    status: pending

parallelization:
  batch_1: ["TASK-2.0"]
  batch_2: ["TASK-2.1", "TASK-2.2", "TASK-2.3", "TASK-3.1"]
  batch_3: ["TASK-2.4", "TASK-3.2"]
  batch_4: ["TASK-2.5", "TASK-3.3"]
  batch_5: ["TASK-2.6", "TASK-4.1", "TASK-4.2"]
  batch_6: ["TASK-4.3"]
  critical_path: ["TASK-2.0", "TASK-2.3", "TASK-2.5", "TASK-2.6", "TASK-4.3"]
  estimated_total_time: "18h"

blockers: []
---

## Work Log

### 2025-12-06
- Phase 2-3 execution started
- Progress tracking infrastructure created

## Orchestration Quick Reference

### Batch 1 (No dependencies)
```
Task("ui-engineer-enhanced", "TASK-2.0: Create shared UI components for MeatyCapture wizard...")
```

### Batch 2 (Depends on TASK-2.0)
```
Task("ui-engineer-enhanced", "TASK-2.1: ProjectStep component...")
Task("ui-engineer-enhanced", "TASK-2.2: DocStep component...")
Task("ui-engineer-enhanced", "TASK-2.3: ItemStep component...")
Task("ui-engineer-enhanced", "TASK-3.1: Admin page layout...")
```

### Batch 3 (Depends on TASK-2.3, TASK-3.1)
```
Task("ui-engineer-enhanced", "TASK-2.4: ReviewStep component...")
Task("ui-engineer-enhanced", "TASK-3.2: Field options CRUD...")
```

### Batch 4 (Depends on TASK-2.1-2.4, TASK-3.2)
```
Task("ui-engineer-enhanced", "TASK-2.5: WizardFlow state machine...")
Task("ui-engineer-enhanced", "TASK-3.3: Admin integration...")
```

### Batch 5 (Depends on TASK-2.5, TASK-3.3)
```
Task("ui-engineer-enhanced", "TASK-2.6: Wizard integration with stores...")
Task("ui-engineer-enhanced", "TASK-4.1: Animations and transitions...")
Task("ui-engineer-enhanced", "TASK-4.2: Keyboard shortcuts...")
```

### Batch 6 (Depends on TASK-2.6)
```
Task("ui-engineer-enhanced", "TASK-4.3: Error handling UI...")
```

## Files Changed

(To be updated as work progresses)

## Success Criteria

- [ ] Shared components (DropdownWithAdd, MultiSelectWithAdd, StepShell) working
- [ ] Wizard can create new project inline
- [ ] Wizard can create new doc or select existing
- [ ] Wizard captures all item fields with Add+ for options
- [ ] Wizard supports batching (add multiple items to same doc)
- [ ] Admin can toggle Global vs Project view
- [ ] Admin can CRUD field options
- [ ] Project view shows global options greyed with "Enable" action
- [ ] Animations and transitions smooth
- [ ] Keyboard navigation works
- [ ] Error messages display properly
