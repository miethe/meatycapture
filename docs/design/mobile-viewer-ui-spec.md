---
title: "Mobile UI Design Specification: Request Log Viewer"
description: "Detailed UI design specs for mobile-responsive Request Log Viewer redesign"
status: "draft"
created: 2025-12-30
updated: 2025-12-30
owners: ["design-lead", "frontend-lead"]
audience: [engineering, design]
category: "design-spec"
---

# Mobile UI Design Specification: Request Log Viewer

## Executive Summary

This document provides detailed UI design specifications for the mobile-responsive redesign of the Request Log Viewer tab in MeatyCapture. The redesign transforms the desktop table-based layout into a touch-optimized mobile experience while preserving all functionality.

**Key Design Decisions:**
- Table-to-Card transformation for document entries
- Bottom sheet pattern for filter controls
- Half-sheet modal for document details
- Sticky search bar with filter badge indicator
- Preserved desktop experience (no changes to >=769px)

**Breakpoints:**
- Mobile: <= 768px (primary target)
- Small Mobile: <= 640px (compact adjustments)
- Desktop: >= 769px (unchanged)

---

## 1. Mobile Document Card Design

### 1.1 Visual Structure

```
+----------------------------------------------------------+
|  [Card Container - Full Width with 16px side margins]     |
|                                                           |
|  +------------------------------------------------------+ |
|  |  +------------------------------------------+        | |
|  |  | REQ-20251230-capture-app                 |  [...]  | |
|  |  +------------------------------------------+        | |
|  |                                                      | |
|  |  Enhancement Request: Add Dark Mode Support          | |
|  |                                                      | |
|  |  +--------+  +--------+  +----------+               | |
|  |  | 5 items|  | Today  |  | high     |               | |
|  |  +--------+  +--------+  +----------+               | |
|  |                                                      | |
|  |  [ ux ]  [ dark-mode ]  [ +2 ]                      | |
|  |                                                      | |
|  +------------------------------------------------------+ |
|                                                           |
+----------------------------------------------------------+
```

### 1.2 Component Specifications

#### Card Container
```css
/* Mobile Document Card */
.mobile-doc-card {
  /* Layout */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);           /* 0.5rem / 8px */
  padding: var(--spacing-md);        /* 1rem / 16px */
  margin: 0 var(--spacing-md);       /* Horizontal margins only */
  margin-bottom: var(--spacing-sm);  /* 8px gap between cards */

  /* Glass Morphism */
  background: var(--card-glass-bg);  /* rgba(30, 41, 59, 0.6) */
  border: 1px solid var(--card-glass-border); /* rgba(255, 255, 255, 0.1) */
  border-radius: var(--border-radius); /* 12px */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  /* Touch Optimization */
  min-height: 88px;                  /* 2x minimum touch target */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  /* Interaction */
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Pressed/Active State */
.mobile-doc-card:active {
  transform: scale(0.98);
  background: var(--card-hover-bg);  /* rgba(37, 99, 235, 0.08) */
}
```

#### Card Header Row (Doc ID + Menu)
```css
.mobile-doc-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

/* Document ID Badge */
.mobile-doc-id {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.75rem;               /* 12px */
  font-weight: 500;
  padding: var(--spacing-xs) var(--spacing-sm); /* 4px 8px */
  background: var(--color-bg-glass-active); /* rgba(255, 255, 255, 0.16) */
  border-radius: var(--radius-sm);  /* 6px */
  color: var(--color-text-muted);   /* rgba(255, 255, 255, 0.75) */
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Menu Button (3-dot) */
.mobile-doc-menu-btn {
  /* Touch Target Compliance */
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;

  /* Visual */
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);

  /* Always visible on mobile */
  opacity: 1;
}

.mobile-doc-menu-btn:active {
  background: var(--color-hover-bg);
  color: var(--color-text);
}
```

#### Card Title
```css
.mobile-doc-title {
  font-size: 1rem;                  /* 16px */
  font-weight: 600;
  color: var(--color-text);         /* rgba(255, 255, 255, 0.95) */
  line-height: 1.4;
  margin: var(--spacing-xs) 0;

  /* Text Truncation */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

#### Metadata Row (Item Count, Date, Priority)
```css
.mobile-doc-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);           /* 8px */
  align-items: center;
}

