# Toast Notification System

A glass/morphism styled toast notification system for MeatyCapture with support for success, error, warning, and info variants.

## Features

- **4 Variants**: success, error, warning, info with distinct colors and icons
- **Auto-dismiss**: Configurable duration (default 5 seconds) with progress indicator
- **Manual dismiss**: Click X button to dismiss immediately
- **Animations**: Slide in from right, fade out on dismiss
- **Stacking**: Multiple toasts stack vertically in top-right corner
- **Accessibility**: Proper ARIA labels, keyboard navigation, screen reader support
- **Reduced motion**: Respects `prefers-reduced-motion` preference

## Installation

The toast system is already integrated into the app. Just use the `useToast` hook in your components.

## Usage

### Basic Usage

```tsx
import { useToast } from '@ui/shared';

function MyComponent() {
  const { addToast } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      addToast({
        type: 'success',
        message: 'Saved successfully!',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to save. Please try again.',
      });
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### Custom Duration

```tsx
addToast({
  type: 'warning',
  message: 'This action cannot be undone.',
  duration: 7000, // 7 seconds
});
```

### All Toast Types

```tsx
const { addToast } = useToast();

// Success
addToast({ type: 'success', message: 'Operation completed!' });

// Error
addToast({ type: 'error', message: 'Something went wrong' });

// Warning
addToast({ type: 'warning', message: 'Please review your input' });

// Info
addToast({ type: 'info', message: 'Press Ctrl+S to save' });
```

### Managing Toasts

```tsx
const { addToast, dismissToast, clearAll } = useToast();

// Add and get ID
const id = addToast({ type: 'info', message: 'Processing...' });

// Dismiss specific toast
dismissToast(id);

// Clear all toasts
clearAll();
```

## API Reference

### `useToast()`

Hook to access toast functionality. Must be used within a `ToastProvider`.

**Returns:**

```typescript
{
  toasts: ToastData[];
  addToast: (options: {
    type: ToastType;
    message: string;
    duration?: number;
  }) => string;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}
```

### `ToastProvider`

Context provider that must wrap your app. Already integrated in `App.tsx`.

```tsx
<ToastProvider>
  <YourApp />
</ToastProvider>
```

### Types

```typescript
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // milliseconds, default 5000
}
```

## Design

### Colors

Each variant has a distinct accent color matching the glass/morphism design:

- **Success**: Green (`rgba(99, 255, 150)`)
- **Error**: Red (`rgba(255, 99, 99)`)
- **Warning**: Yellow/Orange (`rgba(255, 204, 99)`)
- **Info**: Blue (`rgba(99, 150, 255)`)

### Positioning

- Fixed position: top-right corner
- Spacing: `var(--spacing-lg)` from edges
- Stack gap: `var(--spacing-md)` between toasts
- Max width: 24rem
- Responsive: Full width on mobile (< 768px)

### Animations

- **Entry**: Slide in from right with scale (300ms cubic-bezier)
- **Exit**: Slide out to right with scale (300ms cubic-bezier)
- **Progress bar**: Linear animation matching toast duration

## Accessibility

- **ARIA live regions**: `assertive` for errors, `polite` for others
- **ARIA atomic**: All toasts are atomic regions
- **Button labels**: Dismiss button has `aria-label="Dismiss notification"`
- **Keyboard navigation**: Full keyboard support
- **Screen readers**: Proper announcement of toast messages
- **Focus management**: Dismiss button is keyboard accessible
- **Reduced motion**: Simplified animations when `prefers-reduced-motion` is set

## Examples

See `Toast.example.tsx` for comprehensive examples and helper patterns.

## Testing

```bash
# Run toast tests
pnpm test src/ui/shared/__tests__/Toast.test.tsx
pnpm test src/ui/shared/__tests__/useToast.test.tsx

# All toast tests
pnpm test -- --run "src/ui/shared/__tests__/Toast"
```

## Common Patterns

### Save Operation

```tsx
const handleSave = async () => {
  try {
    await saveItem(data);
    addToast({ type: 'success', message: 'Item saved successfully!' });
  } catch (error) {
    addToast({
      type: 'error',
      message: 'Failed to save. Please try again.',
      duration: 7000,
    });
  }
};
```

### Validation Feedback

```tsx
const handleSubmit = () => {
  if (!isValid) {
    addToast({
      type: 'error',
      message: 'Please fix validation errors before submitting.',
    });
    return;
  }
  // ... continue
};
```

### Background Process

```tsx
const startProcess = async () => {
  const toastId = addToast({
    type: 'info',
    message: 'Processing...',
    duration: 10000,
  });

  try {
    await longRunningTask();
    dismissToast(toastId);
    addToast({ type: 'success', message: 'Process completed!' });
  } catch (error) {
    dismissToast(toastId);
    addToast({ type: 'error', message: 'Process failed' });
  }
};
```

## Integration in MeatyCapture

The toast system is integrated into:

- **Wizard flow**: Save/append operations
- **Admin interface**: Field management operations
- **Validation**: Form validation errors
- **File operations**: Backup warnings, write failures

Use toasts for:
- ✅ Async operation feedback
- ✅ Validation errors
- ✅ Success confirmations
- ✅ Warning messages
- ✅ Info/tips

Avoid toasts for:
- ❌ Critical errors requiring user action (use modals)
- ❌ Long-form content (use dedicated UI)
- ❌ Persistent information (use inline messages)
