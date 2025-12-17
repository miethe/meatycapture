# Implementation Plan: UI Refresh - Viewer Navbar & Filter Polish (v1)

**Complexity**: Medium (M) | **Track**: Standard
**Estimated Effort**: 26 Story Points | **Timeline**: 2-3 Weeks
**Feature Owner**: Frontend Team | **Status**: Planning
**Design Reference**: viewer-render.png

---

## Executive Summary

Modernize the MeatyCapture UI with a comprehensive visual refresh focused on the top navigation bar, filter section, and document card layouts. This effort improves visual hierarchy, adds icon support, refines interactions, and strengthens the glass/x-morphism design system. All changes maintain incremental compatibility with existing functionality while establishing a foundation for future UI enhancements.

### Key Objectives

1. **Design System Enhancement**: Extend CSS variables, icon integration patterns, and component tokens
2. **Top Navbar Redesign**: Replace text-only buttons with icon-prefixed pill-shaped tabs and profile area
3. **Filter Section Polish**: Add dropdown icons, refine spacing, clarify action buttons
4. **Document Cards**: Enhance visual hierarchy, add stats cards, improve expanded detail view
5. **Accessibility**: Maintain WCAG 2.1 AA compliance, improve icon semantics

### Architecture Pattern

```
App.tsx (Enhanced navbar with icons and profile area)
    ↓
├── Navbar Brand + Logo (left)
├── Icon-prefixed Navigation Pills (center)
│   ├── Pencil + "Capture"
│   ├── Eye + "Viewer" (active, filled)
│   └── Gear + "Admin"
└── Profile/Actions Area (right)
    ↓
ViewerContainer
    ↓
├── DocumentFilters (enhanced with icons)
│   ├── Project dropdown (globe icon)
│   ├── Type dropdown (tag icon)
│   ├── Domain dropdown (globe icon)
│   ├── Priority dropdown (arrow icon)
│   └── Status dropdown (circle icon)
└── DocumentCatalog (refined cards)
    ├── Project Groups (chevron, metadata)
    ├── Document Rows (expanded card layout)
    └── Document Details (stats cards, rich layout)
```

### Success Criteria

- [ ] Navbar redesign matches design render exactly
- [ ] All filter dropdowns include relevant icons
- [ ] Document cards show enhanced metadata (stats, dates, tags)
- [ ] Active/inactive tab states clear and accessible
- [ ] Profile area placeholder prepared for future integration
- [ ] Zero new accessibility violations
- [ ] Bundle size impact <15KB gzipped
- [ ] All components backward compatible with existing logic
- [ ] 100% visual regression tests passing

---

## Implementation Phases

### Phase 1: Design System Updates (CSS & Tokens)
**Duration**: 1-1.5 days | **Story Points**: 5

Extend the global design system with icon integration patterns, enhanced color tokens, and updated component foundations.

**Key Deliverables**:
- Icon size and spacing utility variables
- Enhanced nav pill styling tokens
- Card metadata styling tokens
- Updated color tokens for active/inactive states
- Icon component wrapper patterns

**Dependencies**: None (standalone CSS work)

**Validation**: All variables properly scoped, no conflicts with existing styles

---

### Phase 2: Top Navbar Redesign (Layout, Icons, Profile Area)
**Duration**: 1.5-2 days | **Story Points**: 8

Redesign the top navigation bar with pill-shaped tabs, icon integration, and profile area placeholder.

**Key Deliverables**:
- Update App.tsx navbar structure (brand, nav pills, profile area)
- Implement pill-shaped button styling with icons
- Add icon components or icon library integration
- Create profile area placeholder (avatar icon)
- Refactor navbar styling in index.css
- Keyboard navigation and ARIA updates
- Responsive breakpoints for mobile

**Dependencies**: Phase 1 (design system tokens)

**Validation**: Navbar visually matches design render, all states accessible

---

### Phase 3: Viewer Filter Section Polish (Icons, Styling, Layout)
**Duration**: 1-1.5 days | **Story Points**: 6

Enhance the filter section with dropdown icons, refined spacing, and improved visual hierarchy.

