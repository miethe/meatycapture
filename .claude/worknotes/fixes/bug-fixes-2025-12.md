# Bug Fixes - December 2025

## App Shows Only Title - No UI Rendering

**Issue**: After implementing all 4 phases, the web app builds and starts but only displays the title "MeatyCapture" and subtitle with no navigation, wizard, or admin functionality visible.

- **Location**: `src/App.tsx:33` - Empty `<main>` element with placeholder comment
- **Root Cause**:
  1. The `<main>` element contained only `{/* Wizard or admin content will go here */}` - a placeholder that was never implemented
  2. WizardFlow and AdminContainer components existed but were never imported or rendered
  3. Store dependencies (ProjectStore, FieldCatalogStore, DocStore, Clock) were never initialized
  4. No navigation existed to switch between wizard and admin views
  5. Platform factories for config stores were missing, causing Node.js module bundling failures
- **Fix**:
  1. Updated `App.tsx` to import and render WizardFlow and AdminContainer
  2. Added store initialization using `useMemo` for performance
  3. Added view state and navigation buttons to switch between Capture and Admin views
  4. Created `tauri-config-adapter.ts` with TauriProjectStore and TauriFieldCatalogStore implementations
  5. Created `platform-factory.ts` for config stores with platform detection
  6. Fixed platform factories to avoid static imports of Node.js modules (caused Rollup bundling failures)
  7. Added navigation CSS with glass morphism styling
- **Commit(s)**: e24c3b6
- **Status**: RESOLVED