/* Individual Metadata Chip */
.mobile-meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;                     /* 4px */
  padding: 0.25rem 0.5rem;          /* 4px 8px */
  background: var(--color-bg-glass); /* rgba(255, 255, 255, 0.08) */
  border: 1px solid var(--color-border); /* rgba(255, 255, 255, 0.18) */
  border-radius: var(--radius-full); /* 9999px (pill) */
  font-size: 0.75rem;               /* 12px */
  color: var(--color-text-muted);
}

.mobile-meta-chip svg {
  width: 12px;
  height: 12px;
  opacity: 0.7;
}
```

#### Tags Row
```css
.mobile-doc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;                    /* 6px */
  margin-top: var(--spacing-xs);
}

/* Tag Chip */
.mobile-tag-chip {
  padding: 0.125rem 0.5rem;         /* 2px 8px */
  background: rgba(37, 99, 235, 0.15);
  color: var(--color-primary);      /* #2563eb */
  border-radius: var(--radius-full);
  font-size: 0.6875rem;             /* 11px */
  font-weight: 500;
  white-space: nowrap;
}

/* Overflow Indicator */
.mobile-tag-more {
  padding: 0.125rem 0.5rem;
  background: var(--color-bg-glass);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}
```

### 1.3 Interaction States

| State | Background | Border | Transform | Shadow |
|-------|-----------|--------|-----------|--------|
| Default | `rgba(30,41,59,0.6)` | `rgba(255,255,255,0.1)` | none | `0 4px 6px rgba(0,0,0,0.25)` |
| Hover (if touch supports hover) | `rgba(37,99,235,0.08)` | `rgba(37,99,235,0.2)` | none | `0 4px 12px rgba(0,0,0,0.3)` |
| Pressed/Active | `rgba(37,99,235,0.12)` | `rgba(37,99,235,0.3)` | `scale(0.98)` | `0 2px 4px rgba(0,0,0,0.2)` |
| Selected/Expanded | `rgba(37,99,235,0.15)` | `rgba(37,99,235,0.4)` | none | `0 4px 16px rgba(37,99,235,0.2)` |
| Disabled | `rgba(30,41,59,0.3)` | `rgba(255,255,255,0.05)` | none | none |

### 1.4 Card List Layout

```css
/* Card List Container */
.mobile-doc-list {
  display: flex;
  flex-direction: column;
  gap: 0;                           /* Cards handle their own margins */
  padding-bottom: 100px;            /* Space for FAB and bottom nav */
}

/* Project Group Header (if grouped) */
.mobile-project-group-header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--filter-glass-bg); /* rgba(30, 41, 59, 0.5) */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);

  /* Touch Target */
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-project-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.mobile-project-count {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: var(--color-bg-glass-active);
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
}
```

---

## 2. Filter Bottom Sheet Design

### 2.1 Visual Structure

```
+----------------------------------------------------------+
|                                                           |
|  +------------------------------------------------------+ |
|  |                    [ Handle ]                        | |
|  +------------------------------------------------------+ |
|  |                                                      | |
|  |  Filters                              [ Clear All ]  | |
|  |  -------------------------------------------------- | |
|  |                                                      | |
|  |  Project                                             | |
|  |  +------------------------------------------------+ | |
|  |  | All Projects                            [v]    | | |
|  |  +------------------------------------------------+ | |
|  |                                                      | |
|  |  Type                                                | |
|  |  +------------------------------------------------+ | |
|  |  | Select types...                         [v]    | | |
|  |  +------------------------------------------------+ | |
|  |                                                      | |
|  |  Domain                                              | |
|  |  +------------------------------------------------+ | |
|  |  | Select domains...                       [v]    | | |
|  |  +------------------------------------------------+ | |
|  |                                                      | |
|  |  Priority                                            | |
|  |  +------------------------------------------------+ | |
|  |  | Select priorities...                    [v]    | | |
|  |  +------------------------------------------------+ | |
|  |                                                      | |
|  |  Status                                              | |
|  |  +------------------------------------------------+ | |
|  |  | Select statuses...                      [v]    | | |
|  |  +------------------------------------------------+ | |
|  |                                                      | |
|  |  Tags                                                | |
|  |  +------------------------------------------------+ | |
|  |  | [ ux ] [ dark-mode ] [ + Add tag ]             | | |
|  |  +------------------------------------------------+ | |
|  |                                                      | |
|  |  +------------------------------------------------+ | |
|  |  |            Apply Filters (12)                  | | |
|  |  +------------------------------------------------+ | |
|  |                                                      | |
|  +------------------------------------------------------+ |
|                                                           |
+----------------------------------------------------------+
```

### 2.2 Trigger Button (FAB Style)

```css
/* Filter FAB - Fixed Position */
.mobile-filter-fab {
  /* Positioning */
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom) + 24px);
  right: 16px;
  z-index: 50;

  /* Touch Target */
  width: 56px;
  height: 56px;
  min-width: 56px;
  min-height: 56px;

  /* Visual */
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);  /* #2563eb */
  border: none;
  border-radius: 16px;               /* Squircle-ish */
  color: white;

  /* Shadow */
  box-shadow:
    0 4px 12px rgba(37, 99, 235, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.2);

  /* Interaction */
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-filter-fab:active {
  transform: scale(0.95);
  box-shadow:
    0 2px 8px rgba(37, 99, 235, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2);
}