**Key Deliverables**:
- Add icons to Project, Type, Domain, Priority, Status dropdowns
- Refine filter row spacing and alignment
- Implement "Filter" accent color button
- Add "Filter all" text/button on search row
- Update FilterDropdown component with icon support
- Enhance responsive layout for filter row
- Update viewer.css filter styling

**Dependencies**: Phase 1 (design system), Phase 2 (navbar, for icon patterns)

**Validation**: All filter icons render correctly, spacing matches design

---

### Phase 4: Document Cards Refinement (Stats, Metadata, Expanded View)
**Duration**: 1-1.5 days | **Story Points**: 5

Improve document card layouts with stats cards, enhanced metadata display, and better expanded view structure.

**Key Deliverables**:
- Create stats card component (Item Count, Updated, Created icons)
- Refine DocumentRow component with enhanced metadata
- Update DocumentDetail expanded view with stats display
- Add three-dot menu placeholder for future actions
- Improve visual hierarchy in card layouts
- Enhance tag display in cards
- Update DocumentCatalog and DocumentRow styling

**Dependencies**: Phase 1 (design system), Phase 2 (icons)

**Validation**: Cards render stats correctly, expanded view layout matches design

---

### Phase 5: Testing & Validation (Visual Regression, Accessibility, Cross-Browser)
**Duration**: 1-1.5 days | **Story Points**: 2

Comprehensive visual regression testing, accessibility validation, and cross-browser verification.

**Key Deliverables**:
- Visual regression test suite (Playwright/Percy)
- Accessibility audit (axe-core)
- Keyboard navigation verification
- Screen reader testing
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile responsive testing
- Performance profiling (no unexpected regressions)
- Bundle size analysis

**Dependencies**: Phases 1-4 (all implementation complete)

**Validation**: All visual tests passing, zero new a11y violations, bundle <15KB impact

---

## Task Breakdown

### PHASE 1: Design System Updates

#### UIR-1.1: Extend CSS Variables (Icons, Spacing, Colors)
**Assigned**: frontend-developer

**Description**: Add icon utility variables, enhance spacing tokens, and create component tokens for updated design.

**Acceptance Criteria**:
- [ ] Icon size variables defined (--icon-xs, --icon-sm, --icon-md, --icon-lg)
- [ ] Icon spacing variables (--icon-gap, --icon-margin)
- [ ] Nav pill styling tokens (--nav-pill-radius, --nav-pill-padding)
- [ ] Card stats styling tokens
- [ ] Active/inactive color states refined
- [ ] No conflicts with existing variables
- [ ] Documented in index.css with comments

**Estimate**: S (2 points)

**Files**:
- `src/index.css` (update :root section)

---

#### UIR-1.2: Create Icon Integration Pattern Documentation
**Assigned**: ui-designer

**Description**: Document the icon integration approach (Radix Icons, React Icons, or inline SVGs) and establish usage patterns.

**Acceptance Criteria**:
- [ ] Icon library chosen (recommend Radix Icons)
- [ ] Installation and import patterns documented
- [ ] Size and alignment guidelines
- [ ] Color/fill patterns for active/inactive states
- [ ] Icon spacing and padding rules
- [ ] Examples for navbar and filter icons
- [ ] Accessibility considerations (aria-labels, hidden decorative icons)

**Estimate**: XS (1 point)

**Files**:
- `.claude/design-system/icon-integration.md` (create)

---

#### UIR-1.3: Update Glass/X-Morphism Styling Tokens
**Assigned**: frontend-developer

**Description**: Refine glass effect variables for new button and card states.

**Acceptance Criteria**:
- [ ] Nav pill glass effect tokens
- [ ] Active pill background opacity
- [ ] Card hover and focus states
- [ ] Filter section background refinement
- [ ] Backdrop-filter consistency
- [ ] No visual regressions in existing components
- [ ] Tested across browsers for backdrop support

**Estimate**: S (2 points)

**Files**:
- `src/index.css` (update glass effect section)
- `src/ui/viewer/viewer.css` (update filter section)

---

### PHASE 2: Top Navbar Redesign

