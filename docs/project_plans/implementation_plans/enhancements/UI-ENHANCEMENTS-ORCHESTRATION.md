# UI Enhancements Batch v1 - Subagent Orchestration Guide

**Plan:** `IMPL-20260101-UI-ENHANCEMENTS-BATCH-V1`
**Status:** Ready for Implementation
**Total Effort:** 47 story points | **Timeline:** 3-4 weeks

---

## Orchestration Overview

This document provides guidance for subagent coordination across the three enhancement groups combined into one implementation plan.

### Assigned Subagents

| Role | Model | Primary Phases | Availability |
|------|-------|----------------|--------------|
| **UI Engineer** | Sonnet (ui-engineer-enhanced) | 2, 3, 4, 5, 6 | 1.5 FTE |
| **Frontend Developer** | Sonnet (frontend-developer) | 2, 4, 5, 6 | 0.75 FTE |
| **TypeScript Architect** | Sonnet (backend-typescript-architect) | 1, 3, 5 | 0.5 FTE |
| **Validation Specialist** | Sonnet (task-completion-validator) | 6 | 0.25 FTE |

---

## Execution Timeline

### Week 1: Foundation & Components

**Phase 1 (1 day) - Model Layer** [backend-typescript-architect]
- Add `modified_at: Date` to RequestLogItem
- Add `archived: boolean` to RequestLogDoc
- Update serializers and type guards
- **Dependency:** Creates input for Phase 3 & 4

**Phase 2 (1.5-2 days) - Shared Components** [ui-engineer-enhanced, frontend-developer]
- Create MultiSelectCombobox (5 pts)
- Create ConfirmationDialog (3 pts)
- Create EditModal base (2 pts)
- Style shared components (3 pts)
- **Dependency:** Creates reusable building blocks for Phase 3 & 4

### Week 2: Item & Document Management

**Phase 3 (2-2.5 days) - Item CRUD** [ui-engineer-enhanced, backend-typescript-architect]
- Add Edit/Delete icons to ItemCard (3 pts)
- Create ItemEditForm (4 pts)
- Implement Edit modal flow (2 pts)
- Implement Delete confirmation flow (2 pts)
- Auto-update Modified field on edit (1 pt)
- **Depends on:** Phase 2 (shared components)
- **Can overlap with:** Phase 4

**Phase 4 (2-2.5 days) - Document Management** [ui-engineer-enhanced, frontend-developer]
- Create KebabMenu component (3 pts)
- Create DocumentKebabMenu (2 pts)
- Delete confirmation (2 pts)
- Archive confirmation (2 pts)
- DocumentEditForm (2 pts)
- Document status filter (2 pts)
- Archive badge display (1 pt)
- Add Item navigation (2 pts)
- **Depends on:** Phase 2 (shared components)
- **Can overlap with:** Phase 3

### Week 3: Polish & Testing

**Phase 5 (1 day) - Wizard Improvements** [frontend-developer, ui-engineer-enhanced]
- Update DocStep indicator logic (2 pts)
- Update StepProgress component (1 pt)
- Test wizard flow (1 pt)
- Polish and animations (1 pt)
- **Depends on:** Phase 1 (for context)
- **Can run in parallel** with Phases 3-4 testing

**Phase 6 (1 day) - Testing & QA** [all agents, task-completion-validator]
- Component/unit tests (2.5 pts)
- Integration tests (2 pts)
- Accessibility audit (1 pt)
- Cross-platform testing (0.5 pts)
- **Depends on:** All previous phases complete

---

## Subagent Communication Checkpoints

### Before Phase Start
Each subagent receives a phase context package with:
- Requirements from implementation plan
- Acceptance criteria (checkboxes)
- Previous phase outputs (if dependent)
- Architecture patterns to follow
- Testing strategy

### Daily Standups
- **Time:** ~15 min (async or sync)
- **Topics:** Progress, blockers, upcoming work
- **Owner:** Lead (frontend-developer or ui-engineer-enhanced)

### Phase Review Gates
After each phase completes, validation before proceeding:

| Phase | Owner | Validates |
|-------|-------|-----------|
| Phase 1 | backend-typescript-architect | Models compile, type guards pass, serializer works |
| Phase 2 | ui-engineer-enhanced | Components render, accessibility passes, snapshots created |
| Phase 3 | ui-engineer-enhanced | ItemCard CRUD works, Modified field updates, accessibility passes |
| Phase 4 | ui-engineer-enhanced | Kebab menu works, filters work, Add Item nav works |
| Phase 5 | frontend-developer | Step indicator shows filename, wizard flow complete |
| Phase 6 | task-completion-validator | Tests pass, accessibility audit clean, cross-platform tested |

---

## Dependency Graph

```
Phase 1 (Models)
    ↓
Phase 2 (Shared Components)
    ├─→ Phase 3 (Item CRUD) ─→ Phase 6 (Testing)
    │       └─→ T6.3, T6.5
    │
    └─→ Phase 4 (Document Mgmt) ─→ Phase 6 (Testing)
            ├─→ T6.4, T6.6
            └─→ Phase 5 (Wizard Polish)
                    └─→ T6.8 (Cross-platform)
```

