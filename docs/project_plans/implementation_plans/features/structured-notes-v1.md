# Implementation Plan: Structured Notes System (v1)

**Complexity**: Large (L) | **Track**: Full
**Estimated Effort**: 56 Story Points | **Timeline**: 3-4 Weeks
**Feature Owner**: Full Stack Team | **Status**: Planning
**PRD Reference**: [Structured Notes System PRD](../../PRDs/features/structured-notes-v1.md)

---

## Executive Summary

Replace the static Notes field in MeatyCapture with a structured notes system that organizes notes by type (General, Bug Fix Attempt, Validation, Other), supports markdown rendering, and enables full CRUD operations within the capture and viewer interfaces. Users can create, edit, delete, and filter notes without leaving the app or manually editing markdown files.

### Key Objectives

1. **Core Data Model**: Implement Note entity with id, type, content, created_at, updated_at
2. **Serialization**: Update markdown serializer for backward-compatible note persistence
3. **UI Components**: Build NoteModal, MarkdownEditor, NoteCard, NotesList, NoteTypeFilter
4. **Capture Integration**: Wire notes into wizard with add/edit/delete capabilities
5. **Viewer Integration**: Add notes section to item detail view with filtering
6. **Quality**: >80% test coverage, WCAG 2.1 AA accessibility, performance for 50+ notes per item

### Architecture Pattern

```
Core Layer (Data Model)
├── Note interface (id, type, content, created_at, updated_at)
├── ItemDraft extends with notes: Note[]
├── RequestLogItem extends with notes: Note[]
└── Note type enum: General | Bug Fix Attempt | Validation | Other

Serialization Layer
├── Update serialize() for note persistence
├── Update parse() for backward compatibility
├── Note ID generation: NOTE-YYYYMMDD-{project}-{item}-{note_counter}
└── Markdown format: frontmatter notes metadata + body note content

UI Layer
├── NoteModal (type dropdown + markdown editor)
├── MarkdownEditor (textarea + toolbar: bold, italic, lists, links, code)
├── NoteCard (type badge, content, timestamps, edit/delete icons)
├── NotesList (container with type grouping, filtering, add button)
└── NoteTypeFilter (dropdown for type-based filtering)

Integration Layer
├── ItemStep: Add "+ Add Note" button in capture wizard
├── ReviewStep: Display notes grouped by type in review screen
├── ItemCard: Add Notes section in viewer detail view
└── ItemEditForm: Wire note operations for persistence
```

---

## Complexity Assessment

**Complexity Factors**:
- Cross-layer changes: Core models, serializer, UI components, capture/viewer integration
- 5 phases spanning data model through full testing
- New markdown editor component with toolbar
- Backward compatibility handling for existing documents
- Modal focus management and accessibility requirements
- Performance considerations for 50+ notes per item

**Classification**: Large (L) - Multi-component, 15-30 tasks, 3-4 weeks estimated

---

## Implementation Phases

### Phase 1: Core Data Model & Serialization
**Duration**: 3-4 days | **Story Points**: 13

Build the foundation: Note entity, model updates, and markdown serialization.

**Key Deliverables**:
- Note interface with TypeScript types and validation
- Update ItemDraft and RequestLogItem to include notes arrays
- Note type enum and validation functions
- Note ID generation following project pattern
- Update markdown serializer (serialize/parse) for notes
- Backward compatibility: graceful handling of existing items without notes
- Unit tests for Note model and serialization (>80% coverage)

**Dependencies**: None (uses existing core models and serializer patterns)

**Validation**: All Note operations work correctly, serialization round-trips data, backward compatibility tests pass

---

### Phase 2: UI Components (Note Components)
**Duration**: 3-4 days | **Story Points**: 15

Implement reusable note UI components following MeatyCapture design patterns.

**Key Deliverables**:
- NoteModal component (type dropdown + markdown editor + save/cancel)
- MarkdownEditor component (textarea + toolbar: bold, italic, lists, links, code, code-block)
- NoteCard component (type badge, content, timestamps, edit/delete icons, responsive)
- NotesList component (container managing type grouping, filtering, add button)
- NoteTypeFilter dropdown component
- Focus management for modal (focus trap, restore focus on close)
- Glass/x-morphism styling matching existing design system
- Component tests with >80% coverage