#### UIR-2.1: Update App.tsx Navbar Structure with Icons
**Assigned**: ui-engineer-enhanced

**Description**: Refactor navbar HTML structure to support icons, profile area, and pill-shaped design.

**Acceptance Criteria**:
- [ ] Navbar structure: brand (left) | nav pills (center) | profile (right)
- [ ] Each nav button includes icon before text
- [ ] Icon components properly imported
- [ ] Pencil icon + "Capture" text
- [ ] Eye icon + "Viewer" text
- [ ] Gear icon + "Admin" text
- [ ] Profile area placeholder with avatar icon
- [ ] All ARIA labels and roles correct
- [ ] Semantic HTML (nav, button, etc.)

**Estimate**: M (3 points)

**Files**:
- `src/App.tsx` (update navbar section, lines 103-135)

---

#### UIR-2.2: Implement Pill-Shaped Button Styling in index.css
**Assigned**: frontend-developer

**Description**: Refactor nav button styles to pill-shaped design with icon support and improved hover/active states.

**Acceptance Criteria**:
- [ ] Border-radius increased for pill effect
- [ ] Padding adjusted for icon + text layout
- [ ] Icon spacing (gap between icon and text)
- [ ] Active pill background filled (primary color)
- [ ] Inactive pill subtle/transparent background
- [ ] Hover states smooth and clear
- [ ] Focus states meet WCAG AA contrast
- [ ] Transitions smooth (0.2s)
- [ ] Responsive sizing for mobile

**Estimate**: M (3 points)

**Files**:
- `src/index.css` (refactor .nav-button and .app-nav sections)

---

#### UIR-2.3: Add Profile Area Placeholder (Avatar Icon)
**Assigned**: ui-engineer-enhanced

**Description**: Create profile area placeholder on navbar right side for future user integration.

**Acceptance Criteria**:
- [ ] Profile area div added to navbar right side
- [ ] Avatar icon centered and sized appropriately
- [ ] Hover state shows subtle background
- [ ] Accessible (button with aria-label or link)
- [ ] Tooltip placeholder ready for "User Profile" text
- [ ] Responsive on mobile (may stack or shrink)
- [ ] Preparation for future dropdown menu

**Estimate**: S (2 points)

**Files**:
- `src/App.tsx` (navbar right section)
- `src/index.css` (profile area styling)

---

#### UIR-2.4: Accessibility & Keyboard Navigation (Navbar)
**Assigned**: a11y-sheriff

**Description**: Ensure navbar redesign maintains and improves accessibility compliance.

**Acceptance Criteria**:
- [ ] Tab order correct (left to right: brand skipped, nav pills, profile)
- [ ] All buttons accessible via keyboard
- [ ] Icon aria-labels clear and non-redundant with text
- [ ] Active state indicated via aria-current="page"
- [ ] Focus indicators visible on all buttons
- [ ] Color contrast AA for all states
- [ ] No touch target size issues (<44x44px)
- [ ] Tested with screen readers (NVDA, JAWS, VoiceOver)
- [ ] Axe-core scan shows zero violations

**Estimate**: M (3 points)

**Files**:
- `src/App.tsx` (review for a11y)
- `src/index.css` (review focus/contrast)

---

### PHASE 3: Viewer Filter Section Polish

#### UIR-3.1: Add Icons to Filter Dropdowns (Project, Type, Domain, Priority, Status)
**Assigned**: ui-engineer-enhanced

**Description**: Integrate icons into all filter dropdown components for visual clarity.

**Acceptance Criteria**:
- [ ] Project dropdown: globe/building icon
- [ ] Type dropdown: tag icon
- [ ] Domain dropdown: globe icon
- [ ] Priority dropdown: arrow/flag icon
- [ ] Status dropdown: circle/status icon
- [ ] Icons appear in dropdown trigger button
- [ ] Icons appear in dropdown options (optional, per design)
- [ ] Icon sizing matches design (--icon-sm or similar)
- [ ] Icon color matches text color
- [ ] No layout shifts when icon added

**Estimate**: M (3 points)

