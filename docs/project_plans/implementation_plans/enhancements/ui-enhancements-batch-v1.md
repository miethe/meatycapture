---
title: "Implementation Plan: UI Enhancements Batch v1"
description: "Detailed implementation plan for item card CRUD actions, multi-select combobox fields, document management, and capture screen improvements"
audience: [ai-agents, developers, engineering-lead]
tags: [implementation-plan, ui-enhancements, viewer, wizard, item-management, document-management]
created: 2026-01-01
updated: 2026-01-01
category: "implementation-planning"
status: ready-for-implementation
complexity: "Medium (M)"
track: "Standard Track"
estimated_effort: "47 story points"
timeline: "3-4 weeks"
related:
  - docs/project_plans/implementation_plans/features/request-log-viewer-v1.md
  - docs/project_plans/implementation_plans/harden-polish/mobile-viewer-ux-v1.md
---

# Implementation Plan: UI Enhancements Batch v1

**Complexity:** Medium (M) | **Track:** Standard Track
**Estimated Effort:** 47 story points | **Timeline:** 3-4 weeks (parallel execution with 1-2 subagents)

**Plan ID:** `IMPL-20260101-UI-ENHANCEMENTS-BATCH-V1`

---

## Executive Summary

Combine three enhancement groups into a cohesive implementation that enhances MeatyCapture's item and document management capabilities. This plan adds inline CRUD operations for items (Edit/Delete), introduces multi-select combobox fields for Domain and Context, adds document-level management (kebab menu with delete/archive/edit), improves document filtering with archive support, and clarifies the capture wizard's step indicators.

**Key Deliverables:**
1. **Item CRUD Layer:** Edit and Delete actions with confirmation dialogs and modals
2. **Modified Field:** Auto-updating timestamp on any item change
3. **Multi-Select Component Foundation:** Shared combobox component for Domain, Context, and Tags
4. **Document Management:** Kebab menu, archive status, document-level filtering
5. **Capture Screen Polish:** Dynamic step indicator showing document filename

**Success Criteria:**
- All item CRUD operations work correctly (Edit/Delete with confirmations)
- Modified field auto-updates on any change method
- Multi-select combobox allows selection AND inline entry
- Document archive/delete require confirmation
- Step 2 indicator shows actual document filename
- Zero accessibility violations (WCAG 2.1 AA)
- All features work on both desktop (web) and Tauri platforms
- Bundle size impact <30KB gzipped

---

## Implementation Strategy

### Architecture Sequence

Following MeatyCapture's layered architecture:
1. **Model Layer** - Add Modified field to RequestLogItem, archived status to RequestLogDoc
2. **Component Layer** - Build shared MultiSelectCombobox, ConfirmationDialog, EditModals
3. **Item Management Layer** - ItemCard CRUD (Edit/Delete icons, modals, handlers)
4. **Document Management Layer** - Document kebab menu, archive filtering
5. **Wizard Refinement Layer** - Dynamic step indicator, improved UX
6. **Testing Layer** - Unit, component, integration, accessibility tests
7. **Documentation Layer** - Component docs, user guides

### Parallel Work Opportunities

- Phases 1-2 can proceed in parallel (models + shared components)
- Item CRUD (Phase 3) and Document Management (Phase 4) can overlap significantly
- Component styling and testing can be done in parallel with implementation
- Mobile and desktop testing can be conducted together

### Critical Path

1. Model updates (Phase 1) - Required by all downstream phases
2. Shared components (Phase 2) - Required by Item CRUD and Document Management
3. Item CRUD (Phase 3) and Document Management (Phase 4) - Can overlap
4. Wizard improvements (Phase 5) - Dependent on completion of earlier phases
5. Testing (Phase 6) - Comprehensive validation of all features

---

## Phase Breakdown

### Phase 1: Model Layer Updates (4 story points)

**Duration:** 0.5-1 day
**Dependencies:** None
**Assigned Subagent(s):** backend-typescript-architect