**Critical Path:** Phase 1 → Phase 2 → Phase 4 → Phase 6

**Optimization Opportunities:**
- Phase 3 and Phase 4 can overlap (both depend on Phase 2)
- Phase 5 can start before Phase 6 (independent testing can happen in parallel)
- Component tests (T6.1-T6.4) can run while Phase 5 is in progress

---

## Specific Guidance by Subagent

### backend-typescript-architect (Sonnet)

**Phases:** 1 (lead), 3 (support), 5 (minor)

**Phase 1 - Critical Work**
- Design `modified_at` field: should it track creation or actual modifications?
  - **Decision:** Create timestamp, updates on any modification via serializer
- Design `archived` field: store in frontmatter or as separate status?
  - **Decision:** Store in RequestLogDoc frontmatter (top-level property)
- Serializer impact: minimal, just read/write two new fields
- Backward compatibility: both fields should gracefully default (modified_at = created_at, archived = false)

**Output Requirements:**
- Updated `src/core/models/index.ts` with both fields
- Updated serializer to handle both fields
- Unit tests for type guards and serialization

---

### ui-engineer-enhanced (Sonnet)

**Phases:** 2 (lead), 3 (lead), 4 (lead), 6 (testing)

**Core Focus:** Component design and implementation

**Phase 2 - Shared Components (High-Impact)**
- MultiSelectCombobox: Most complex, foundational for Phase 3 & 4
  - Pattern: Allow both selection from dropdown AND typing new values
  - Challenge: Distinguish "selected" vs "new" entries visually
  - Recommendation: Use existing MultiSelectWithAdd as reference

- ConfirmationDialog: Reusable across many features
  - Make truly generic (title, message, confirm/cancel labels)
  - Support dangerous action styling (red for delete, orange for archive)
  - Pattern: Use existing modal overlay patterns

- EditModal: Simple wrapper, leverage existing modal infrastructure

**Phase 3 - Item CRUD**
- Focus on ItemCard icons positioning (top-right corner, non-intrusive)
- ItemEditForm: Leverage Phase 2 components
  - Domain/Context: Use MultiSelectCombobox (new!)
  - Tags: Use existing MultiSelectWithAdd
  - Type/Priority/Status: Use existing DropdownWithAdd
  - Notes: Textarea with optional markdown preview

**Phase 4 - Document Management (Heavy Component Load)**
- KebabMenu: Generic menu component (icon + dropdown)
  - Usage: Can be reused for item-level actions in future
- DocumentKebabMenu: Specialized menu (uses KebabMenu internally)
- DocumentEditForm: Simple form (title + maybe description)

**Quality Checkpoints:**
- All components get snapshot tests
- Accessibility audit on all new components (axe-core)
- Mobile responsive by default (test at ≤768px)

---

### frontend-developer (Sonnet)

**Phases:** 2 (support), 4 (lead on features), 5 (lead), 6 (lead on testing)

**Phase 2 - CSS & Integration Setup**
- Create `src/ui/shared/shared-components.css`
- Styling for MultiSelectCombobox, ConfirmationDialog, EditModal
- Use existing glass/x-morphism patterns
- Ensure touch targets >= 44px

**Phase 4 - Features & Navigation**
- DocumentStatus filter integration with existing FilterState
- Archive badge in DocumentCatalog
- Add Item navigation: capture wizard integration
  - Challenge: Passing document context to Step 3 of wizard
  - Pattern: Use existing navigation/routing mechanism

**Phase 5 - Wizard Polish (Primary Responsibility)**
- DocStep component: update to pass document name to StepProgress
- StepProgress: support dynamic label updates
- Label formatting: truncate long filenames (REQ-20260101-meatycapture becomes REQ-2026...ture)
- Tooltip on hover for full filename
- Smooth transitions when label changes

**Phase 6 - Testing (Integration Lead)**
- Focus on integration tests (T6.5, T6.6)
- Wizard flow end-to-end (T6.3 in Phase 5)
- Cross-platform testing (web + Tauri) (T6.8)
- Test all DocStore adapters

---

### task-completion-validator (Sonnet)

**Phases:** 6 (lead on accessibility)

**Phase 6 - Validation**
- Run comprehensive accessibility audit (axe-core)
  - Check all new components for WCAG 2.1 AA compliance
  - Test keyboard navigation (Tab, Enter, Escape, Arrow keys)
  - Verify focus indicators visible and logical
  - Check ARIA labels and live regions
  - Report: `docs/project_plans/implementation_plans/enhancements/ACCESSIBILITY-AUDIT-UI-ENHANCEMENTS.md`

- Cross-browser testing
  - Chrome, Firefox, Safari (web)
  - Edge (web)
  - Tauri (macOS, Windows)

- Quality gate checklist
  - All tests passing
  - Coverage >80%
  - Zero accessibility violations
  - No regressions

---

## Shared Resources & Patterns

### Existing Components to Reuse