.mobile-filter-fab svg {
  width: 24px;
  height: 24px;
}

/* Filter Count Badge */
.mobile-filter-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #ef4444;              /* Red for attention */
  color: white;
  border-radius: var(--radius-full);
  font-size: 0.6875rem;             /* 11px */
  font-weight: 700;

  /* Hide when 0 */
  opacity: 1;
  transform: scale(1);
  transition: all 0.2s ease;
}

.mobile-filter-badge.hidden {
  opacity: 0;
  transform: scale(0.5);
}
```

### 2.3 Bottom Sheet Container

```css
/* Scrim/Backdrop */
.mobile-sheet-scrim {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);

  /* Animation */
  opacity: 0;
  transition: opacity 0.3s ease;
}

.mobile-sheet-scrim.visible {
  opacity: 1;
}

/* Sheet Container */
.mobile-filter-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 101;

  /* Size */
  max-height: 85vh;
  min-height: 40vh;

  /* Glass Morphism */
  background: var(--color-surface);  /* rgba(30, 41, 59, 0.8) */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--card-glass-border);
  border-radius: 24px 24px 0 0;

  /* Shadow */
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.4);

  /* Animation */
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.mobile-filter-sheet.open {
  transform: translateY(0);
}

/* Drag Handle */
.mobile-sheet-handle {
  width: 36px;
  height: 4px;
  margin: 12px auto;
  background: var(--color-text-muted);
  border-radius: var(--radius-full);
  opacity: 0.4;
}

/* Sheet Header */
.mobile-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.mobile-sheet-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
}

/* Clear All Button */
.mobile-sheet-clear-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-size: 0.875rem;

  min-height: 36px;
  min-width: 36px;
}

.mobile-sheet-clear-btn:active {
  background: var(--color-bg-glass-hover);
}

/* Sheet Content (Scrollable) */
.mobile-sheet-content {
  overflow-y: auto;
  padding: var(--spacing-lg);
  padding-bottom: calc(env(safe-area-inset-bottom) + 88px); /* Room for action button */
  max-height: calc(85vh - 140px);
  -webkit-overflow-scrolling: touch;
}

/* Filter Field Group */
.mobile-filter-group {
  margin-bottom: var(--spacing-lg);
}

.mobile-filter-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

/* Full-Width Filter Controls */
.mobile-filter-select {
  width: 100%;
  min-height: 48px;                 /* Larger touch target */
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--filter-input-bg);
  border: 1px solid var(--card-glass-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: 1rem;
}

/* Sheet Footer (Fixed Action) */
.mobile-sheet-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--spacing-md) var(--spacing-lg);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--spacing-md));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