Add Modified field to RequestLogItem and archived status to RequestLogDoc. These are minimal, focused changes to the domain models.

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| M1.1 | Add Modified field to RequestLogItem | Add `modified_at: Date` field that auto-updates on any item change | - [ ] Field added to RequestLogItem interface<br>- [ ] Type guards updated<br>- [ ] Serializer updated to read/write field<br>- [ ] Default: equals `created_at` on creation<br>- [ ] No breaking changes to existing docs | 2 | backend-typescript-architect | None |
| M1.2 | Add archived status to RequestLogDoc | Add `archived: boolean` field to document model; default false | - [ ] Field added to RequestLogDoc interface<br>- [ ] Type guards updated<br>- [ ] Serializer handles field (frontmatter)<br>- [ ] Backward compatible (defaults to false)<br>- [ ] Migration path documented | 2 | backend-typescript-architect | None |

**Phase 1 Quality Gate:**
- [ ] Models compile without errors
- [ ] Type guards validate correctly
- [ ] Serializer round-trips modified/archived fields
- [ ] Existing test data still loads (backward compatibility)

---

### Phase 2: Shared Components Foundation (10 story points)

**Duration:** 1.5-2 days
**Dependencies:** Phase 1 complete (for model knowledge)
**Assigned Subagent(s):** ui-engineer-enhanced, frontend-developer

Build reusable component library for all three enhancement groups: MultiSelectCombobox, ConfirmationDialog, and EditModal base.

#### Phase 2.1: Multi-Select Combobox

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| C2.1 | Create MultiSelectCombobox component | Shared combobox for Domain, Context, Tags with multi-select + inline entry | - [ ] Component at `src/ui/shared/MultiSelectCombobox.tsx`<br>- [ ] Props: `options: string[]`, `selected: string[]`, `onSelect`, `onRemove`, `onAdd`, `placeholder`<br>- [ ] Dropdown shows options, allows filtering by typing<br>- [ ] Selected values display as badges above field<br>- [ ] Each badge has X button for removal<br>- [ ] Typing new value not in list shows "Add {value}" option<br>- [ ] New entries visually distinct (different background or border)<br>- [ ] Keyboard navigation: arrow keys, Enter to select, Escape to close<br>- [ ] Touch/click support for badge removal<br>- [ ] Accessibility: ARIA labels, role=combobox, live region for suggestions<br>- [ ] Snapshot tests for all states | 5 | ui-engineer-enhanced | Phase 1 |
| C2.2 | Create ConfirmationDialog component | Generic confirmation dialog for delete/archive operations | - [ ] Component at `src/ui/shared/ConfirmationDialog.tsx`<br>- [ ] Props: `isOpen`, `title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`, `isDangerous`<br>- [ ] Modal overlay with centered dialog<br>- [ ] Dangerous actions (delete/archive) highlighted in red<br>- [ ] Buttons: Cancel (left) and Confirm (right)<br>- [ ] Focus trap (Tab stays within dialog)<br>- [ ] Escape key closes dialog (cancel)<br>- [ ] Accessible: aria-modal, aria-labelledby<br>- [ ] Snapshot tests | 3 | ui-engineer-enhanced | Phase 1 |
| C2.3 | Create EditModal base component | Generic modal wrapper for item/document edit forms | - [ ] Component at `src/ui/shared/EditModal.tsx`<br>- [ ] Props: `isOpen`, `title`, `children` (form content), `onClose`, `onSave`<br>- [ ] Modal overlay with centered dialog<br>- [ ] Header with title and close button (X)<br>- [ ] Footer with Cancel and Save buttons<br>- [ ] Form scrollable if content exceeds viewport<br>- [ ] Focus trap<br>- [ ] Escape key closes (cancel)<br>- [ ] Accessible: aria-modal, aria-labelledby<br>- [ ] Snapshot tests | 2 | ui-engineer-enhanced | Phase 1 |

#### Phase 2.2: CSS Styling

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| C2.4 | Add shared components CSS | Styling for MultiSelectCombobox, ConfirmationDialog, EditModal | - [ ] File at `src/ui/shared/shared-components.css`<br>- [ ] MultiSelectCombobox: dropdown positioning, badge styling, input layout<br>- [ ] ConfirmationDialog: modal overlay, centered dialog, danger styling<br>- [ ] EditModal: modal overlay, header/footer layout, scrolling<br>- [ ] Glass morphism consistent with existing UI<br>- [ ] Touch targets >= 44px<br>- [ ] Responsive on mobile (bottom sheets on small screens)<br>- [ ] ~250 lines of CSS | 3 | frontend-developer | C2.1-C2.3 |