| Component | Purpose | Where |
|-----------|---------|-------|
| `DropdownWithAdd` | Type, Priority, Status fields | `src/ui/shared/DropdownWithAdd.tsx` |
| `MultiSelectWithAdd` | Tags field | `src/ui/shared/MultiSelectWithAdd.tsx` |
| `Toast` | Success/error feedback | `src/ui/shared/useToast.tsx` |
| `StepShell` | Modal/dialog container pattern | `src/ui/shared/StepShell.tsx` |
| `FormField` | Form label + input wrapper | `src/ui/shared/FormField.tsx` |

### Architecture Patterns to Follow

**Modal Pattern (from Admin features):**
```typescript
export interface EditModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
}
```

**Component Accessibility Pattern:**
```typescript
// Every component needs:
- aria-label on interactive elements
- role="..." on custom components
- aria-live regions for dynamic content
- Focus trap for modals
- Keyboard shortcuts (Escape to close, etc.)
```

**Testing Pattern:**
```typescript
// Every component needs:
- Snapshot tests for all states
- Component tests for interactions
- Accessibility tests (axe-core)
- Unit tests for logic
```

---

## File Structure & Creation Order

### Phase 1 Files (M1.1, M1.2)
- Modify: `src/core/models/index.ts` (add fields)
- Modify: `src/core/serializer/index.ts` (handle new fields)

### Phase 2 Files (C2.1-C2.4)
- Create: `src/ui/shared/MultiSelectCombobox.tsx` + `.test.tsx`
- Create: `src/ui/shared/ConfirmationDialog.tsx` + `.test.tsx`
- Create: `src/ui/shared/EditModal.tsx` + `.test.tsx`
- Create: `src/ui/shared/shared-components.css`

### Phase 3 Files (I3.1-I3.5)
- Modify: `src/ui/viewer/ItemCard.tsx` (add Edit/Delete icons)
- Create: `src/ui/viewer/ItemEditForm.tsx` + `.test.tsx`
- Modify: `src/ui/viewer/DocumentDetail.tsx` or create item display wrapper

### Phase 4 Files (D4.1-D4.8)
- Create: `src/ui/shared/KebabMenu.tsx` + `.test.tsx`
- Create: `src/ui/viewer/DocumentKebabMenu.tsx` + `.test.tsx`
- Create: `src/ui/viewer/DocumentEditForm.tsx` + `.test.tsx`
- Modify: `src/ui/viewer/DocumentFilters.tsx` (add status filter)
- Modify: `src/ui/viewer/DocumentCatalog.tsx` (show archive badge)

### Phase 5 Files (W5.1-W5.4)
- Modify: `src/ui/wizard/DocStep.tsx` (pass doc name)
- Modify: `src/ui/shared/StepProgress.tsx` (dynamic labels)
- Modify: `src/ui/shared/shared-components.css` (add transitions)

### Phase 6 Files (T6.1-T6.8)
- Create: Test files for all new components
- Create: Integration test files
- Create: `ACCESSIBILITY-AUDIT-UI-ENHANCEMENTS.md`

---

## Handoff Checklist Template

After each phase, the completing subagent provides:

```markdown
## Phase [X] Completion Checklist

**Subagent:** [name]
**Duration:** [actual time]
**Actual Effort:** [story points completed]

### Acceptance Criteria
- [x] Requirement 1
- [x] Requirement 2
- [ ] [any incomplete items with blockers]

### Code Quality
- [x] TypeScript strict mode: no errors
- [x] Tests: >80% coverage
- [x] Linting: all passed
- [x] No console errors/warnings

### Accessibility
- [x] axe-core audit: 0 violations
- [x] Keyboard navigation: working
- [x] ARIA labels: complete

### Known Issues / Blockers
[List any issues that downstream phases should be aware of]

### Output Files
- [x] `path/to/file1.tsx`
- [x] `path/to/file2.css`
- [x] `path/to/test.test.tsx`

### Next Phase Notes
[Any guidance for next phase subagent]

**Ready for Phase [X+1]:** YES / NO
```

---

## Linear Import Format

All tasks are designed for Linear import. Use the CSV structure:

```
ID,Title,Description,Estimate,Status,Phase,Depends On
M1.1,"Add Modified field to RequestLogItem","Add created/modified tracking...",2,Ready,Phase 1,
M1.2,"Add archived status to RequestLogDoc","Add archive support...",2,Ready,Phase 1,
C2.1,"Create MultiSelectCombobox component","Shared combobox...",5,Ready,Phase 2,"M1.1, M1.2"
...
```

---

## Success Criteria for Orchestration

- [ ] All phases complete on schedule (±10%)
- [ ] All acceptance criteria met for each phase
- [ ] Zero blockers that cross phase boundaries (good communication)
- [ ] All tests passing before proceeding to next phase
- [ ] Code review completed for each phase
- [ ] No regressions introduced to existing features
- [ ] Accessibility audit clean (zero violations)
- [ ] Cross-platform testing complete (web + Tauri)

---

**Orchestration Owner:** [Lead - typically frontend-developer or ui-engineer-enhanced]
**Last Updated:** 2026-01-01
**Status:** Ready for Subagent Assignment
