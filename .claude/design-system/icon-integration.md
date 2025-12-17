# Icon Integration Pattern

## Overview

This document defines the icon integration approach for the MeatyCapture UI refresh, establishing consistent patterns for icon selection, usage, sizing, colors, and accessibility.

## Icon Library Selection

### Primary: Radix UI Icons

**Why**: MeatyCapture already uses Radix UI for components, making `@radix-ui/react-icons` the natural choice for consistency and reduced bundle size.

**Installation**:
```bash
pnpm add @radix-ui/react-icons
```

**Benefits**:
- Tree-shakeable: Only imported icons are bundled
- Consistent design language with Radix UI components
- Lightweight SVG icons (no extra dependencies)
- Excellent accessibility defaults (proper viewBox, strokes)
- No runtime overhead

### Alternative: Lucide React

If Radix UI icons don't have a required icon:

**Installation**:
```bash
pnpm add lucide-react
```

**When to use**:
- Radix UI missing specific icon variant
- Need icon not available in Radix UI set
- Preferred for specific visual style

**Note**: Prefer Radix UI first to maintain visual consistency.

## Import Patterns

### Named Imports (Recommended)

Named imports enable tree-shaking and are explicit about which icons are used:

```tsx
import { Pencil2Icon, EyeOpenIcon, GearIcon } from '@radix-ui/react-icons';
import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
```

### Usage in Components

```tsx
export function CaptureNavButton() {
  return (
    <button className="nav-button">
      <Pencil2Icon className="nav-icon" aria-hidden="true" />
      <span>Capture</span>
    </button>
  );
}
```

### Dynamic Icons (Avoid When Possible)

If icons must be selected dynamically, use a mapping object:

```tsx
const statusIconMap = {
  triage: CrossCircledIcon,
  active: CheckCircledIcon,
  completed: CheckCircledIcon,
  deferred: CircleIcon,
} as const;

export function StatusIcon({ status }: { status: keyof typeof statusIconMap }) {
  const IconComponent = statusIconMap[status];
  return <IconComponent className="status-icon" aria-hidden="true" />;
}
```

## Size Guidelines

Use CSS variables for consistent sizing across the application:

```css
:root {
  --icon-xs: 12px;    /* Inline indicators, badges */
  --icon-sm: 16px;    /* Filter dropdowns, small buttons */
  --icon-md: 20px;    /* Navigation icons, primary actions */
  --icon-lg: 24px;    /* Hero icons, empty states */
}
```

### Size Usage

| Size | Use Cases | CSS Class |
|------|-----------|-----------|
| XS (12px) | Inline indicators, small badges, secondary elements | `.icon-xs` |
| SM (16px) | Filter dropdown icons, small action buttons | `.icon-sm` |
| MD (20px) | Navigation tabs, primary action buttons | `.icon-md` |
| LG (24px) | Empty state illustrations, hero sections | `.icon-lg` |

### Implementation

```tsx
// Explicit size classes
<Pencil2Icon className="icon-md" aria-hidden="true" />

// CSS
.icon-xs { width: var(--icon-xs); height: var(--icon-xs); }
.icon-sm { width: var(--icon-sm); height: var(--icon-sm); }
.icon-md { width: var(--icon-md); height: var(--icon-md); }
.icon-lg { width: var(--icon-lg); height: var(--icon-lg); }
```

## Color and Fill Patterns

Icons inherit `currentColor` from parent elements by default, enabling flexible theming.

### Default Behavior

```css
svg {
  stroke: currentColor;
  fill: currentColor;
}
```

### State-Based Colors

```css
/* Inactive state */
.filter-button {
  color: var(--color-text-secondary);
}

/* Active/Hover state */
.filter-button:hover,
.filter-button.active {
  color: var(--color-text-primary);
}

/* Primary background (white text) */
.nav-button.active {
  color: white;
  background-color: var(--color-primary);
}

/* Disabled state */
.filter-button:disabled {
  color: var(--color-text-muted);
  opacity: 0.5;
}
```

### Specific Color Scenarios

```tsx
// Active navigation item
<button className="nav-button active">
  <Pencil2Icon className="icon-md" aria-hidden="true" />
  <span>Capture</span>
</button>

// Filter button (inactive)
<button className="filter-button">
  <GlobeIcon className="icon-sm" aria-hidden="true" />
  <span>Project</span>
</button>

// Status indicator (red for critical)
<span className="status-indicator" style={{ color: 'var(--color-critical)' }}>
  <CircleIcon className="icon-xs" aria-hidden="true" />
</span>
```