**Phase 2 Quality Gate:**
- [ ] All 3 components render without errors
- [ ] Snapshot tests pass
- [ ] TypeScript strict mode compliant (no any types)
- [ ] Accessibility audit passed (axe-core)
- [ ] Touch targets all >= 44px minimum
- [ ] Works on mobile viewport (<=768px)

---

### Phase 3: Item Card CRUD Operations (12 story points)

**Duration:** 2-2.5 days
**Dependencies:** Phase 2 complete (shared components)
**Assigned Subagent(s):** ui-engineer-enhanced, backend-typescript-architect

Add Edit and Delete buttons to ItemCard, with modals for editing all item fields.

#### Phase 3.1: ItemCard Enhancement

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| I3.1 | Add Edit/Delete icons to ItemCard | Add top-right icon buttons for Edit and Delete | - [ ] Icons added to ItemCard at top-right corner<br>- [ ] Edit icon (pencil/edit symbol)<br>- [ ] Delete icon (trash/delete symbol)<br>- [ ] Both icons 24x24px, align right in header<br>- [ ] Accessible: aria-label for each icon<br>- [ ] Hover effects (highlight/scale)<br>- [ ] Touch-friendly (44px+ click target)<br>- [ ] Props: `onEdit`, `onDelete` callbacks<br>- [ ] No layout shift on icon display/hide<br>- [ ] Works with existing ItemCard content | 3 | ui-engineer-enhanced | Phase 2 |
| I3.2 | Create ItemEditForm component | Form for editing all RequestLogItem fields | - [ ] Component at `src/ui/viewer/ItemEditForm.tsx`<br>- [ ] Fields: title, type, domain, context, priority, status, tags, notes<br>- [ ] Domain/Context use MultiSelectCombobox (allow multi + inline entry)<br>- [ ] Tags use existing MultiSelectWithAdd<br>- [ ] Type/Priority/Status use DropdownWithAdd<br>- [ ] Notes textarea with markdown preview (optional)<br>- [ ] Form validation before save<br>- [ ] Props: `item: RequestLogItem`, `onSave`, `onCancel`<br>- [ ] Accessible: form labels, required fields marked<br>- [ ] Snapshot tests | 4 | ui-engineer-enhanced | Phase 2 |
| I3.3 | Implement Item Edit modal flow | Connect ItemCard to ItemEditForm via EditModal | - [ ] ItemCard Edit button opens EditModal with ItemEditForm<br>- [ ] Form pre-populated with current item values<br>- [ ] Save button calls `onSave(updatedItem)` callback<br>- [ ] Updated item includes new `modified_at` timestamp<br>- [ ] Modal closes on save or cancel<br>- [ ] Error handling with user feedback (Toast)<br>- [ ] Props: `onItemUpdated` callback for parent to handle persistence<br>- [ ] Snapshot tests | 2 | ui-engineer-enhanced | I3.2 |
| I3.4 | Implement Item Delete flow | Connect ItemCard to ConfirmationDialog for deletion | - [ ] ItemCard Delete button opens ConfirmationDialog<br>- [ ] Dialog message: "Delete item REQ-XXX? This cannot be undone."<br>- [ ] Confirm button is red (dangerous action styling)<br>- [ ] On confirm, calls `onItemDeleted(itemId)` callback<br>- [ ] Parent handles removal from document and persistence<br>- [ ] Success Toast feedback ("Item deleted")<br>- [ ] Error handling with user feedback<br>- [ ] Snapshot tests | 2 | ui-engineer-enhanced | Phase 2 |
| I3.5 | Update ItemCard to auto-update Modified field | Ensure Modified field updates on any edit method | - [ ] ItemCard Edit workflow updates `modified_at`<br>- [ ] Serializer auto-updates `modified_at` on write<br>- [ ] Viewer displays Modified date alongside Created<br>- [ ] Unit tests verify timestamp updates<br>- [ ] Backward compatible with old items (no modified_at) | 1 | backend-typescript-architect | M1.1 |