**Dependencies**: Phase 1 (Note model and serialization)

**Validation**: All components render correctly, user interactions work, styling matches design system

---

### Phase 3: Capture Wizard Integration
**Duration**: 3 days | **Story Points**: 12

Wire notes into the capture workflow with full CRUD support.

**Key Deliverables**:
- Add "+ Add Note" button to ItemStep (below existing fields)
- Wire NoteModal and NotesList to wizard state (ItemDraft.notes)
- Display notes grouped by type in ReviewStep
- Implement add/edit/delete note operations in capture flow
- Handle note persistence on wizard submit
- Preserve notes when user navigates back/forward in wizard
- Integration tests for capture + notes workflow
- Test backup/restore flow with notes
- End-to-end test: add note → review → submit → persist

**Dependencies**: Phase 1 (data model), Phase 2 (UI components)

**Validation**: Notes captured in wizard, displayed in review, persisted to markdown file

---

### Phase 4: Viewer Integration (Item Detail View)
**Duration**: 3 days | **Story Points**: 13

Add notes section to viewer with full CRUD and file persistence.

**Key Deliverables**:
- Add Notes section to ItemCard in viewer (below metadata)
- Wire NotesList and NoteTypeFilter to viewer state
- Implement add/edit/delete note operations in viewer
- Persist note changes immediately to markdown file (extended append operation)
- Handle concurrent edit detection (last-write wins with warning)
- Implement note rendering with markdown support
- Mobile responsive testing for notes section
- Integration tests for viewer + notes workflow
- Test file I/O operations (write, backup, recovery)
- End-to-end test: view notes → add note → file persists → reload shows updated

**Dependencies**: Phase 1 (data model), Phase 2 (UI components), Phase 3 (integration pattern)

**Validation**: Notes persist to file, edits update markdown correctly, concurrent edits handled

---

### Phase 5: Accessibility, Testing & Polish
**Duration**: 2-3 days | **Story Points**: 3

Comprehensive testing, accessibility audit, and quality gates.

**Key Deliverables**:
- Accessibility audit (axe-core, screen readers, keyboard navigation)
- WCAG 2.1 AA compliance for modal and controls
- Keyboard navigation: Tab, Shift+Tab, Escape, Enter
- Screen reader testing (aria labels, roles, announcements)
- Unit test coverage >80% for all Note model and serialization functions
- Component test coverage >80% for UI components
- Integration test coverage for capture and viewer workflows
- E2E test: full note lifecycle (add → review → persist → view → edit → delete)
- Performance testing with 50+ notes per item
- Edge case testing (corrupted notes, missing notes, malformed content)
- Documentation: API docs, user guide, backward compatibility guide
- Final QA and bug fixes

**Dependencies**: Phases 1-4 (all implementation complete)

**Validation**: All tests pass, zero accessibility violations, performance targets met, documentation complete

---

## Task Breakdown

### PHASE 1: Core Data Model & Serialization

#### CORE-001: Define Note Entity and Types
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create TypeScript interfaces and types for the Note entity, note type enum, and validation functions.

**Acceptance Criteria**:
- [ ] Note interface with id, type, content, created_at, updated_at fields
- [ ] NoteType enum: 'General' | 'Bug Fix Attempt' | 'Validation' | 'Other'
- [ ] isNote() type guard function
- [ ] validateNoteType() function
- [ ] validateNoteContent() (max 10,000 chars)
- [ ] JSDoc documentation for all types
- [ ] Export from src/core/models/index.ts

**Estimate**: 2 points
**Files**: src/core/models/index.ts (modified)

---

#### CORE-002: Update ItemDraft and RequestLogItem Models
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Add notes array field to ItemDraft and RequestLogItem, update type guards and validation.

**Acceptance Criteria**:
- [ ] ItemDraft.notes: Note[] (replaces string field)
- [ ] RequestLogItem.notes: Note[] (replaces string field)
- [ ] Update isItemDraft() type guard
- [ ] Update isRequestLogItem() type guard
- [ ] Backward compatibility: old items with string notes field handled gracefully
- [ ] Migration utility: convertStringNotesToArray() for old documents
- [ ] Unit tests for migration function

**Estimate**: 3 points
**Files**: src/core/models/index.ts (modified)

---

#### CORE-003: Implement Note ID Generation
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create note ID generation function following project pattern: NOTE-YYYYMMDD-{project}-{item}-{counter}.