**Files**:
- `src/ui/viewer/FilterDropdown.tsx` (update)
- `src/ui/viewer/DocumentFilters.tsx` (update)

---

#### UIR-3.2: Refine Filter Section Layout & Spacing
**Assigned**: frontend-developer

**Description**: Update filter row layout, spacing, and visual hierarchy to match design.

**Acceptance Criteria**:
- [ ] Filter controls evenly spaced
- [ ] "Filter all" text/button visible on search row (right side)
- [ ] "Filter" button accent color (primary purple)
- [ ] Filter row responsive on mobile (wrap gracefully)
- [ ] Gap between filters consistent
- [ ] No overcrowding of controls
- [ ] Search input full-width on small screens
- [ ] Dropdowns sized appropriately
- [ ] Visual hierarchy clear (search prominent)

**Estimate**: M (3 points)

**Files**:
- `src/ui/viewer/viewer.css` (filter section)
- `src/ui/viewer/DocumentFilters.tsx` (layout refinement)

---

#### UIR-3.3: Implement "Filter" Button with Accent Color
**Assigned**: frontend-developer

**Description**: Create or enhance "Filter" button with purple accent color and improved styling.

**Acceptance Criteria**:
- [ ] Button uses primary color background
- [ ] Text white/light colored for contrast
- [ ] Hover state darker or lighter (maintain contrast)
- [ ] Active state (if applicable)
- [ ] Positioned clearly in filter controls
- [ ] WCAG AA contrast ratio met
- [ ] Tooltip explains button function (if needed)
- [ ] Consistent sizing with other controls

**Estimate**: S (2 points)

**Files**:
- `src/ui/viewer/DocumentFilters.tsx`
- `src/ui/viewer/viewer.css`

---

### PHASE 4: Document Cards Refinement

#### UIR-4.1: Create Stats Card Component
**Assigned**: ui-engineer-enhanced

**Description**: Build reusable stats card component for displaying Item Count, Updated date, Created date with icons.

**Acceptance Criteria**:
- [ ] Component accepts: label, value, icon, and optional meta
- [ ] Icons render inline with label
- [ ] Value displayed prominently
- [ ] Meta information (date, etc.) in smaller text
- [ ] Flex layout for horizontal arrangement
- [ ] Styling matches glass/x-morphism theme
- [ ] Accessible (aria labels if needed)
- [ ] Responsive on mobile

**Estimate**: M (3 points)

**Files**:
- `src/ui/viewer/StatsCard.tsx` (create)
- `src/ui/viewer/viewer.css` (add .stats-card styling)

---

#### UIR-4.2: Enhance DocumentRow Component with Metadata
**Assigned**: ui-engineer-enhanced

**Description**: Update DocumentRow to display enhanced metadata (item count, updated date, tags, actions menu).

**Acceptance Criteria**:
- [ ] Item count displayed with icon
- [ ] Updated date shown with calendar icon
- [ ] Tags displayed as inline chips/badges
- [ ] Three-dot menu placeholder for future actions
- [ ] Row expands/collapses on click
- [ ] Metadata visible in both collapsed and expanded states
- [ ] Improved padding and spacing
- [ ] Keyboard navigation works correctly
- [ ] Screen reader announces all metadata

**Estimate**: M (3 points)

**Files**:
- `src/ui/viewer/DocumentRow.tsx` (update)
- `src/ui/viewer/viewer.css` (update row styling)

---

#### UIR-4.3: Update DocumentDetail Expanded View with Stats
**Assigned**: ui-engineer-enhanced

**Description**: Enhance DocumentDetail component to show stats cards and improve visual hierarchy.

**Acceptance Criteria**:
- [ ] Stats section at top (Item Count, Updated, Created)
- [ ] Each stat in separate card with icon
- [ ] Full item list below stats
- [ ] Item cards with metadata (type, domain, priority, status)
- [ ] Tags displayed inline
- [ ] Markdown rendering for item details
- [ ] Visual separation between sections
- [ ] Responsive layout on mobile
- [ ] Scrollable content area

**Estimate**: M (3 points)