## Spacing Rules

### Icon-Text Gap

```css
:root {
  --icon-gap: 0.5rem;  /* Space between icon and text */
}
```

### Vertical Alignment

Icons and text must align vertically using flexbox:

```tsx
<button className="button-with-icon">
  <Pencil2Icon className="icon-md" aria-hidden="true" />
  <span>Capture</span>
</button>

/* CSS */
.button-with-icon {
  display: flex;
  align-items: center;
  gap: var(--icon-gap);
}

.button-with-icon svg {
  flex-shrink: 0;  /* Prevent icon squishing */
}
```

### Consistent Icon Button Pattern

```tsx
export function IconButton({ icon: IconComponent, label, ...props }: IconButtonProps) {
  return (
    <button className="icon-button" {...props}>
      <IconComponent className="icon-md" aria-hidden="true" />
      <span className="label">{label}</span>
    </button>
  );
}

/* CSS */
.icon-button {
  display: flex;
  align-items: center;
  gap: var(--icon-gap);
  padding: 0.5rem 1rem;
}

.icon-button svg {
  flex-shrink: 0;
}
```

## Icon-Text Button Pattern

Standard pattern for all navigation and action buttons:

```tsx
<button className="nav-button">
  <Pencil2Icon className="icon-md" aria-hidden="true" />
  <span>Capture</span>
</button>

<button className="action-button">
  <GearIcon className="icon-md" aria-hidden="true" />
  <span>Settings</span>
</button>
```

### CSS

```css
.nav-button,
.action-button {
  display: inline-flex;
  align-items: center;
  gap: var(--icon-gap);
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover,
.action-button:hover {
  background-color: var(--color-surface-hover);
}

.nav-button.active {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}
```

## Accessibility Considerations

### Decorative Icons

When icon is decorative and text provides meaning, use `aria-hidden="true"`:

```tsx
// Good: Icon is decorative, span provides meaning
<button>
  <Pencil2Icon className="icon-md" aria-hidden="true" />
  <span>Capture</span>
</button>
```

### Interactive Icons Without Text

Icon-only buttons require `aria-label` or tooltip:

```tsx
// Good: Icon-only button with aria-label
<button aria-label="Edit project settings">
  <GearIcon className="icon-md" />
</button>

// Alternative: Tooltip on hover
<button title="Edit project settings">
  <GearIcon className="icon-md" />
</button>
```

### Status/Semantic Icons

Icons conveying critical information should not be hidden:

```tsx
// Good: Status icon is semantic, not hidden
<span className="status">
  <CheckCircledIcon className="icon-sm" />
  <span>Completed</span>
</span>
```

### Screen Reader Testing

- Icon-only buttons: Test with screen reader to verify `aria-label` or `title` announces correctly
- Icon-text combinations: Verify screen reader doesn't duplicate meaning
- Status icons: Ensure semantic meaning isn't lost with `aria-hidden`

## Icon Mappings

### Navigation Tabs

| Tab | Icon | Radix UI Icon |
|-----|------|---------------|
| Capture | Pencil | `Pencil2Icon` |
| Viewer | Eye | `EyeOpenIcon` |
| Admin | Gear/Settings | `GearIcon` |
| Profile | Person | `PersonIcon` |

### Filter Dropdowns

| Filter | Icon | Radix UI Icon |
|--------|------|---------------|
| Project | Globe | `GlobeIcon` |
| Type | Tag | `TagIcon` |
| Domain | Layers | `LayersIcon` |
| Priority | Arrow Up / Chart | `ArrowUpIcon` or `BarChartIcon` |
| Status | Circle | `CircleIcon` |

### Document Cards

| Element | Icon | Radix UI Icon |
|---------|------|---------------|
| Item Count | File Text | `FileTextIcon` |
| Updated Date | Calendar | `CalendarIcon` |
| Created Date | Clock | `ClockIcon` |
| More Actions | Dots Horizontal | `DotsHorizontalIcon` |

### Status Indicators