/* Apply Filters Button */
.mobile-filter-apply-btn {
  width: 100%;
  min-height: 52px;
  padding: var(--spacing-md);

  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);

  color: white;
  font-size: 1rem;
  font-weight: 600;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.mobile-filter-apply-btn:active {
  background: #1d4ed8;
  transform: scale(0.98);
}
```

### 2.4 Animation Specifications

| Animation | Duration | Easing | Properties |
|-----------|----------|--------|------------|
| Sheet Open | 300ms | `cubic-bezier(0.32, 0.72, 0, 1)` | `transform: translateY(0)` |
| Sheet Close | 250ms | `cubic-bezier(0.32, 0.72, 0, 1)` | `transform: translateY(100%)` |
| Scrim Fade In | 300ms | `ease` | `opacity: 1` |
| Scrim Fade Out | 250ms | `ease` | `opacity: 0` |
| Badge Pop | 200ms | `cubic-bezier(0.68, -0.55, 0.27, 1.55)` | `transform: scale(1)` |

### 2.5 Gesture Support

```
Drag Down to Dismiss:
- Track touch Y delta
- If drag > 100px and velocity > 0.5: dismiss
- If drag < 100px: snap back
- Visual: sheet follows finger with slight resistance (0.7x multiplier)
```

---

## 3. Document Detail Half-Sheet Design

### 3.1 Visual Structure

```
+----------------------------------------------------------+
|                                                           |
|  +------------------------------------------------------+ |
|  |                    [ Handle ]                        | |
|  +------------------------------------------------------+ |
|  |                                                      | |
|  |  REQ-20251230-capture-app-01              [ Copy ]   | |
|  |                                                      | |
|  |  Enhancement Request: Add Dark Mode Support          | |
|  |  -------------------------------------------------- | |
|  |                                                      | |
|  |  +----------+  +----------+  +----------+           | |
|  |  | Items    |  | Updated  |  | Created  |           | |
|  |  |   5      |  | Today    |  | Dec 28   |           | |
|  |  +----------+  +----------+  +----------+           | |
|  |                                                      | |
|  |  Tags                                                | |
|  |  [ ux ] [ dark-mode ] [ accessibility ]             | |
|  |                                                      | |
|  |  +------------------------------------------------+ | |
|  |  |             View Full Document                 | | |
|  |  +------------------------------------------------+ | |
|  |                                                      | |
|  +------------------------------------------------------+ |
|                                                           |
+----------------------------------------------------------+
```

### 3.2 Half-Sheet Container

```css
/* Half-Sheet (Summary View) */
.mobile-detail-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 101;

  /* Size - Half screen by default */
  height: 50vh;
  max-height: 60vh;

  /* Glass Morphism */
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--card-glass-border);
  border-radius: 24px 24px 0 0;

  /* Shadow */
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.5);

  /* Animation */
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.mobile-detail-sheet.open {
  transform: translateY(0);
}

/* Drag handle - same as filter sheet */
.mobile-detail-handle {
  width: 36px;
  height: 4px;
  margin: 12px auto;
  background: var(--color-text-muted);
  border-radius: var(--radius-full);
  opacity: 0.4;
}

/* Content area */
.mobile-detail-content {
  padding: 0 var(--spacing-lg);
  padding-bottom: calc(env(safe-area-inset-bottom) + 88px);
  overflow-y: auto;
  height: calc(100% - 32px);
  -webkit-overflow-scrolling: touch;
}

/* Document ID Row */
.mobile-detail-id-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.mobile-detail-doc-id {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.8125rem;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-bg-glass-active);
  border-radius: var(--radius-sm);
  color: var(--color-text);
}

/* Copy Button */
.mobile-detail-copy-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: var(--color-bg-glass);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
}

.mobile-detail-copy-btn:active {
  background: var(--color-bg-glass-active);
  color: var(--color-text);
}

/* Document Title */
.mobile-detail-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

/* Stats Row */
.mobile-detail-stats {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.mobile-detail-stats::-webkit-scrollbar {
  display: none;
}

/* Stat Card */
.mobile-stat-card {
  flex: 1;
  min-width: 100px;
  padding: var(--spacing-md);
  background: var(--card-glass-bg);
  border: 1px solid var(--card-glass-border);
  border-radius: var(--border-radius);
  text-align: center;
}

.mobile-stat-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-xs);
}