**Phase 3 Quality Gate:**
- [ ] ItemCard renders with Edit/Delete icons
- [ ] Edit modal opens, form pre-populates, save works
- [ ] Delete confirmation shows, delete removes item
- [ ] Modified field updates on edit
- [ ] All accessibility tests pass
- [ ] Mobile-responsive (icons reposition on small screens)
- [ ] Component tests >80% coverage

---

### Phase 4: Document Management (13 story points)

**Duration:** 2-2.5 days
**Dependencies:** Phase 2 complete (shared components)
**Assigned Subagent(s):** ui-engineer-enhanced, backend-typescript-architect

Add document-level CRUD: kebab menu (Delete/Archive/Edit/Add Item), filtering, and step indicator updates.

#### Phase 4.1: Document Kebab Menu

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| D4.1 | Create KebabMenu component | Generic menu component (can reuse for other features) | - [ ] Component at `src/ui/shared/KebabMenu.tsx`<br>- [ ] Props: `items: { label, icon?, onClick, isDangerous? }[]`<br>- [ ] Trigger: 3-dot icon button (kebab)<br>- [ ] Menu items list with hover/focus states<br>- [ ] Dangerous items (delete/archive) highlighted in red<br>- [ ] Closes on item selection or outside click<br>- [ ] Keyboard navigation (arrow keys, Enter)<br>- [ ] Accessible: role=menu, aria-haspopup<br>- [ ] Touch-friendly positioning<br>- [ ] Snapshot tests | 3 | ui-engineer-enhanced | Phase 2 |
| D4.2 | Create DocumentKebabMenu component | Specialized menu for document operations | - [ ] Component at `src/ui/viewer/DocumentKebabMenu.tsx`<br>- [ ] Menu items:<br>  - Delete Document (red, dangerous)<br>  - Archive Document (orange, requires confirm)<br>  - Edit Document (blue)<br>  - Add Item (green, navigates to capture)<br>- [ ] Props: `doc: RequestLogDoc`, `onDelete`, `onArchive`, `onEdit`, `onAddItem`<br>- [ ] Uses KebabMenu component<br>- [ ] Snapshot tests | 2 | ui-engineer-enhanced | D4.1 |
| D4.3 | Create DocumentDeleteConfirm flow | Delete confirmation for document with cascading items count | - [ ] Confirmation dialog shows doc_id and item count<br>- [ ] Message: "Delete document REQ-XXX with N items? This cannot be undone."<br>- [ ] Calls `onDocumentDeleted(docId)` callback<br>- [ ] Parent handles document removal and persistence<br>- [ ] Success Toast feedback<br>- [ ] Error handling | 2 | ui-engineer-enhanced | D4.2 |
| D4.4 | Create DocumentArchiveConfirm flow | Archive confirmation (non-destructive, hides from active view) | - [ ] Confirmation dialog shows doc_id<br>- [ ] Message: "Archive document REQ-XXX? You can restore it later."<br>- [ ] On confirm, sets `archived: true`<br>- [ ] Calls `onDocumentArchived(docId)` callback<br>- [ ] Document removed from active list (reappears in Archived filter)<br>- [ ] Success Toast feedback<br>- [ ] Includes Unarchive option for archived docs<br>- [ ] Error handling | 2 | ui-engineer-enhanced | D4.2 |
| D4.5 | Create DocumentEditForm component | Form for editing document-level fields | - [ ] Component at `src/ui/viewer/DocumentEditForm.tsx`<br>- [ ] Editable fields: title (required)<br>- [ ] Optional: Add description/notes field for document metadata<br>- [ ] Form validation<br>- [ ] Props: `doc: RequestLogDoc`, `onSave`, `onCancel`<br>- [ ] Snapshot tests | 2 | ui-engineer-enhanced | Phase 2 |