**Files**:
- `src/ui/viewer/DocumentDetail.tsx` (update)
- `src/ui/viewer/viewer.css` (update detail styling)

---

#### UIR-4.4: Add Three-Dot Menu Placeholder
**Assigned**: ui-engineer-enhanced

**Description**: Add three-dot menu icon to document rows as placeholder for future action menu.

**Acceptance Criteria**:
- [ ] Three-dot icon visible on row hover or always visible
- [ ] Icon clickable (placeholder for future menu)
- [ ] Tooltip "More actions" available
- [ ] Accessible (button, not just icon)
- [ ] Keyboard accessible
- [ ] Consistent styling with other icons
- [ ] Does not interfere with row expansion

**Estimate**: S (1 point)

**Files**:
- `src/ui/viewer/DocumentRow.tsx`
- `src/ui/viewer/viewer.css`

---

### PHASE 5: Testing & Validation

#### UIR-5.1: Visual Regression Testing (Playwright/Percy)
**Assigned**: task-completion-validator

**Description**: Set up and execute visual regression tests for all changed components.

**Acceptance Criteria**:
- [ ] Baseline screenshots captured (navbar, filters, document cards)
- [ ] Visual regression tests configured (Playwright + Percy or similar)
- [ ] All navbar states tested (Capture, Viewer, Admin tabs)
- [ ] All filter states tested (empty, with icons, with selection)
- [ ] Document card states tested (collapsed, expanded, with stats)
- [ ] Mobile responsive states tested
- [ ] Tests passing with zero regressions
- [ ] CI integration for future PRs

**Estimate**: M (3 points)

**Files**:
- `tests/visual/navbar.spec.ts` (create)
- `tests/visual/filters.spec.ts` (create)
- `tests/visual/document-cards.spec.ts` (create)

---

#### UIR-5.2: Accessibility Audit & Fix
**Assigned**: a11y-sheriff

**Description**: Comprehensive accessibility testing and remediation for all UI changes.

**Acceptance Criteria**:
- [ ] Axe-core scan on all pages shows zero violations
- [ ] WCAG 2.1 AA contrast ratios verified
- [ ] Keyboard navigation tested on all new/modified components
- [ ] Screen reader testing (NVDA, JAWS, VoiceOver)
- [ ] Icon aria-labels audit
- [ ] Focus indicators visible on all interactive elements
- [ ] Touch target sizes checked (minimum 44x44px)
- [ ] No new landmarks or structure violations
- [ ] Tested with real AT devices if possible

**Estimate**: M (3 points)

**Files**:
- `.claude/progress/accessibility-audit-v2.md` (update)
- Bug fixes as needed across src files

---

#### UIR-5.3: Cross-Browser & Responsive Testing
**Assigned**: task-completion-validator

**Description**: Verify UI works correctly across browsers and screen sizes.

**Acceptance Criteria**:
- [ ] Chrome latest tested (Windows, macOS, Linux)
- [ ] Firefox latest tested (Windows, macOS, Linux)
- [ ] Safari tested (macOS, iOS)
- [ ] Edge latest tested (Windows)
- [ ] Mobile responsive (480px, 768px, 1024px breakpoints)
- [ ] Tablet responsive verified
- [ ] Touch interactions work on mobile
- [ ] No layout shifts or overflow issues
- [ ] Flexbox/grid layouts render consistently
- [ ] Backdrop-filter behavior consistent (fallback for unsupported browsers)

**Estimate**: M (3 points)

**Files**:
- Test notes documented in `.claude/progress/`

---

#### UIR-5.4: Performance & Bundle Size Validation
**Assigned**: task-completion-validator

**Description**: Verify performance metrics and bundle size impact of UI changes.

**Acceptance Criteria**:
- [ ] Bundle size increase <15KB gzipped
- [ ] No new critical performance issues
- [ ] Filter operations still <100ms
- [ ] Document detail rendering <500ms
- [ ] Icon library loading optimized
- [ ] CSS changes do not cause layout thrashing
- [ ] No unexpected re-renders from component changes
- [ ] Bundle analysis report generated
- [ ] Performance benchmark comparison with baseline