.mobile-stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

/* Tags Section */
.mobile-detail-tags-section {
  margin-bottom: var(--spacing-lg);
}

.mobile-detail-tags-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.mobile-detail-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

/* View Full Button */
.mobile-detail-view-full-btn {
  position: absolute;
  left: var(--spacing-lg);
  right: var(--spacing-lg);
  bottom: calc(env(safe-area-inset-bottom) + var(--spacing-md));

  min-height: 52px;
  padding: var(--spacing-md);

  background: var(--color-bg-glass);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);

  color: var(--color-text);
  font-size: 1rem;
  font-weight: 500;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.mobile-detail-view-full-btn:active {
  background: var(--color-bg-glass-active);
  border-color: var(--color-border-focus);
}
```

### 3.3 Full Document View (Expanded State)

```css
/* Full screen expansion */
.mobile-detail-sheet.expanded {
  height: 100vh;
  max-height: 100vh;
  border-radius: 0;
}

/* Full view content */
.mobile-detail-full-content {
  padding-top: env(safe-area-inset-top);
}

/* Back/Close button in full view */
.mobile-detail-back-btn {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 12px);
  left: 16px;
  z-index: 10;

  width: 44px;
  height: 44px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: var(--color-bg-glass);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text);
}
```

### 3.4 Entry/Exit Animations

| Animation | Duration | Easing | Description |
|-----------|----------|--------|-------------|
| Slide Up (Open) | 350ms | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheet slides up from bottom |
| Slide Down (Close) | 300ms | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheet slides down |
| Expand to Full | 400ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Height grows to 100vh |
| Collapse to Half | 350ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Height shrinks to 50vh |

---

## 4. Mobile Header/Toolbar Design

### 4.1 Visual Structure

```
+----------------------------------------------------------+
|                                                           |
|  +------------------------------------------------------+ |
|  | Request Logs                     [ Refresh ] [ Sort ] | |
|  +------------------------------------------------------+ |
|  |                                                      | |
|  | +--------------------------------------------------+ | |
|  | |  [Search icon] Search documents...        [x]    | | |
|  | +--------------------------------------------------+ | |
|  |                                                      | |
|  | Showing 12 of 45 documents                          | |
|  |                                                      | |
|  +------------------------------------------------------+ |
|                                                           |
+----------------------------------------------------------+
```

### 4.2 Sticky Header Specifications

```css
/* Mobile Header Container */
.mobile-viewer-header {
  position: sticky;
  top: 0;
  z-index: 50;

  background: var(--nav-pill-glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--nav-pill-glass-border);

  padding: var(--spacing-sm) var(--spacing-md);
  padding-top: calc(env(safe-area-inset-top) + var(--spacing-sm));
}

/* Title Row */
.mobile-header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.mobile-header-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.mobile-header-actions {
  display: flex;
  gap: var(--spacing-xs);
}

/* Icon Buttons */
.mobile-header-icon-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: var(--color-bg-glass);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
}

.mobile-header-icon-btn:active {
  background: var(--color-bg-glass-active);
  color: var(--color-text);
}

.mobile-header-icon-btn svg {
  width: 20px;
  height: 20px;
}

/* Search Bar */
.mobile-search-container {
  position: relative;
  margin-bottom: var(--spacing-sm);
}

.mobile-search-input {
  width: 100%;
  min-height: 48px;
  padding: var(--spacing-sm) var(--spacing-md);
  padding-left: 44px;                /* Room for search icon */
  padding-right: 44px;               /* Room for clear button */

  background: var(--filter-input-bg);
  border: 1px solid var(--card-glass-border);
  border-radius: var(--radius-md);

  color: var(--color-text);
  font-size: 1rem;
}

.mobile-search-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px rgba(99, 150, 255, 0.15);
}

.mobile-search-input::placeholder {
  color: var(--color-text-muted);
  opacity: 0.7;
}

