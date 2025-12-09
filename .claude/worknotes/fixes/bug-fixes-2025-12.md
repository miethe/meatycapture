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

- **Location**: `src-tauri/src/lib.rs:11-13` and `src-tauri/src/main.rs:14-17`
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

- **Commit(s)**: c1cc74a, b869778
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
- **Fix**: Created placeholder icons using ImageMagick with "MC" text on indigo background for all required formats (32x32.png, 128x128.png, 128x128@2x.png, icon.ico, icon.icns, icon.png). Required RGBA format with transparency - initial RGB icons caused "icon is not RGBA" error.
- **Commit(s)**: 2da4613, dbf7af1
- **Status**: RESOLVED

---

## React Error - setState Called During Render

**Issue**: Browser shows uncaught error instead of graceful error UI because `setInitError()` was called inside `useMemo`

- **Location**: `src/App.tsx` - AppContent component
- **Root Cause**: Calling `setState` during render is not allowed in React. The previous fix attempted to call `setInitError()` inside `useMemo`, which throws before the error can be handled.
- **Fix**: Moved store initialization to a separate function `initializeStores()` that returns a discriminated union `{ stores, error }` instead of calling setState. The error is now part of the return value, not a side effect.
- **Commit(s)**: 2da4613
- **Status**: RESOLVED

---

### Tauri Startup Fails - Invalid fs Plugin Configuration Schema

**Issue**: Tauri application panics on startup with `Error deserializing 'plugins.fs': unknown field 'scope'` (then `allow`) `expected 'requireLiteralLeadingDot'`

- **Location**: `src-tauri/tauri.conf.json` and missing `src-tauri/capabilities/`
- **Root Cause**: Tauri v2 completely changed the permissions model. The `allow`/`deny` fields don't go in `tauri.conf.json` at all - they must be defined in capabilities files. The only valid field in `plugins.fs` config is `requireLiteralLeadingDot`.
- **Fix**:
  1. Removed entire `plugins` section from `tauri.conf.json`
  2. Created `src-tauri/capabilities/default.json` with proper Tauri v2 permissions structure including `fs:default`, `fs:allow-read`, `fs:allow-write` scoped to `$HOME/**`
- **Commit(s)**: dc164ca, 1111551
- **Status**: RESOLVED

---

### Tauri App Shows "Platform Not Supported" Error

**Issue**: Both Tauri desktop app and web browser display "File-based configuration is not supported in web browsers" error, with no functional UI.

- **Location**: `src-tauri/tauri.conf.json` - missing `withGlobalTauri` setting
- **Root Cause**: Platform detection uses `window.__TAURI__` to identify Tauri environment. In Tauri v2, this global object is NOT exposed by default - requires explicit `withGlobalTauri: true` in app config. Without it, Tauri's webview looks like a regular browser to the detection logic.
- **Fix**: Added `"withGlobalTauri": true` to the `app` section of `tauri.conf.json`
- **Commit(s)**: ba27e13
- **Status**: RESOLVED

---

### Config Directory Creation Fails with "Unknown error"

**Issue**: App shows "Failed to create config directory /Users/miethe/.meatycapture: Unknown error" even when directory exists.

- **Location**: `src-tauri/capabilities/default.json` - insufficient fs permissions
- **Root Cause**: Tauri v2 requires explicit permissions for each filesystem operation. The generic `fs:allow-read` and `fs:allow-write` don't cover `exists()` checks or `mkdir()` calls - each needs its own permission identifier.
- **Fix**: Added specific permissions to capabilities:
  - `fs:allow-exists` - for checking if directory/files exist
  - `fs:allow-mkdir` - for creating directories
  - `fs:allow-read-dir` - for listing directory contents
  - Scoped to `$HOME/.meatycapture` and `$HOME/**` paths
- **Commit(s)**: 712b725
- **Status**: RESOLVED

---

### Writing Projects/Fields Files Fails with "Unknown error"

**Issue**: Creating a new project fails with "Failed to write projects file: Unknown error". Admin tab fails with "Failed to write fields file: Unknown error".