**Estimate**: S (2 points)

**Files**:
- `.claude/progress/bundle-analysis.md` (create)

---

## Key Files to Modify

| File | Changes | Phase |
|------|---------|-------|
| `src/index.css` | CSS variables, nav button styling, pill design | 1, 2 |
| `src/App.tsx` | Navbar structure, icons, profile area | 2 |
| `src/ui/viewer/viewer.css` | Filter styling, card styling, stats | 1, 3, 4 |
| `src/ui/viewer/FilterDropdown.tsx` | Icon integration in dropdowns | 3 |
| `src/ui/viewer/DocumentFilters.tsx` | Filter layout, spacing, button styling | 3 |
| `src/ui/viewer/DocumentRow.tsx` | Enhanced metadata, three-dot menu | 4 |
| `src/ui/viewer/DocumentDetail.tsx` | Stats display, improved layout | 4 |
| `src/ui/viewer/StatsCard.tsx` | New component for stats display | 4 |

---

## Quality Gates per Phase

### Phase 1 Quality Gate
- [ ] All CSS variables properly scoped (no conflicts)
- [ ] Design tokens reviewed and approved
- [ ] Icon integration approach documented
- [ ] No unintended side effects on existing styles

### Phase 2 Quality Gate
- [ ] Navbar renders without errors
- [ ] All nav buttons clickable and functional
- [ ] Profile area placeholder working
- [ ] Accessibility baseline met (tabs, focus, ARIA)
- [ ] No layout regressions in wizard/admin views

### Phase 3 Quality Gate
- [ ] All filter dropdowns show icons
- [ ] Filter layout matches design spacing
- [ ] "Filter" button styled correctly
- [ ] No accessibility regressions
- [ ] Filters still function correctly

### Phase 4 Quality Gate
- [ ] Stats cards render and display data correctly
- [ ] DocumentRow shows all metadata
- [ ] DocumentDetail expanded view enhanced
- [ ] Three-dot menu accessible (placeholder)
- [ ] No data display issues

### Phase 5 Quality Gate
- [ ] All visual regression tests passing
- [ ] Zero accessibility violations (axe-core)
- [ ] Cross-browser testing complete
- [ ] Mobile responsive verified
- [ ] Performance targets met (<15KB bundle impact)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Icon library not rendering in Tauri | Medium | Medium | Test icon library in Tauri early (Phase 2); have SVG fallback |
| CSS backdrop-filter not supported in some browsers | Low | Low | Include fallback background color; feature degrades gracefully |
| Layout shifts from icon addition | Medium | Low | Careful testing with all filter states; CSS contain property; unit tests |
| Performance regression from new components | Low | Medium | Bundle size tracking (Phase 5); memoize components if needed |
| Accessibility regressions from new icons | Medium | Medium | Accessibility testing in Phase 5; ARIA audits throughout |
| Mobile layout overcrowding | Medium | Low | Early responsive testing; consider stacking on small screens |

---

## Dependencies & Prerequisites

- Icon library available and installable (Radix Icons recommended)
- Existing design system tokens documented
- Tauri/web platform testing setup ready
- Accessibility testing tools configured (axe-core, screen readers)
- Visual regression testing infrastructure in place

---

## Success Metrics

1. **Visual**: Design render implementation verified by visual regression tests
2. **Functional**: All navbar, filter, and card interactions working as designed
3. **Accessible**: Zero new a11y violations, WCAG 2.1 AA maintained
4. **Performance**: <15KB bundle size impact, no rendering regressions
5. **Quality**: 100% test coverage for new components, zero critical bugs
6. **User**: Positive feedback on improved visual hierarchy and icon clarity

---

## Implementation Notes

- All changes are **non-breaking** to existing logic (pure UI enhancements)
- Maintain backward compatibility with existing filter/viewer functionality
- Icons should be decorative with proper aria-hidden or semantic labels
- Use existing glass/x-morphism patterns consistently
- Test early and often in Tauri to catch platform-specific issues
- Consider motion preferences (prefers-reduced-motion) in transitions
- Prepare to ship behind feature flag if needed for staged rollout