#### Phase 4.2: Document Filtering & Status

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| D4.6 | Add document status filter to DocumentFilters | New filter for All/Active/Archived documents | - [ ] Filter dropdown added to DocumentFilters toolbar<br>- [ ] Options: All, Active (not archived), Archived<br>- [ ] Default: Active<br>- [ ] Integrated with existing FilterState<br>- [ ] Affects catalog display (filters by archived status)<br>- [ ] Badge shows if filtering is active<br>- [ ] Accessible: aria-label for dropdown | 2 | frontend-developer | D4.1 |
| D4.7 | Update DocumentCatalog to show archive status | Visual indicator for archived documents | - [ ] Archived documents show badge/flag in catalog<br>- [ ] Can be toggled off via status filter<br>- [ ] Styling: grayed out or badge indicator<br>- [ ] Snapshot tests | 1 | ui-engineer-enhanced | D4.6 |

#### Phase 4.3: Add Item Navigation

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| D4.8 | Implement "Add Item" menu action | Navigate to capture wizard at Step 3 with document pre-selected | - [ ] KebabMenu "Add Item" action navigates to capture<br>- [ ] Captures selected document ID and passes to capture flow<br>- [ ] Capture wizard opens at Step 3 (Item Details)<br>- [ ] Project and Document are pre-selected (read-only)<br>- [ ] User can immediately enter item details<br>- [ ] Integration with existing navigation/routing<br>- [ ] Works on web and Tauri | 2 | frontend-developer | Phase 4.1 |

**Phase 4 Quality Gate:**
- [ ] Document kebab menu renders and shows options
- [ ] Delete/Archive confirmations work correctly
- [ ] Document status filter works
- [ ] Archive badge displays on archived docs
- [ ] "Add Item" navigation works
- [ ] All accessibility tests pass
- [ ] Mobile-responsive
- [ ] Component tests >80% coverage

---

### Phase 5: Wizard Improvements & Polish (5 story points)

**Duration:** 1 day
**Dependencies:** Phase 2 complete (optionally Phase 4 for Add Item flow)
**Assigned Subagent(s):** frontend-developer, ui-engineer-enhanced

Improve Step 2 indicator to show actual document filename instead of generic "Document".

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| W5.1 | Update DocStep indicator logic | Change Step 2 label to show selected/created document filename | - [ ] DocStep component updated to pass doc name to StepProgress<br>- [ ] After "Create new..." selected, Step 2 shows "REQ-YYYYMMDD-project-name"<br>- [ ] After "Add to existing..." selected, Step 2 shows selected doc filename<br>- [ ] While in step, label shows "Document" (placeholder)<br>- [ ] After step complete, label shows actual filename<br>- [ ] Props: update StepProgress to accept optional `overrideLabel`<br>- [ ] Unit tests verify label updates | 2 | frontend-developer | Phase 2 |
| W5.2 | Update StepProgress component | Support dynamic step labels and formatting | - [ ] StepProgress accepts `steps` array with mutable labels (or override)<br>- [ ] Update labels dynamically based on state<br>- [ ] Formatting: truncate long filenames (max 30 chars + ellipsis)<br>- [ ] Tooltip shows full filename on hover<br>- [ ] No layout shift when label changes<br>- [ ] Snapshot tests | 1 | ui-engineer-enhanced | Phase 2 |
| W5.3 | Test wizard flow end-to-end | Verify step indicator updates correctly through full wizard flow | - [ ] Capture flow from project selection through review<br>- [ ] Step indicator updates at each stage<br>- [ ] Mobile and desktop viewports<br>- [ ] Keyboard navigation | 1 | frontend-developer | W5.1 |
| W5.4 | Polish and animations | Smooth transitions for step indicator updates | - [ ] Step label changes trigger subtle transition (fade/slide)<br>- [ ] No animation on mount, only on updates<br>- [ ] Respects prefers-reduced-motion<br>- [ ] ~50 lines CSS | 1 | frontend-developer | W5.1 |

**Phase 5 Quality Gate:**
- [ ] Step 2 indicator shows document filename after selection
- [ ] Label updates smoothly without layout shift
- [ ] Long filenames truncated with tooltip
- [ ] Mobile responsive
- [ ] Accessibility tests pass

---

### Phase 6: Testing & Quality Assurance (3 story points)