/* Search Icon */
.mobile-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--color-text-muted);
  pointer-events: none;
}

/* Clear Button */
.mobile-search-clear {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);

  width: 36px;
  height: 36px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);

  /* Hidden when search is empty */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.mobile-search-clear.visible {
  opacity: 1;
  pointer-events: auto;
}

.mobile-search-clear:active {
  background: var(--color-bg-glass-hover);
}

/* Result Count */
.mobile-result-count {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.mobile-result-count strong {
  color: var(--color-text);
  font-weight: 600;
}

/* Active Filter Indicator (inline badge) */
.mobile-filter-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  background: rgba(37, 99, 235, 0.2);
  border: 1px solid rgba(37, 99, 235, 0.4);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-primary);
  margin-left: var(--spacing-sm);
}
```

### 4.3 Sort Dropdown (Mobile)

```css
/* Sort Dropdown Trigger */
.mobile-sort-dropdown {
  position: relative;
}

/* Sort Menu (appears below button) */
.mobile-sort-menu {
  position: absolute;
  top: calc(100% + var(--spacing-xs));
  right: 0;
  min-width: 180px;

  background: var(--color-bg-dropdown);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  z-index: 60;
  overflow: hidden;

  animation: dropdownOpen 0.2s ease;
}

.mobile-sort-option {
  width: 100%;
  min-height: 48px;
  padding: var(--spacing-sm) var(--spacing-md);

  display: flex;
  align-items: center;
  justify-content: space-between;

  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: 0.9375rem;
  text-align: left;
}

.mobile-sort-option:active {
  background: var(--color-bg-glass-hover);
}

.mobile-sort-option.active {
  background: var(--color-bg-glass-active);
  color: var(--color-text);
}

.mobile-sort-option .check-icon {
  width: 16px;
  height: 16px;
  color: var(--color-primary);
  opacity: 0;
}

.mobile-sort-option.active .check-icon {
  opacity: 1;
}
```

---

## 5. Component State Matrix

### 5.1 Document Card States

| State | Trigger | Visual Changes | Duration |
|-------|---------|----------------|----------|
| Default | Initial render | Base styling | - |
| Hover | Touch hover (if supported) | Border glow, subtle lift | 200ms |
| Pressed | Touch start | Scale 0.98, darker bg | 100ms |
| Selected | Card tap | Blue border, highlight bg | 200ms |
| Loading | Async fetch | Skeleton shimmer | Until loaded |
| Error | Fetch failure | Red border, error icon | - |
| Disabled | Feature flag | 50% opacity, no pointer | - |

### 5.2 Bottom Sheet States

| State | Trigger | Visual Changes | Animation |
|-------|---------|----------------|-----------|
| Closed | Default | Hidden (translateY 100%) | - |
| Opening | FAB tap | Slide up | 300ms ease-out |
| Open | Animation complete | Visible, scrim active | - |
| Dragging | Touch drag | Follows finger (0.7x) | Real-time |
| Dismissing | Drag > 100px | Slide down | 250ms ease-in |
| Snapping Back | Drag < 100px | Return to open | 200ms spring |

### 5.3 Filter Control States

| Component | Default | Focus | Active/Selected | Disabled |
|-----------|---------|-------|-----------------|----------|
| Select | Glass bg, muted text | Blue ring, bright border | Value shown | 50% opacity |
| Multi-Select | Placeholder text | Blue ring | Chips visible | 50% opacity |
| Tags Input | Placeholder | Cursor visible | Popover open | 50% opacity |
| Apply Button | Primary bg | Blue ring | Scale 0.98 | 50% opacity |

### 5.4 Search Bar States

| State | Visual | Behavior |
|-------|--------|----------|
| Empty | Placeholder visible, clear hidden | Focus shows keyboard |
| Has Value | Clear button visible | Type to filter |
| Focused | Blue border glow | Keyboard open |
| Searching | Loading indicator | Debounced (300ms) |
| Results | Count updated | List filtered |

---

## 6. Responsive Behavior Notes

### 6.1 Breakpoint Transitions

```css
/* Primary Mobile Breakpoint */
@media (max-width: 768px) {
  /* Hide desktop table */
  .viewer-catalog-table { display: none; }

  /* Show mobile card list */
  .mobile-doc-list { display: flex; }

  /* Hide desktop filter row */
  .viewer-filters-row { display: none; }

  /* Show filter FAB */
  .mobile-filter-fab { display: flex; }

  /* Stack header vertically */
  .viewer-header {
    flex-direction: column;
    align-items: stretch;
  }
}

