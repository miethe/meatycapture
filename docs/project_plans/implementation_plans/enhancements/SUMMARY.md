# UI Enhancements Batch v1 - Quick Reference

**Plan ID:** `IMPL-20260101-UI-ENHANCEMENTS-BATCH-V1`
**Status:** Ready for Implementation
**Created:** 2026-01-01

---

## What's Being Built

Three enhancement groups combined into one cohesive implementation plan:

### 1. Item CRUD Actions (Group 1: REQ-01 Part 1)
- Edit and Delete icons in top-right corner of ItemCard
- Edit button opens modal with form to edit all fields
- Delete button opens confirmation dialog
- **NEW:** Modified field auto-updates on any change

### 2. Multi-Select Combobox Fields (Group 2: REQ-02)
- Domain and Context fields become dropdowns with multi-select
- Support selecting from existing options OR typing new ones
- Selected values show as badges above the field
- Badges have X button for removal
- Reusable component for all multi-select fields

### 3. Document Management & Improvements (Group 3: REQ-03)
- **Kebab menu** on documents with: Delete, Archive, Edit, Add Item
- **Archive status** - non-destructive way to hide documents
- **Document filtering** - filter by All/Active/Archived
- **Add Item action** - navigate to capture wizard at Step 3
- **Step indicator polish** - Step 2 shows actual document filename

---

## By The Numbers

| Metric | Value |
|--------|-------|
| **Total Effort** | 47 story points |
| **Timeline** | 3-4 weeks |
| **Phases** | 6 sequential phases |
| **Components** | 5 new shared + many specialized |
| **Tests** | Comprehensive unit, integration, accessibility |
| **Bundle Impact** | <30KB gzipped |
| **Accessibility** | WCAG 2.1 AA compliant |

---

## Phase Breakdown (Quick View)

| Phase | Duration | Effort | Focus |
|-------|----------|--------|-------|
| 1 | 0.5-1 day | 4 pts | Add `modified_at` and `archived` to models |
| 2 | 1.5-2 days | 13 pts | Build shared components (MultiSelectCombobox, ConfirmationDialog, EditModal) |
| 3 | 2-2.5 days | 12 pts | Item CRUD (Edit/Delete icons, forms, modals) |
| 4 | 2-2.5 days | 13 pts | Document management (kebab menu, archive, filtering) |
| 5 | 1 day | 5 pts | Wizard polish (dynamic step indicator) |
| 6 | 1 day | 6 pts | Testing & QA (components, integration, accessibility) |

---

## Component Inventory

### New Shared Components (Phase 2)
1. **MultiSelectCombobox** (5 pts) - Select from or type new options, display as badges
2. **ConfirmationDialog** (3 pts) - Generic confirmation for delete/archive
3. **EditModal** (2 pts) - Generic modal wrapper for forms
4. **KebabMenu** (3 pts) - Generic 3-dot menu component
5. Styling (3 pts) - Glass morphism CSS for all shared components

### Modified Components
- **ItemCard** - Add Edit/Delete icons (top-right corner)
- **DocumentCatalog** - Show archive badge, integrate filters
- **DocumentFilters** - Add archive status filter (All/Active/Archived)
- **DocStep** - Pass document filename for dynamic step indicator
- **StepProgress** - Support dynamic labels

### New Specialized Components
- **ItemEditForm** - Edit all RequestLogItem fields
- **DocumentKebabMenu** - Menu specific to documents
- **DocumentEditForm** - Edit document title/metadata

---

## Architecture Pattern

```
Shared Components (Phase 2)
├── MultiSelectCombobox
├── ConfirmationDialog
├── EditModal
└── KebabMenu
    ↓
Item CRUD (Phase 3)
├── ItemCard + icons
├── ItemEditForm
└── Delete confirmation flow
    ↓
Document Management (Phase 4)
├── DocumentKebabMenu
├── Archive/Delete flows
├── Document status filter
└── Add Item navigation
    ↓
Wizard Polish (Phase 5)
└── Dynamic step indicator
    ↓
Testing & QA (Phase 6)
└── Component, integration, accessibility tests
```

---

## Team Assignment

| Role | Phases | Focus |
|------|--------|-------|
| **ui-engineer-enhanced** (Sonnet) | 2, 3, 4, 5, 6 | Components, UI/UX, styling |
| **frontend-developer** (Sonnet) | 2, 4, 5, 6 | Integration, navigation, testing |
| **backend-typescript-architect** (Sonnet) | 1, 3, 5 | Models, types, logic |
| **task-completion-validator** (Sonnet) | 6 | Accessibility, quality gates |

---

## Key Features by Enhancement Group

### Group 1: Item CRUD
- Edit button → Form modal with all fields pre-populated → Save updates item
- Delete button → Confirmation dialog → Remove item from document
- Auto-update `modified_at` field on any change
- Success/error Toast feedback
- Full keyboard navigation