**Duration:** 1 day
**Dependencies:** All phases 1-5 complete
**Assigned Subagent(s):** ui-engineer-enhanced, frontend-developer, task-completion-validator

Comprehensive testing across all new features to ensure quality and accessibility.

#### Phase 6.1: Component & Unit Testing

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| T6.1 | Write MultiSelectCombobox tests | Unit and component tests for combobox behavior | - [ ] Snapshot tests for all states<br>- [ ] Selection/removal functionality tests<br>- [ ] Keyboard navigation tests<br>- [ ] Inline entry tests<br>- [ ] Accessibility tests (axe-core)<br>- [ ] >85% coverage | 1 | ui-engineer-enhanced | Phase 2 |
| T6.2 | Write ConfirmationDialog tests | Dialog behavior, confirmations, accessibility | - [ ] Render tests<br>- [ ] Confirmation/cancellation callbacks<br>- [ ] Keyboard navigation (Escape, Tab)<br>- [ ] Accessibility tests<br>- [ ] >85% coverage | 0.5 | ui-engineer-enhanced | Phase 2 |
| T6.3 | Write ItemCard CRUD tests | Edit/Delete workflows, modified field updates | - [ ] ItemCard render with icons<br>- [ ] Edit modal opens/closes<br>- [ ] Form pre-population and submission<br>- [ ] Delete confirmation flow<br>- [ ] Modified field updates<br>- [ ] Error handling<br>- [ ] >85% coverage | 1 | ui-engineer-enhanced | Phase 3 |
| T6.4 | Write Document management tests | Kebab menu, delete/archive flows, filtering | - [ ] KebabMenu render and selection<br>- [ ] Delete confirmation and callback<br>- [ ] Archive confirmation and callback<br>- [ ] Document edit modal<br>- [ ] Archive filter filtering<br>- [ ] Archived document badge display<br>- [ ] >85% coverage | 1 | ui-engineer-enhanced | Phase 4 |

#### Phase 6.2: Integration Testing

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| T6.5 | Integration test: Item CRUD workflow | Full workflow from ItemCard edit to persistence | - [ ] Load document with items<br>- [ ] Edit item -> save -> modified_at updates<br>- [ ] Delete item -> confirmation -> removed<br>- [ ] Modified items persist correctly<br>- [ ] Works with all DocStore adapters<br>- [ ] Test on web and Tauri | 1 | frontend-developer | Phase 3 |
| T6.6 | Integration test: Document management workflow | Full document CRUD workflow | - [ ] Delete document -> confirmation -> removed<br>- [ ] Archive document -> removed from active list<br>- [ ] Unarchive document -> restored<br>- [ ] Edit document -> updated<br>- [ ] Add item -> navigates to capture correctly<br>- [ ] Works with all DocStore adapters | 1 | frontend-developer | Phase 4 |

#### Phase 6.3: Accessibility & Cross-Platform

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| T6.7 | Accessibility audit (axe-core + keyboard) | Full WCAG 2.1 AA compliance check | - [ ] Zero axe violations<br>- [ ] Full keyboard navigation (Tab, Enter, Escape, Arrow keys)<br>- [ ] Screen reader testing (NVDA/JAWS if possible)<br>- [ ] Focus indicators visible and logical<br>- [ ] Form labels associated correctly<br>- [ ] Errors announced to screen readers<br>- [ ] Report: accessibility-audit-ui-enhancements.md | 1 | task-completion-validator | All phases |
| T6.8 | Cross-platform testing | Web and Tauri desktop validation | - [ ] All features work on web (Chrome, Firefox, Safari)<br>- [ ] All features work on Tauri (macOS, Windows)<br>- [ ] Mobile breakpoint testing (<=768px)<br>- [ ] Touch interactions work on mobile<br>- [ ] No platform-specific regressions | 0.5 | frontend-developer | All phases |