**Acceptance Criteria**:
- [ ] generateNoteId() function with doc_id, item_id, note_counter parameters
- [ ] Follows pattern: NOTE-YYYYMMDD-<project-slug>-<item-number>-<note-counter>
- [ ] Validates input parameters
- [ ] Unit tests with various input combinations
- [ ] Edge cases: large counters, special characters in project slug

**Estimate**: 2 points
**Files**: src/core/validation/id-generator.ts (create or extend)

---

#### CORE-004: Update Markdown Serializer for Notes
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Extend markdown serializer to handle note persistence and parsing with backward compatibility.

**Acceptance Criteria**:
- [ ] Update serializeFrontmatter() to include notes metadata in doc-level frontmatter
- [ ] Update serializeItem() to include Notes section with type badges and content
- [ ] Update parseItems() to extract notes from item body markdown
- [ ] Add parseNotes() helper function
- [ ] Backward compatibility: items without notes section parse to empty array
- [ ] Handle corrupted note data gracefully (skip corrupted, preserve document)
- [ ] Snapshot tests for various note formats (with/without notes, markdown content)
- [ ] Round-trip tests: serialize → parse → serialize should match

**Estimate**: 4 points
**Files**: src/core/serializer/index.ts (modified)

**Markdown Format Reference**:
```yaml
---
type: request-log
doc_id: REQ-20260101-meatycapture
item_count: 1
tags: [notes, ux]
items_index:
  - id: REQ-20260101-meatycapture-01
    type: enhancement
notes_metadata:
  - id: NOTE-20260101-meatycapture-01-01
    type: General
---

### REQ-20260101-meatycapture-01 - Structured Notes

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage

#### Notes

**Note 1: General** (Created: 2026-01-01 10:00)
This is initial observation with **bold** text.

**Note 2: Bug Fix Attempt** (Created: 2026-01-01 10:30)
Attempted fix using code block...
```

---

#### CORE-005: Unit Tests for Note Model and Serialization
**Assigned**: test-engineer (Sonnet)

**Description**: Comprehensive unit tests for Note entity, validation, ID generation, and serialization round-trips.

**Acceptance Criteria**:
- [ ] Test Note interface validation (valid/invalid notes)
- [ ] Test NoteType enum validation
- [ ] Test validateNoteContent() with various lengths
- [ ] Test generateNoteId() with various inputs
- [ ] Test serialization round-trip: ItemDraft → serialize → parse → ItemDraft
- [ ] Test backward compatibility: old string notes → parsed as empty array
- [ ] Test migration: convertStringNotesToArray() converts old documents
- [ ] Test edge cases: missing notes, corrupted metadata, malformed markdown
- [ ] >80% code coverage for models and serialization

**Estimate**: 2 points
**Files**: src/core/__tests__/notes.test.ts (create)

---

### PHASE 2: UI Components (Note Components)

#### UI-001: Create NoteModal Component
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Build modal dialog for creating and editing notes with type dropdown and markdown editor.

**Acceptance Criteria**:
- [ ] Modal component with overlay and focus trap
- [ ] Type dropdown (General, Bug Fix Attempt, Validation, Other)
- [ ] MarkdownEditor integrated for content input
- [ ] Save button (validates type and content)
- [ ] Cancel button (discards changes, restores focus)
- [ ] Pre-fills modal with existing note data (for edit mode)
- [ ] Character count display (x / 10000)
- [ ] Error message display for validation failures
- [ ] Keyboard support: Escape to close, Tab navigation
- [ ] Glass/x-morphism styling matching design system
- [ ] Responsive design (mobile, tablet, desktop)

**Estimate**: 4 points
**Files**: src/ui/shared/NoteModal.tsx (create)

---

#### UI-002: Create MarkdownEditor Component
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Build markdown editor with formatting toolbar and keyboard support.

**Acceptance Criteria**:
- [ ] Textarea for markdown content input
- [ ] Toolbar with buttons: bold, italic, lists, ordered lists, links, code, code-block
- [ ] Toolbar buttons inject markdown syntax at cursor position
- [ ] Keyboard shortcuts: Cmd/Ctrl+B (bold), I (italic), K (link)
- [ ] Support for multi-line operations (select text, apply formatting)
- [ ] Real-time preview toggle (stretch goal - not MVP)
- [ ] Accessible: aria labels on toolbar buttons, keyboard focus indicators
- [ ] Responsive: toolbar wraps on small screens
- [ ] Copy/paste support for code blocks