/* Small Mobile Adjustments */
@media (max-width: 640px) {
  /* Reduce padding */
  .mobile-doc-card {
    padding: var(--spacing-sm);
    margin: 0 var(--spacing-sm);
  }

  /* Smaller title */
  .mobile-doc-title {
    font-size: 0.9375rem;
  }

  /* Horizontal scroll for stats */
  .mobile-detail-stats {
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  /* Compact stat cards */
  .mobile-stat-card {
    min-width: 80px;
    padding: var(--spacing-sm);
  }

  .mobile-stat-value {
    font-size: 1rem;
  }
}
```

### 6.2 Safe Area Handling

```css
/* iOS Safe Areas */
.mobile-viewer-header {
  padding-top: calc(env(safe-area-inset-top) + var(--spacing-sm));
}

.mobile-filter-fab {
  bottom: calc(env(safe-area-inset-bottom) + 24px);
}

.mobile-sheet-footer {
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--spacing-md));
}

.mobile-doc-list {
  padding-bottom: calc(env(safe-area-inset-bottom) + 100px);
}

/* Android Navigation Bar */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  /* Same rules apply - env() returns 0 if not supported */
}
```

### 6.3 Orientation Handling

```css
/* Landscape Mode */
@media (max-width: 768px) and (orientation: landscape) {
  /* Limit sheet height in landscape */
  .mobile-filter-sheet {
    max-height: 70vh;
  }

  .mobile-detail-sheet {
    height: 60vh;
    max-height: 80vh;
  }

  /* Two-column card layout if width allows */
  @media (min-width: 600px) {
    .mobile-doc-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
    }

    .mobile-doc-card {
      margin: 0;
    }
  }
}
```

---

## 7. Accessibility Specifications

### 7.1 ARIA Attributes

```html
<!-- Document Card -->
<article
  class="mobile-doc-card"
  role="button"
  tabindex="0"
  aria-label="Document REQ-20251230-capture-app: Enhancement Request, 5 items, updated today"
  aria-expanded="false"
>

<!-- Filter FAB -->
<button
  class="mobile-filter-fab"
  aria-label="Open filters, 3 active filters"
  aria-haspopup="dialog"
  aria-expanded="false"
>

<!-- Bottom Sheet -->
<div
  class="mobile-filter-sheet"
  role="dialog"
  aria-modal="true"
  aria-label="Document filters"
>

<!-- Search Input -->
<input
  class="mobile-search-input"
  type="search"
  role="searchbox"
  aria-label="Search documents"
  aria-describedby="search-hint"
/>
<span id="search-hint" class="sr-only">
  Type to filter documents by title or content
</span>

<!-- Result Count (Live Region) -->
<div
  class="mobile-result-count"
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  Showing 12 of 45 documents
</div>
```

### 7.2 Focus Management

```javascript
// When sheet opens
sheetElement.querySelector('[autofocus]')?.focus();

// When sheet closes
triggerElement.focus();