**Phase 6 Quality Gate:**
- [ ] All tests passing (unit, component, integration)
- [ ] Code coverage >80% for all new code
- [ ] Zero axe accessibility violations
- [ ] Keyboard navigation working
- [ ] Cross-browser testing complete
- [ ] Cross-platform (web + Tauri) testing complete
- [ ] No regressions in existing features

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|-------------------|
| Model changes break existing docs | High | Medium | Extensive backward compatibility testing, migration documentation |
| Multi-select component complexity | Medium | Low | Reuse proven patterns from existing MultiSelectWithAdd, component testing |
| Modal/form validation complexity | Medium | Low | Use existing form infrastructure, thorough component tests |
| Archive feature introduces bugs in filtering | Medium | Medium | Comprehensive filter tests, integration testing with all adapters |
| Performance impact from edit/delete operations | Low | Low | Optimize re-renders, profile before/after |

### Schedule Risks

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|-------------------|
| Scope creep (feature requests during impl) | Medium | Medium | Clear scope boundaries, change request process |
| Complex cross-dependencies between phases | Low | Low | Phase 1 (models) is simple and fast, enables others |
| Unexpected issues in model layer | High | Low | Early testing and validation in Phase 1, small incremental changes |
| Mobile testing delays | Medium | Low | Test mobile breakpoint early (Phase 2), iterative testing |

---

## Resource Requirements

### Team Composition
- **UI Engineer (Sonnet):** 1.5 FTE (Phases 2-6, focus on components and styling)
- **Frontend Developer (Sonnet):** 0.75 FTE (Phases 2-6, focus on integration and testing)
- **Backend/TypeScript Architect (Sonnet):** 0.5 FTE (Phases 1, 3, 5 - model updates and core logic)
- **Validation Specialist (Sonnet):** 0.25 FTE (Phase 6 - accessibility and quality gates)

### Skill Requirements
- TypeScript, React, component composition
- Headless component patterns (accessible modals, menus, forms)
- CSS Grid/Flexbox, responsive design
- Testing: Vitest, React Testing Library, axe-core
- Accessibility: WCAG 2.1 AA, ARIA patterns
- Git, CI/CD, Tauri platform basics

---

## Success Metrics

### Delivery Metrics
- On-time delivery (±5% of estimate)
- Code coverage >80% for all new code
- Zero P0/P1 bugs in first week of deployment
- All acceptance criteria met

### User Experience Metrics
- Item edit/delete completes in <1 second
- Document kebab menu opens in <300ms
- No modal lag or animation stuttering (60fps)
- Confirmation dialogs clearly communicate actions

### Technical Metrics
- 100% of new components have snapshot tests
- 100% of new components pass axe accessibility audit
- Zero TypeScript errors in strict mode
- Bundle size impact <30KB gzipped

---

## Communication Plan

- **Daily standups** for progress tracking and blocker resolution
- **Phase reviews** after each phase completion (approval gate)
- **Weekly sync** with stakeholders on progress and any issues
- **Accessibility review** before Phase 6 completion
- **Final QA sign-off** before production deployment

---

## Post-Implementation

- Performance monitoring for edit/delete operations
- User feedback collection on new CRUD features
- Error tracking for any reported issues with modified_at field
- Archive feature usage analytics
- Technical debt documentation for future improvements
- Documentation updates for new features

---

## Detailed Task Breakdown by Phase

### Phase 1 Tasks (Sequential)
1. M1.1: Add Modified field (backend-typescript-architect) - 2 pts
2. M1.2: Add archived status (backend-typescript-architect) - 2 pts

### Phase 2 Tasks (Parallel)
1. C2.1: MultiSelectCombobox component (ui-engineer-enhanced) - 5 pts
2. C2.2: ConfirmationDialog component (ui-engineer-enhanced) - 3 pts
3. C2.3: EditModal base component (ui-engineer-enhanced) - 2 pts
4. C2.4: Shared components CSS (frontend-developer) - 3 pts [after C2.1-C2.3]

### Phase 3 Tasks (Sequential with overlap)
1. I3.1: Add Edit/Delete icons to ItemCard (ui-engineer-enhanced) - 3 pts
2. I3.2: Create ItemEditForm component (ui-engineer-enhanced) - 4 pts
3. I3.3: Implement Item Edit modal flow (ui-engineer-enhanced) - 2 pts
4. I3.4: Implement Item Delete flow (ui-engineer-enhanced) - 2 pts
5. I3.5: Update ItemCard to auto-update Modified field (backend-typescript-architect) - 1 pt