- **Location**: `src-tauri/capabilities/default.json` - wrong permission identifiers
- **Root Cause**: Tauri v2 has operation-specific permissions. `fs:allow-write` doesn't cover `writeTextFile()` - need `fs:allow-write-text-file` specifically. Same for read operations.
- **Fix**: Updated capabilities with correct operation-specific permissions:
  - `fs:allow-write-text-file` (instead of generic `fs:allow-write`)
  - `fs:allow-read-text-file` (instead of generic `fs:allow-read`)
  - `fs:allow-copy-file` (for backup operations)
- **Commit(s)**: 0de9e02
- **Status**: RESOLVED

---

### Document Write Fails for Project Paths with ~/

**Issue**: Creating a new document fails with "Failed to write document ~/projects/skillmeat/REQ-...: Unknown error"

- **Location**: `src/adapters/fs-local/tauri-fs-adapter.ts:44-49` - `expandPath()` function
- **Root Cause**: The `expandPath()` function had a misleading comment saying "Tauri handles ~/ expansion automatically" but it actually just returned paths unchanged. Tauri's `writeTextFile()` doesn't expand shell shortcuts - it needs absolute paths.
- **Fix**: Updated `expandPath()` to use `homeDir()` from `@tauri-apps/api/path` to properly expand `~/` prefix to the user's home directory before file operations.
- **Commit(s)**: ce9b56a
- **Status**: RESOLVED

---

### Web App Cannot Access Local Filesystem

**Issue**: Web app fails to load with error "File-based configuration is not supported in web browsers" and cannot be used for remote access.

- **Location**: `src/adapters/config-local/platform-factory.ts`, `src/adapters/fs-local/platform-factory.ts`
- **Root Cause**: The app's port/adapter pattern only had filesystem-based adapters (Tauri and Node.js). Platform factories explicitly threw errors for browser environments, making the web app unusable without Tauri.
- **Fix**: Created browser storage adapters following the existing port/adapter pattern:
  1. **IndexedDB DocStore** (`src/adapters/browser-storage/idb-doc-store.ts`):
     - Stores request-log documents with `doc_id` as primary key
     - Indexes on `project_id` for directory-like listing
     - Separate `backups` object store for document versioning
     - Full implementation of `list()`, `read()`, `write()`, `append()`, `backup()`, `isWritable()`
  2. **localStorage Config Stores** (`src/adapters/browser-storage/ls-config-stores.ts`):
     - `BrowserProjectStore`: Projects stored in `meatycapture_projects` key
     - `BrowserFieldCatalogStore`: Fields stored in `meatycapture_fields` key
     - Auto-initializes with `DEFAULT_FIELD_OPTIONS` on first access
  3. **Updated Platform Factories**: Now return browser adapters instead of throwing errors
  4. **Updated App.tsx**: Changed error messaging to be platform-agnostic
- **Commit(s)**: e977f17
- **Status**: RESOLVED

Note: The `sw.js:61` error about `chrome-extension://` scheme is unrelated - it's from a browser extension, not MeatyCapture.

---

### Tilde Path Expansion Missing in Node.js FsDocStore

**Issue**: Project directories and request-log documents are not created when using paths with tilde (`~`) notation in CLI/server mode.

- **Location**: `src/adapters/fs-local/index.ts` - FsDocStore class
- **Root Cause**: The Node.js `FsDocStore` did not expand tilde (`~`) paths to absolute home directory paths. When a user creates a project with `default_path: "~/projects/skillmeat"`, the path was used literally instead of expanding to `/Users/username/projects/skillmeat`. This caused `fs.mkdir()` to create a literal directory named `~` in the current working directory, and file writes would fail silently or write to wrong locations. The `TauriDocStore` (desktop adapter) already had this working via an `expandPath()` helper function.
- **Fix**:
  1. Added `expandPath()` helper function to `src/adapters/fs-local/index.ts:26-34`
  2. Applied path expansion to all DocStore methods: `list()`, `read()`, `write()`, `append()`, `backup()`, `isWritable()`
  3. Pattern: Each method now expands the path parameter as its first operation before any file system calls
- **Commit(s)**: 0bd9555
- **Status**: RESOLVED