// Trap focus within sheet
const focusableElements = sheet.querySelectorAll(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
);
```

### 7.3 Touch Target Compliance

All interactive elements meet 44x44px minimum:

| Element | Actual Size | Compliant |
|---------|-------------|-----------|
| Card tap area | Full card (min 88px height) | Yes |
| Menu button | 44x44px | Yes |
| FAB | 56x56px | Yes |
| Sheet controls | 48px height | Yes |
| Search clear | 36x36px (within 44px touch area) | Yes |
| Sort options | 48px height | Yes |

### 7.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .mobile-filter-sheet,
  .mobile-detail-sheet {
    transition: none;
  }

  .mobile-doc-card:active {
    transform: none;
  }

  .mobile-filter-fab:active {
    transform: none;
  }

  /* Instant state changes instead of animations */
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Implementation Checklist

### 8.1 New Components Required

- [ ] `MobileDocCard` - Card representation of document
- [ ] `MobileDocList` - Card list container with virtual scrolling
- [ ] `MobileFilterSheet` - Bottom sheet for filters
- [ ] `MobileDetailSheet` - Half-sheet for document details
- [ ] `MobileFilterFab` - Floating action button with badge
- [ ] `MobileSearchBar` - Sticky search with clear button
- [ ] `MobileSortDropdown` - Sort menu component

### 8.2 CSS Additions Required

- [ ] `viewer-mobile.css` - All mobile-specific styles
- [ ] Sheet animation keyframes
- [ ] Safe area utilities
- [ ] Touch state styles

### 8.3 Hook Requirements

- [ ] `useBottomSheet` - Sheet open/close/drag logic
- [ ] `useSafeArea` - Safe area inset values
- [ ] `useReducedMotion` - Motion preference detection
- [ ] `useMobileViewport` - Viewport size detection

### 8.4 Integration Points

- [ ] Add breakpoint detection to `ViewerContainer`
- [ ] Conditional render: desktop table vs mobile cards
- [ ] Shared filter state between desktop/mobile
- [ ] Unified document cache
- [ ] Consistent sort state

---

## 9. CSS Custom Properties Reference

### 9.1 New Mobile-Specific Tokens

```css
:root {
  /* Mobile Touch Targets */
  --mobile-touch-min: 44px;
  --mobile-touch-comfortable: 48px;
  --mobile-fab-size: 56px;

  /* Mobile Spacing */
  --mobile-card-gap: 8px;
  --mobile-section-gap: 16px;

  /* Mobile Typography */
  --mobile-title-size: 1rem;
  --mobile-meta-size: 0.75rem;
  --mobile-tag-size: 0.6875rem;

  /* Sheet Dimensions */
  --sheet-handle-width: 36px;
  --sheet-handle-height: 4px;
  --sheet-border-radius: 24px;
  --sheet-max-height: 85vh;
  --half-sheet-height: 50vh;

  /* Animation Timings */
  --sheet-open-duration: 300ms;
  --sheet-close-duration: 250ms;
  --sheet-easing: cubic-bezier(0.32, 0.72, 0, 1);

  /* FAB Positioning */
  --fab-bottom-offset: 24px;
  --fab-right-offset: 16px;
}
```

### 9.2 Existing Tokens Used

From `index.css`:
- `--color-primary`: #2563eb
- `--color-surface`: rgba(30, 41, 59, 0.8)
- `--card-glass-bg`: rgba(30, 41, 59, 0.6)
- `--card-glass-border`: rgba(255, 255, 255, 0.1)
- `--filter-glass-bg`: rgba(30, 41, 59, 0.5)
- `--filter-input-bg`: rgba(15, 23, 42, 0.6)
- `--border-radius`: 12px
- `--backdrop-blur`: blur(8px)

From `shared.css`:
- `--spacing-xs` through `--spacing-xl`
- `--radius-sm` through `--radius-full`
- `--transition-fast`, `--transition-normal`
- `--color-text`, `--color-text-muted`
- `--color-border`, `--color-border-focus`

---

## 10. File Locations

### New Files to Create

```
src/ui/viewer/
  mobile/
    MobileDocCard.tsx
    MobileDocList.tsx
    MobileFilterSheet.tsx
    MobileDetailSheet.tsx
    MobileFilterFab.tsx
    MobileSearchBar.tsx
    MobileSortDropdown.tsx
    mobile-viewer.css
    index.ts

src/ui/shared/
  hooks/
    useBottomSheet.ts
    useSafeArea.ts
    useReducedMotion.ts
    useMobileViewport.ts
```

### Files to Modify

```
src/ui/viewer/
  ViewerContainer.tsx    - Add mobile/desktop conditional rendering
  viewer.css             - Add @media breakpoint wrapper for desktop styles
  index.ts               - Export mobile components
```

---

*Document Version: 1.0*
*Last Updated: 2025-12-30*
*Author: Design System Team*
