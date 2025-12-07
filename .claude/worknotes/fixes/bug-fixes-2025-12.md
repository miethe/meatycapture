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

---

## Tauri Build Fails - Invalid #[cfg] Attribute Placement

**Issue**: Tauri build fails with Rust syntax errors: `expected ';', found '#'` and `expected expression, found '.'`

- **Location**: `src-tauri/src/lib.rs:11-13`
- **Root Cause**: The `#[cfg(...)]` attribute was placed inline within a method chain, which is invalid Rust syntax. Attributes can only be applied to items (functions, structs, blocks), not expressions within a chain.
- **Fix**: Refactored to use a mutable builder pattern with a conditional block

  ```rust
  let mut builder = tauri::Builder::default()
      .plugin(tauri_plugin_fs::init());
  #[cfg(not(any(target_os = "android", target_os = "ios")))]
  {
      builder = builder.plugin(tauri_plugin_shell::init());
  }
  builder.run(tauri::generate_context!())...
  ```

- **Commit(s)**: c1cc74a
- **Status**: RESOLVED

---

## Browser Shows Blank Page - Platform Factory Errors Not Handled

**Issue**: When running `pnpm dev` in a browser (not Tauri), the app shows a blank page instead of the UI.

- **Location**: `src/App.tsx` - Store initialization in `useMemo`
- **Root Cause**: The platform factories throw errors in browser context (file system access not available), which crashes the React component during initialization with no error boundary.
- **Fix**:
  1. Added `initError` state to track initialization failures
  2. Wrapped store creation in try/catch within useMemo
  3. Added graceful error UI with "Platform Not Supported" message
  4. Styled error panel with glass morphism design
  5. Included helpful instructions to use `pnpm tauri dev`
- **Commit(s)**: c1cc74a
- **Status**: RESOLVED

---

## Tauri Build Fails - Missing Icon Files

**Issue**: Tauri build fails with `failed to open icon icons/32x32.png: No such file or directory`

- **Location**: `src-tauri/icons/` directory
- **Root Cause**: The `tauri.conf.json` references icon files that were never created. Only a README.md existed in the icons directory.
- **Fix**: Created placeholder icons using ImageMagick with "MC" text on indigo background for all required formats (32x32.png, 128x128.png, 128x128@2x.png, icon.ico, icon.icns, icon.png)
- **Commit(s)**: 2da4613
- **Status**: RESOLVED

---

## React Error - setState Called During Render

**Issue**: Browser shows uncaught error instead of graceful error UI because `setInitError()` was called inside `useMemo`

- **Location**: `src/App.tsx` - AppContent component
- **Root Cause**: Calling `setState` during render is not allowed in React. The previous fix attempted to call `setInitError()` inside `useMemo`, which throws before the error can be handled.
- **Fix**: Moved store initialization to a separate function `initializeStores()` that returns a discriminated union `{ stores, error }` instead of calling setState. The error is now part of the return value, not a side effect.
- **Commit(s)**: 2da4613
- **Status**: RESOLVED