**Estimate**: 4 points
**Files**: src/ui/shared/MarkdownEditor.tsx (create)

---

#### UI-003: Create NoteCard Component
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Build component for displaying a single note with metadata, content, and action icons.

**Acceptance Criteria**:
- [ ] Type badge with color coding (General, Bug Fix Attempt, Validation, Other)
- [ ] Note content rendered as markdown (using existing MarkdownRenderer)
- [ ] Created and updated timestamps (human-readable format)
- [ ] Edit icon button (pencil) - triggers NoteModal with pre-filled data
- [ ] Delete icon button (trash) - triggers confirmation dialog
- [ ] Hover/focus states for action buttons
- [ ] Responsive design: single column on mobile, expanded on desktop
- [ ] Copy note ID to clipboard (stretch goal)
- [ ] Accessible: aria labels, keyboard navigation to action buttons

**Estimate**: 3 points
**Files**: src/ui/shared/NoteCard.tsx (create)

---

#### UI-004: Create NotesList Component
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Build container component managing note display, grouping, filtering, and add button.

**Acceptance Criteria**:
- [ ] Display notes grouped by type (General, Bug Fix Attempt, Validation, Other)
- [ ] Within each type group, sort by created_at descending (most recent first)
- [ ] "+ Add Note" button at top of section (or separate floating button)
- [ ] Each note renders using NoteCard component
- [ ] Handles empty state: "No notes yet" message with add button
- [ ] Integrates with NoteTypeFilter (receives active filter, hides types)
- [ ] Renders NoteModal when add button clicked
- [ ] Pass callbacks for edit/delete operations to NoteCard
- [ ] Responsive: grid/flex layout adjusts for screen size

**Estimate**: 3 points
**Files**: src/ui/shared/NotesList.tsx (create)

---

#### UI-005: Create NoteTypeFilter Component
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Build dropdown filter for selecting which note types to display.

**Acceptance Criteria**:
- [ ] Dropdown with "All Types" + individual type options
- [ ] Multi-select: user can toggle each type on/off
- [ ] Active types indicated with checkmarks or highlight
- [ ] Passes selected types to NotesList (or parent state)
- [ ] Default: all types shown
- [ ] Accessible: keyboard navigation, aria labels
- [ ] Responsive: fits mobile screens

**Estimate**: 2 points
**Files**: src/ui/shared/NoteTypeFilter.tsx (create)

---

#### UI-006: Component Tests and Styling
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Test all note components and apply glass/x-morphism styling.

**Acceptance Criteria**:
- [ ] Component tests for NoteModal (render, user interactions, focus trap)
- [ ] Component tests for MarkdownEditor (toolbar buttons, shortcuts)
- [ ] Component tests for NoteCard (rendering, action buttons)
- [ ] Component tests for NotesList (grouping, filtering, empty state)
- [ ] Component tests for NoteTypeFilter (multi-select, filtering)
- [ ] Glass/x-morphism styling applied to all components
- [ ] Consistent spacing, colors, typography with design system
- [ ] Dark mode support (if existing app supports)
- [ ] >80% component test coverage