### Phase 4 Tasks (Parallel in two groups)
**Group 1: Kebab Menu & Operations**
1. D4.1: Create KebabMenu component (ui-engineer-enhanced) - 3 pts
2. D4.2: Create DocumentKebabMenu component (ui-engineer-enhanced) - 2 pts
3. D4.3: Create DocumentDeleteConfirm flow (ui-engineer-enhanced) - 2 pts
4. D4.4: Create DocumentArchiveConfirm flow (ui-engineer-enhanced) - 2 pts
5. D4.5: Create DocumentEditForm component (ui-engineer-enhanced) - 2 pts

**Group 2: Filtering & Navigation**
1. D4.6: Add document status filter (frontend-developer) - 2 pts
2. D4.7: Update DocumentCatalog for archive status (ui-engineer-enhanced) - 1 pt
3. D4.8: Implement "Add Item" menu action (frontend-developer) - 2 pts

### Phase 5 Tasks (Sequential)
1. W5.1: Update DocStep indicator logic (frontend-developer) - 2 pts
2. W5.2: Update StepProgress component (ui-engineer-enhanced) - 1 pt
3. W5.3: Test wizard flow end-to-end (frontend-developer) - 1 pt
4. W5.4: Polish and animations (frontend-developer) - 1 pt

### Phase 6 Tasks (Parallel testing groups)
1. T6.1: MultiSelectCombobox tests (ui-engineer-enhanced) - 1 pt
2. T6.2: ConfirmationDialog tests (ui-engineer-enhanced) - 0.5 pts
3. T6.3: ItemCard CRUD tests (ui-engineer-enhanced) - 1 pt
4. T6.4: Document management tests (ui-engineer-enhanced) - 1 pt
5. T6.5: Item CRUD integration tests (frontend-developer) - 1 pt
6. T6.6: Document management integration tests (frontend-developer) - 1 pt
7. T6.7: Accessibility audit (task-completion-validator) - 1 pt
8. T6.8: Cross-platform testing (frontend-developer) - 0.5 pts

---

## Integration Points with Existing Systems

### DocStore Integration
- Item Edit/Delete operations persist via `DocStore.write()` or `DocStore.append()`
- Document Delete/Archive operations persist via `DocStore.write()`
- All operations handle potential write failures gracefully with Toast feedback

### ProjectStore Integration
- Document Add Item flow loads projects for navigation context
- No changes needed to ProjectStore interface

### Field Catalog Integration
- MultiSelectCombobox uses existing field option catalog for Domain/Context/Tags suggestions
- Inline entry adds to local session (or project-specific options on save)

### Existing Component Integration
- Reuse DropdownWithAdd for Type/Priority/Status fields
- Reuse MultiSelectWithAdd for Tags field
- Use existing Toast system for success/error feedback
- Use existing modal patterns from Admin features

---

## Linear Compatibility

All tasks are structured for Linear import with:
- Unique Task IDs (M1.1, C2.1, I3.1, D4.1, W5.1, T6.1, etc.)
- Clear acceptance criteria (checkboxes for Linear Task Checklist)
- Effort estimates in story points (Linear supports Fibonacci: 1, 2, 3, 5, 8, 13, 21)
- Phase grouping for milestone tracking
- Dependency mapping for sequencing
- Assigned subagents as team members

**Estimated Total Effort:** 47 story points
**Recommended Team:** 2-3 engineers in parallel
**Target Timeline:** 3-4 weeks (accounting for review cycles and testing)

---

## Implementation Plan Version

**Version:** 1.0
**Created:** 2026-01-01
**Last Updated:** 2026-01-01
**Status:** Ready for Implementation

**Next Steps:**
1. Review plan with stakeholders
2. Assign subagents to phases (ui-engineer-enhanced, frontend-developer, backend-typescript-architect)
3. Create progress tracking document at `.claude/progress/ui-enhancements-batch-v1/all-phases-progress.md`
4. Begin Phase 1 (model layer updates)
5. Create Linear project with all tasks

---

**Progress Tracking:**

See `.claude/progress/ui-enhancements-batch-v1/all-phases-progress.md` (to be created during implementation)
