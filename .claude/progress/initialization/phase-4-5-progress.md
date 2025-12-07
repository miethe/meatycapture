---
prd_name: initialization
phase: "4-5"
title: "Polish & UX + Packaging & Ops"
status: in_progress
completion: 0%
started_at: 2025-12-07
tasks:
  - id: TASK-4.1
    title: "Focus trap for modals"
    description: "Implement focus trap to cycle focus within modals (Add Project, Add Field Option)"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_time: "1h"
    status: pending
  - id: TASK-4.2
    title: "Toast/notification system"
    description: "Add toast component for success/error feedback on async operations (save, append, validation)"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_time: "1.5h"
    status: pending
  - id: TASK-4.3
    title: "Visual progress indicator"
    description: "Add step progress bar/dots to wizard showing current step and completion"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_time: "1h"
    status: pending
  - id: TASK-4.4
    title: "Enhanced inline validation"
    description: "Add field-level validation with real-time feedback, contextual help tooltips"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-4.2"]
    estimated_time: "1.5h"
    status: pending
  - id: TASK-4.5
    title: "Accessibility audit and fixes"
    description: "Comprehensive a11y pass: focus management, live regions, screen reader testing, reduced motion"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-4.1", "TASK-4.3"]
    estimated_time: "1h"
    status: pending
  - id: TASK-5.1
    title: "CLI for headless operation"
    description: "Add meatycapture CLI entry point for batch doc creation from JSON input"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimated_time: "2h"
    status: pending
  - id: TASK-5.2
    title: "Enhanced backup and logging"
    description: "Improve backup copy before writes, add structured logging for operations"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimated_time: "1.5h"
    status: pending
  - id: TASK-5.3
    title: "Desktop packaging prep (Tauri)"
    description: "Add Tauri configuration for desktop build, update package.json scripts"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-5.1", "TASK-5.2"]
    estimated_time: "2h"
    status: pending

parallelization:
  batch_1: ["TASK-4.1", "TASK-4.2", "TASK-4.3", "TASK-5.1", "TASK-5.2"]
  batch_2: ["TASK-4.4", "TASK-4.5"]
  batch_3: ["TASK-5.3"]
  critical_path: ["TASK-4.2", "TASK-4.4", "TASK-4.5"]
  estimated_total_time: "11.5h"
---

# Phase 4-5: Polish & UX + Packaging & Ops

## Objective
Complete UI polish, accessibility improvements, and optional packaging for desktop/CLI deployment.

## Orchestration Quick Reference

### Batch 1 (Parallel - No Dependencies)

```
Task("ui-engineer-enhanced", "TASK-4.1: Implement focus trap for modals...")
Task("ui-engineer-enhanced", "TASK-4.2: Add toast notification system...")
Task("ui-engineer-enhanced", "TASK-4.3: Add visual progress indicator...")
Task("backend-typescript-architect", "TASK-5.1: Add CLI entry point...")
Task("backend-typescript-architect", "TASK-5.2: Enhance backup and logging...")
```

### Batch 2 (Depends on Batch 1)

```
Task("ui-engineer-enhanced", "TASK-4.4: Enhanced inline validation...")
Task("ui-engineer-enhanced", "TASK-4.5: Accessibility audit and fixes...")
```

### Batch 3 (Depends on Batch 2)

```
Task("backend-typescript-architect", "TASK-5.3: Desktop packaging with Tauri...")
```

## Work Log

| Timestamp | Task | Action | Commit |
|-----------|------|--------|--------|
| 2025-12-07 | Phase Start | Initialized progress tracking | - |

## Decisions Log

_No decisions recorded yet._

## Context

### Existing Foundations (from Phase 2-3)
- Glass/morphism design system with CSS variables
- ARIA attributes across components (76+ instances)
- Keyboard shortcuts (Cmd+Enter, Escape)
- Loading states with skeleton/spinner
- Animation keyframes (16+ defined)
- Reduced motion support

### Gap Analysis
- Missing: Focus trap for modals
- Missing: Toast notifications for async feedback
- Missing: Visual progress bar for wizard
- Missing: CLI entry point for headless operation
- Missing: Tauri/Electron desktop wrapper