**Estimate**: 2 points
**Files**: src/ui/shared/*.css, src/ui/shared/__tests__/*.test.tsx

---

### PHASE 3: Capture Wizard Integration

#### CAPT-001: Add "+ Add Note" Button to ItemStep
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Integrate "+ Add Note" button into ItemStep capture form.

**Acceptance Criteria**:
- [ ] Button positioned below existing fields in ItemStep
- [ ] Button triggers NoteModal for adding new note
- [ ] Modal integration: save note → add to ItemDraft.notes array
- [ ] Display notes list showing notes added so far (type + snippet)
- [ ] User can add multiple notes before submitting wizard
- [ ] Visual indication of notes count (e.g., badge on button)
- [ ] Responsive: button and list adjust for mobile view
- [ ] Keyboard accessible: Tab to button, Enter to activate

**Estimate**: 3 points
**Files**: src/ui/wizard/ItemStep.tsx (modified)

---

#### CAPT-002: Display Notes in ReviewStep
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Show structured notes in capture review screen with type grouping.

**Acceptance Criteria**:
- [ ] Notes section in ReviewStep displaying all captured notes
- [ ] Notes grouped by type (same as viewer)
- [ ] Each note shows: type badge, truncated content (first 200 chars), edit/delete icons
- [ ] Edit icon opens NoteModal pre-filled with note data
- [ ] Delete icon shows confirmation dialog before removing
- [ ] "+ Add Note" button to add notes during review
- [ ] Notes persist when user submits wizard
- [ ] Responsive: single column on mobile, expanded on desktop

**Estimate**: 3 points
**Files**: src/ui/wizard/ReviewStep.tsx (modified)

---

#### CAPT-003: Wire Notes State and Persistence
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Manage note state throughout wizard and handle persistence on submit.

**Acceptance Criteria**:
- [ ] ItemDraft state includes notes array (type safety via TypeScript)
- [ ] WizardFlow manages notes state transitions
- [ ] Notes preserved when user navigates backward/forward in wizard
- [ ] On wizard submit: notes serialized correctly to markdown
- [ ] ID generation for new notes happens on submit (not during capture)
- [ ] Timestamps (created_at, updated_at) set correctly during persistence
- [ ] Integration test: capture notes → navigate → review → submit → file has notes

**Estimate**: 2 points
**Files**: src/ui/wizard/WizardFlow.tsx (modified)

---

#### CAPT-004: Integration Tests for Capture + Notes
**Assigned**: test-engineer (Sonnet)

**Description**: Comprehensive integration tests for note capture workflow.

**Acceptance Criteria**:
- [ ] Test: add single note in ItemStep
- [ ] Test: add multiple notes (different types)
- [ ] Test: edit note in ItemStep
- [ ] Test: delete note in ItemStep with confirmation
- [ ] Test: add note in ReviewStep
- [ ] Test: navigate wizard with notes in draft (notes persist)
- [ ] Test: submit wizard with notes → persists to markdown file
- [ ] Test: backup created before write
- [ ] E2E test: full flow (project → doc → item + notes → review → submit → verify file)

**Estimate**: 3 points
**Files**: src/ui/wizard/__tests__/notes-capture.integration.test.tsx (create)

---

### PHASE 4: Viewer Integration (Item Detail View)

#### VIEW-001: Add Notes Section to ItemCard
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Integrate NotesList into ItemCard viewer component.

**Acceptance Criteria**:
- [ ] Notes section added to ItemCard (below metadata, before copy buttons)
- [ ] Passes item.notes array to NotesList component
- [ ] NotesList displays notes grouped by type
- [ ] "+ Add Note" button visible (opens NoteModal)
- [ ] Edit and delete icons functional in viewer context
- [ ] Responsive: adjusts for mobile view
- [ ] Empty state: "No notes yet" with add button

**Estimate**: 2 points
**Files**: src/ui/viewer/ItemCard.tsx (modified)

---

#### VIEW-002: Implement Note CRUD in Viewer
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Handle add/edit/delete operations and file persistence.

**Acceptance Criteria**:
- [ ] Add note: opens NoteModal, saves to item, triggers file write
- [ ] Edit note: opens NoteModal pre-filled, updates item and file
- [ ] Delete note: shows confirmation, removes from item and file
- [ ] All operations trigger file write with backup strategy
- [ ] Success toast notification after each operation
- [ ] Error handling: display error message, offer retry
- [ ] Concurrent edit detection: warn user if document changed on disk
- [ ] Last-write-wins: local changes overwrite file changes
- [ ] Timestamp updates: modified_at set on item when notes change

**Estimate**: 4 points
**Files**: src/ui/viewer/hooks/useItemEdit.ts (modified), ItemCard.tsx (modified)

---

#### VIEW-003: Integrate NoteTypeFilter in Viewer
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Add type filter dropdown for notes section in viewer.

**Acceptance Criteria**:
- [ ] NoteTypeFilter dropdown displayed above notes list
- [ ] Filter state managed in ItemCard or custom hook
- [ ] NotesList receives active filter, hides non-matching types
- [ ] Default: all types shown
- [ ] Filter preference persists during session (local state only)
- [ ] Keyboard accessible
- [ ] Responsive

**Estimate**: 2 points
**Files**: src/ui/viewer/ItemCard.tsx (modified), hooks/useNoteFilter.ts (create)

---

#### VIEW-004: File I/O and Persistence
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Implement file I/O operations for note persistence in viewer.

**Acceptance Criteria**:
- [ ] Create updateItemNotes() utility function
- [ ] Load full RequestLogDoc from file
- [ ] Update target item's notes array
- [ ] Regenerate items_index and tags aggregation
- [ ] Serialize and write to file
- [ ] Create backup before write (existing strategy)
- [ ] Handle file not found, permission errors gracefully
- [ ] Unit tests for updateItemNotes() function
- [ ] Integration tests with fs-local adapter

**Estimate**: 3 points
**Files**: src/core/serializer/item-update.ts (create), adapters/fs-local/doc-store.ts (modified)

---

#### VIEW-005: Integration Tests for Viewer + Notes
**Assigned**: test-engineer (Sonnet)

**Description**: Comprehensive integration tests for note operations in viewer.

**Acceptance Criteria**:
- [ ] Test: add note in viewer → file updated
- [ ] Test: edit note in viewer → file updated with new timestamp
- [ ] Test: delete note in viewer → file updated
- [ ] Test: filter notes by type → display correct subset
- [ ] Test: multiple operations in sequence → file integrity maintained
- [ ] Test: reload viewer → notes persist from file
- [ ] Test: concurrent edit detection → warn user
- [ ] E2E test: full lifecycle (add → edit → delete → verify file)

**Estimate**: 3 points
**Files**: src/ui/viewer/__tests__/notes-viewer.integration.test.tsx (create)

---

### PHASE 5: Accessibility, Testing & Polish

#### QA-001: Accessibility Audit and Fixes
**Assigned**: web-accessibility-checker (Sonnet)

**Description**: Ensure WCAG 2.1 AA compliance for note components and modals.

**Acceptance Criteria**:
- [ ] Run axe-core on all note components (zero violations)
- [ ] Modal focus trap working: focus doesn't escape modal
- [ ] Focus restored to trigger button after modal closes
- [ ] Keyboard navigation: Tab cycles through controls
- [ ] Escape key closes modal
- [ ] Enter key submits form (or Cmd+Enter for textarea)
- [ ] Screen reader testing: aria-labels, roles, announcements
- [ ] Form field labels associated with inputs
- [ ] Buttons have accessible names
- [ ] Color contrast meets AA standards (4.5:1 for text)
- [ ] Test with VoiceOver (macOS), NVDA (Windows), JAWS (Windows)

**Estimate**: 3 points
**Files**: All note components and modals

---

#### QA-002: Comprehensive Test Coverage
**Assigned**: test-engineer (Sonnet)

**Description**: Achieve >80% test coverage across all note-related code.

**Acceptance Criteria**:
- [ ] Unit test coverage: models, serialization, validation (included in phases 1-4)
- [ ] Component test coverage: all note UI components (included in phases 2-4)
- [ ] Integration test coverage: capture + notes, viewer + notes (included in phases 3-4)
- [ ] E2E test: full note lifecycle
- [ ] Edge case tests:
  - [ ] Very long note content (9,999 chars)
  - [ ] Special characters in note content (emoji, unicode)
  - [ ] Markdown edge cases (unclosed code blocks, nested lists)
  - [ ] Empty notes array
  - [ ] Corrupted note metadata
  - [ ] Missing created_at/updated_at timestamps
- [ ] Performance tests:
  - [ ] NotesList render with 50 notes < 200ms
  - [ ] Note add/edit/delete < 500ms
  - [ ] File write with backup < 1000ms
- [ ] Coverage report: minimum >80% across all note code

**Estimate**: 2 points
**Files**: Various __tests__ directories

---

#### QA-003: Documentation and User Guide
**Assigned**: documentation-writer (Haiku)

**Description**: Document feature, APIs, and user workflows.

**Acceptance Criteria**:
- [ ] Structured Notes feature guide (user perspective)
- [ ] API documentation for Note type and utilities
- [ ] Markdown serialization format documented with examples
- [ ] Backward compatibility guide (old items without notes)
- [ ] Component API docs (NoteModal, MarkdownEditor, NoteCard, etc.)
- [ ] Troubleshooting guide (common issues)
- [ ] Accessibility features documented
- [ ] Code examples for common tasks

**Estimate**: 1 point
**Files**: docs/features/structured-notes.md (create)

---

#### QA-004: Final QA and Bug Fixes
**Assigned**: task-completion-validator (Sonnet)

**Description**: Final quality assurance pass, bug fixing, and release readiness.

**Acceptance Criteria**:
- [ ] All acceptance criteria met for phases 1-4
- [ ] All tests passing (unit, integration, e2e, accessibility)
- [ ] No console errors or warnings
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Cross-platform testing (macOS, Windows, Linux)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Performance meets targets (50+ notes < 200ms render)
- [ ] Backward compatibility verified with sample old documents
- [ ] Documentation complete and accurate
- [ ] Feature flag ENABLE_STRUCTURED_NOTES implemented (if needed)
- [ ] Release notes prepared

**Estimate**: 1 point
**Files**: All note-related files

---

## Quality Gates

### Phase 1 Quality Gates
- [ ] All Note model tests pass
- [ ] Serialization round-trip tests pass
- [ ] Backward compatibility tests pass
- [ ] No TypeScript errors
- [ ] Test coverage >80% for models/serialization

### Phase 2 Quality Gates
- [ ] All component tests pass
- [ ] Component visual review (styling matches design system)
- [ ] Focus trap and keyboard navigation verified manually
- [ ] Test coverage >80% for UI components
- [ ] Responsive design tested on mobile/tablet/desktop

### Phase 3 Quality Gates
- [ ] All capture integration tests pass
- [ ] E2E test: capture notes → submit → file verified
- [ ] Wizard navigation with notes in draft verified
- [ ] No regressions in existing capture workflow

### Phase 4 Quality Gates
- [ ] All viewer integration tests pass
- [ ] E2E test: add/edit/delete notes in viewer → file persists
- [ ] File I/O operations handle errors gracefully
- [ ] Concurrent edit handling works correctly
- [ ] No regressions in existing viewer functionality

### Phase 5 Quality Gates
- [ ] Zero axe-core accessibility violations
- [ ] All keyboard navigation scenarios work
- [ ] Screen reader compatibility verified
- [ ] Test coverage >80% across all code
- [ ] Performance targets met (50+ notes < 200ms)
- [ ] Documentation complete
- [ ] All bugs fixed, ready for release

---

## Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Markdown serialization breaks existing docs | High | Medium | Backward-compatible format, extensive testing with sample docs, rollback plan |
| XSS via unsanitized markdown rendering | High | Low | Use safe markdown library (remark/rehype already in project), sanitize HTML output, security review |
| File corruption during note write | High | Low | Extend existing backup strategy, test backup/restore, atomic write operations |
| Modal focus trap breaks accessibility | Medium | Medium | Use focus-trap library, test with screen readers, WCAG audits in phase 5 |
| Old items without notes cause issues | Medium | Medium | Default to empty array, migration utility, comprehensive backward compat tests |
| Performance with 50+ notes per item | Medium | Low | Lazy-load notes in viewer, virtualize long lists, benchmark before launch |
| Note content length validation bypass | Medium | Low | Server-side validation in core, test boundary cases (10K chars) |
| Concurrent edits lose data | Medium | Medium | Warn user on stale data, implement last-write-wins consistently, file timestamps |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Test Coverage** | >80% for all code | Coverage reports in CI |
| **Accessibility** | Zero axe-core violations | axe-core scan results |
| **Performance** | <200ms render for 50 notes | Performance benchmarks |
| **File I/O** | <1000ms for write operations | Integration test metrics |
| **User Adoption** | 40%+ of notes use markdown | File content analysis post-launch |
| **Bug Escape Rate** | <1 critical bug in first week | Production issue tracking |
| **Documentation** | 100% complete and reviewed | Documentation checklist |

---

## Dependencies & Assumptions

### External Dependencies
- Markdown library: remark/rehype (check existing stack)
- React and TypeScript (already in project)
- Existing MarkdownRenderer component for note display
- Focus-trap library for modal accessibility

### Internal Dependencies
- Phase 1 → Phases 2-4 (core model required for all downstream work)
- Phase 2 → Phase 3-4 (UI components required for integration)
- Phases 1-2 → Phases 3-4 (foundation required for integration testing)

### Assumptions
- Single-user local file model sufficient (no server-side sync)
- 4 fixed note types sufficient for MVP (no user-defined types)
- Markdown with toolbar sufficient (no WYSIWYG editor)
- Existing backup strategy prevents data loss
- Most users will benefit from type-based organization

---

## Subagent Assignments

### Specialized Roles
- **backend-typescript-architect** (Sonnet): Core models, serialization, ID generation, state management
- **ui-engineer-enhanced** (Sonnet): All UI components, styling, responsive design
- **test-engineer** (Sonnet): Unit tests, integration tests, test coverage analysis
- **web-accessibility-checker** (Sonnet): Accessibility audit, WCAG compliance, focus management
- **task-completion-validator** (Sonnet): Final QA, cross-platform testing, release readiness
- **documentation-writer** (Haiku): User guide, API docs, troubleshooting

---

## Timeline Estimate

```
Week 1:
  Days 1-4: Phase 1 (Core Data Model & Serialization) - 13 pts

Week 2:
  Days 1-4: Phase 2 (UI Components) - 15 pts

Week 3:
  Days 1-3: Phase 3 (Capture Integration) - 12 pts
  Days 4-5: Phase 4 Part 1 (Viewer Setup) - 6 pts

Week 4:
  Days 1-2: Phase 4 Part 2 (Viewer Integration) - 7 pts
  Days 3-5: Phase 5 (Testing & Polish) - 3 pts

Total: 56 Story Points / 3-4 Weeks
```

---

## Acceptance Criteria Summary

### Functional Requirements
- [x] Note data model (id, type, content, created_at, updated_at) works in core
- [x] ItemDraft and RequestLogItem updated with notes arrays
- [x] NoteModal, MarkdownEditor, NoteCard, NotesList components complete
- [x] "+ Add Note" button in capture wizard and viewer
- [x] Notes grouped by type in both capture review and viewer
- [x] Edit/Delete icons functional with confirmation dialogs
- [x] Note type filter dropdown filters correctly
- [x] Markdown toolbar (bold, italic, lists, links, code) works
- [x] All note CRUD operations work end-to-end
- [x] Notes persist to markdown file with correct format
- [x] Backward compatibility: old items without notes load correctly

### Technical Requirements
- [x] Follows MeatyCapture layered architecture (UI → Core → Adapters → FS)
- [x] Note model in core/models with full TypeScript typing
- [x] Serializer handles note parsing/writing with backward compatibility
- [x] ID generation for notes follows project pattern
- [x] Backup strategy extended to note operations
- [x] Concurrent edit handling implemented (last-write wins)
- [x] No file corruption on note operations

### Quality Requirements
- [x] Unit tests >80% coverage (models, serialization, validation)
- [x] Component tests >80% coverage (all UI components)
- [x] Integration tests (capture + notes, viewer + notes, file I/O)
- [x] Accessibility: WCAG 2.1 AA, zero axe-core violations
- [x] E2E tests for full note lifecycle
- [x] Performance: 50+ notes render < 200ms
- [x] Documentation complete (user guide, API docs, troubleshooting)

---

## References

- **PRD**: [Structured Notes System PRD](../../PRDs/features/structured-notes-v1.md)
- **Architecture**: [CLAUDE.md](../../../../CLAUDE.md)
- **Core Models**: [src/core/models/index.ts](../../../../src/core/models/index.ts)
- **Serializer**: [src/core/serializer/index.ts](../../../../src/core/serializer/index.ts)
- **Design System**: [docs/design/glass-morphism.md](../../design/glass-morphism.md)
- **Existing Viewer**: [src/ui/viewer/ItemCard.tsx](../../../../src/ui/viewer/ItemCard.tsx)

---

## Next Steps

1. **Kickoff Phase 1**: Assign backend-typescript-architect to begin Note model and serialization
2. **Parallel Phase 2 Planning**: Prepare UI component specifications with ui-engineer-enhanced
3. **Dependencies Verification**: Confirm markdown library (remark/rehype) available in project
4. **Sample Data**: Create test documents with and without notes for backward compatibility testing
5. **Design Review**: Verify glass/x-morphism styling matches existing design system
6. **Risk Mitigation**: Set up backup/restore testing infrastructure early

---

**Document Status**: Draft - Ready for team review and Phase 1 kickoff
**Last Updated**: 2026-01-03
**Created By**: Implementation Planning Orchestrator