| Status | Icon | Radix UI Icon |
|--------|------|---------------|
| Completed | Check Circle | `CheckCircledIcon` |
| Error/Invalid | Cross Circle | `CrossCircledIcon` |
| Pending | Circle | `CircleIcon` |
| In Progress | Hourglass | `HourglassIcon` |

### Document Operations

| Action | Icon | Radix UI Icon |
|--------|------|---------------|
| Add/Create | Plus | `PlusIcon` |
| Edit | Pencil | `Pencil2Icon` |
| Delete | Trash | `TrashIcon` |
| Download | Download | `DownloadIcon` |
| Copy | Copy | `CopyIcon` |

## Implementation Examples

### Navigation Tab Component

```tsx
import {
  Pencil2Icon,
  EyeOpenIcon,
  GearIcon,
  PersonIcon,
} from '@radix-ui/react-icons';

interface NavTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export function NavigationTabs() {
  const tabs: NavTab[] = [
    {
      id: 'capture',
      label: 'Capture',
      icon: <Pencil2Icon className="icon-md" aria-hidden="true" />,
    },
    {
      id: 'viewer',
      label: 'Viewer',
      icon: <EyeOpenIcon className="icon-md" aria-hidden="true" />,
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: <GearIcon className="icon-md" aria-hidden="true" />,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <PersonIcon className="icon-md" aria-hidden="true" />,
    },
  ];

  return (
    <nav className="nav-tabs">
      {tabs.map((tab) => (
        <button key={tab.id} className={`nav-tab ${tab.active ? 'active' : ''}`}>
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
```

### Filter Button Component

```tsx
import { GlobeIcon, ChevronDownIcon } from '@radix-ui/react-icons';

export function FilterButton({
  label,
  icon: IconComponent,
  isActive,
  ...props
}: {
  label: string;
  icon: React.ComponentType<any>;
  isActive?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`filter-button ${isActive ? 'active' : ''}`}
      {...props}
    >
      <IconComponent className="icon-sm" aria-hidden="true" />
      <span>{label}</span>
      <ChevronDownIcon className="icon-xs" aria-hidden="true" />
    </button>
  );
}

export function ProjectFilter() {
  return <FilterButton label="Project" icon={GlobeIcon} />;
}
```

### Document Card Component

```tsx
import {
  FileTextIcon,
  CalendarIcon,
  ClockIcon,
  DotsHorizontalIcon,
} from '@radix-ui/react-icons';
import { formatDate } from '@/lib/format';

export function DocumentCard({
  title,
  itemCount,
  updated,
  created,
}: {
  title: string;
  itemCount: number;
  updated: Date;
  created: Date;
}) {
  return (
    <div className="document-card">
      <h3>{title}</h3>

      <div className="doc-meta">
        <span className="meta-item">
          <FileTextIcon className="icon-sm" aria-hidden="true" />
          <span>{itemCount} items</span>
        </span>

        <span className="meta-item">
          <CalendarIcon className="icon-sm" aria-hidden="true" />
          <span>Updated {formatDate(updated)}</span>
        </span>

        <span className="meta-item">
          <ClockIcon className="icon-sm" aria-hidden="true" />
          <span>Created {formatDate(created)}</span>
        </span>
      </div>

      <button className="icon-button" aria-label="More options">
        <DotsHorizontalIcon className="icon-md" />
      </button>
    </div>
  );
}
```

## Best Practices

1. **Consistency**: Always use Radix UI icons unless unavailable; fallback to Lucide React
2. **Sizing**: Use CSS variables (`--icon-xs`, `--icon-sm`, `--icon-md`, `--icon-lg`)
3. **Spacing**: Always use `--icon-gap` for icon-text spacing
4. **Alignment**: Use flexbox with `align-items: center` for vertical alignment
5. **Tree-shaking**: Use named imports exclusively; avoid dynamic icon selection when possible
6. **Accessibility**: Add `aria-hidden="true"` to decorative icons; use `aria-label` for icon-only buttons
7. **Colors**: Leverage `currentColor` inheritance for theme-aware icons
8. **Performance**: Icons are lightweight; don't lazy-load or optimize bundle splitting for icons

## Maintenance

- Icon mappings are defined above; update as new features are added
- CSS variables defined in `:root` should be maintained in global stylesheet
- New icons should follow the naming and sizing conventions established here
- Review accessibility with each new icon integration (test with screen reader)