### Group 2: Multi-Select Fields
- Domain & Context fields use new MultiSelectCombobox
- Allow selecting multiple values from dropdown
- Allow typing new values not in the list
- Display selected values as badges above field
- Each badge has X button to remove it
- Works like existing Tags field

### Group 3: Document Management
- Kebab menu (3-dot icon) on each document
  - Delete → Confirmation → Remove document
  - Archive → Confirmation → Hide from active list
  - Edit → Modal → Update title/metadata
  - Add Item → Navigate to capture (Step 3) with doc pre-selected
- New archive filter (All/Active/Archived)
- Archived documents show visual badge in list
- Step 2 indicator in wizard shows actual document filename

---

## Success Criteria

### Functional
- [ ] Item Edit/Delete workflows complete end-to-end
- [ ] Modified field auto-updates on edit
- [ ] Multi-select combobox allows selection and inline entry
- [ ] Document kebab menu shows all options
- [ ] Archive/Delete operations require confirmation
- [ ] Archive filter hides/shows documents correctly
- [ ] Step indicator shows document filename
- [ ] Add Item navigation works

### Quality
- [ ] All tests passing (unit, component, integration)
- [ ] Code coverage >80%
- [ ] Zero axe accessibility violations
- [ ] Full keyboard navigation (Tab, Enter, Escape)
- [ ] Works on web (Chrome, Firefox, Safari)
- [ ] Works on Tauri (macOS, Windows)
- [ ] Bundle size impact <30KB gzipped

---

## Files Created

### Main Documentation
- **Implementation Plan:** `docs/project_plans/implementation_plans/enhancements/ui-enhancements-batch-v1.md` (465 lines)
- **Orchestration Guide:** `docs/project_plans/implementation_plans/enhancements/UI-ENHANCEMENTS-ORCHESTRATION.md`
- **This Summary:** `docs/project_plans/implementation_plans/enhancements/SUMMARY.md`

### Phase 6 Deliverables (To Be Created)
- Accessibility audit report (T6.7)
- Progress tracking document (`.claude/progress/ui-enhancements-batch-v1/all-phases-progress.md`)

---

## Critical Path

1. **Phase 1** (Models) - 1 day - Must complete first
   - Enables Phase 3 and 4

2. **Phase 2** (Shared Components) - 2 days - Blocker
   - Enables Phase 3 and 4
   - Can happen in parallel with Phase 1

3. **Phase 3 & 4** (Item & Document CRUD) - 5 days - Can overlap
   - Both depend on Phase 2
   - Can run in parallel with different engineers

4. **Phase 5** (Wizard Polish) - 1 day
   - Can start before Phase 6
   - Depends on Phase 1 context

5. **Phase 6** (Testing) - 1 day
   - Final validation step

**Total Timeline:** 3-4 weeks

---

## Recommended Parallel Execution

```
Week 1:
  Phase 1 (models) - day 1 by backend-typescript-architect
  Phase 2 (shared components) - days 1-2 by ui-engineer-enhanced + frontend-developer

Week 2:
  Phase 3 (item CRUD) - days 1-2.5 by ui-engineer-enhanced
  Phase 4 (doc management) - days 1-2.5 by ui-engineer-enhanced + frontend-developer [PARALLEL]

Week 3:
  Phase 5 (wizard polish) - day 1 by frontend-developer
  Phase 6 (testing) - day 2 by all agents [PARALLEL DURING PHASE 5]
```

**Optimization:** Phases 3 & 4 overlap 100% (different engineers on same types of work)

---

## Integration Checkpoints

- **After Phase 1:** Models compile, type guards pass
- **After Phase 2:** Shared components render, accessibility passes
- **After Phase 3:** ItemCard CRUD works, modified field updates
- **After Phase 4:** Document management works, filters work
- **After Phase 5:** Wizard flow complete, step indicator dynamic
- **After Phase 6:** All tests pass, accessibility clean, cross-platform tested

---

## Document References

- **Full Implementation Plan:** `docs/project_plans/implementation_plans/enhancements/ui-enhancements-batch-v1.md`
  - 465 lines of detailed task breakdown
  - All acceptance criteria
  - Effort estimates and dependencies
  - Risk mitigation strategies

- **Orchestration Guide:** `UI-ENHANCEMENTS-ORCHESTRATION.md`
  - Subagent coordination details
  - Architecture patterns
  - File structure and creation order
  - Handoff checklist template

- **This Summary:** `SUMMARY.md` (quick reference)

---

## Next Steps

1. Review plan with stakeholders
2. Assign subagents:
   - ui-engineer-enhanced (Sonnet)
   - frontend-developer (Sonnet)
   - backend-typescript-architect (Sonnet)
   - task-completion-validator (Sonnet)
3. Create Linear project with all 47 tasks
4. Create progress tracking: `.claude/progress/ui-enhancements-batch-v1/all-phases-progress.md`
5. Begin Phase 1 (model layer updates)

---

**Implementation Status:** Ready to Start
**Last Updated:** 2026-01-01
