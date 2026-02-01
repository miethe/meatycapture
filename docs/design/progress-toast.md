# Progress Toast Design Spec

Toast notification component with countdown progress bar for auto-dismiss feedback.

## Overview

| Property | Value |
|----------|-------|
| **Location** | `src/ui/shared/Toast.tsx` + `src/ui/shared/toast.css` |
| **Hook** | `src/ui/shared/useToast.tsx` |
| **Auto-dismiss** | 5000ms default (configurable) |
| **Progress update** | ~60fps (16ms intervals) |
| **Variants** | `success`, `error`, `warning`, `info` |
| **Styling** | Glass/morphism with backdrop blur |

## Progress Bar Implementation

The progress bar provides visual countdown feedback:

1. Records `startTime` when toast mounts
2. Runs interval every 16ms calculating `elapsed / duration * 100`
3. Sets `width: ${100 - progress}%` — shrinks from 100% to 0%
4. Triggers dismiss with 300ms exit animation when complete

```tsx
// Toast.tsx:33-47
const interval = setInterval(() => {
  const elapsed = Date.now() - startTime;
  const newProgress = Math.min((elapsed / duration) * 100, 100);
  setProgress(newProgress);
  if (newProgress >= 100) {
    clearInterval(interval);
    handleDismiss();
  }
}, 16);
```

## Visual Design

### Progress Bar Styling

- **Height**: 3px at bottom of toast
- **Position**: Absolute, anchored to bottom-left
- **Gradient**: Variant-specific color (green/red/yellow/blue)
- **Glow**: `box-shadow` matching variant color
- **Transition**: `width 16ms linear`

### Variant Colors

| Variant | Color | RGB |
|---------|-------|-----|
| success | Green | `rgba(99, 255, 150, 0.6-0.9)` |
| error | Red | `rgba(255, 99, 99, 0.6-0.9)` |
| warning | Yellow | `rgba(255, 204, 99, 0.6-0.9)` |
| info | Blue | `rgba(99, 150, 255, 0.6-0.9)` |

### Animations

| Animation | Duration | Easing |
|-----------|----------|--------|
| Slide in | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Slide out | 300ms | `cubic-bezier(0.4, 0, 1, 1)` |
| Transform | `translateX` + `scale(0.95-1)` | — |

## Usage

```tsx
const { addToast } = useToast();

// Basic usage
addToast({ type: 'success', message: 'Document deleted' });

// Custom duration
addToast({ type: 'error', message: 'Failed to save', duration: 7000 });
```

## Data Structures

```typescript
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // milliseconds, default 5000
}
```

## Accessibility

| Feature | Implementation |
|---------|---------------|
| Role | `role="alert"` |
| Live region | `aria-live="assertive"` (error) / `"polite"` (others) |
| Atomic | `aria-atomic="true"` |
| Dismiss button | `aria-label="Dismiss notification"` |
| Reduced motion | Respects `prefers-reduced-motion` media query |

## Component Architecture

```
ToastProvider (context)
└── ToastContainer (positioned fixed top-right)
    └── Toast (individual notification)
        ├── toast-content
        │   ├── toast-icon
        │   ├── toast-message
        │   └── toast-dismiss (button)
        └── toast-progress (animated bar)
```
