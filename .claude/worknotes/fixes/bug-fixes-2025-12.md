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

---

### Vite Blocks MEATYCAPTURE_API_URL from Browser

**Issue**: Web app cannot detect API mode because `MEATYCAPTURE_API_URL` environment variable is not accessible in the browser context.

- **Location**: `vite.config.ts:33`
- **Root Cause**: Vite only exposes environment variables to the browser that match the `envPrefix` patterns. The configuration only included `VITE_` and `TAURI_` prefixes, blocking `MEATYCAPTURE_API_URL` from `import.meta.env`. The platform detection logic in `src/platform/api-detection.ts` checks for this variable to determine API mode, but always received `undefined` in browsers.
- **Fix**: Added `'MEATYCAPTURE_'` to the `envPrefix` array in `vite.config.ts`
- **Commit(s)**: 0b57252
- **Status**: RESOLVED

---

### Server CORS Middleware Not Applied

**Issue**: Cross-origin requests from the web app to the backend server fail with CORS errors despite middleware being implemented.

- **Location**: `src/server/index.ts:180` - fetch handler
- **Root Cause**: The CORS middleware was fully implemented in `src/server/middleware/cors.ts` but was never imported or used in the server's `Bun.serve` fetch handler. All responses lacked the required `Access-Control-Allow-Origin` headers.
- **Fix**:
  1. Imported `createDefaultCorsMiddleware` from `./middleware/cors.js`
  2. Initialized middleware instance in `main()` before `Bun.serve`
  3. Wrapped the fetch handler's routing logic with the CORS middleware
- **Commit(s)**: 0b57252
- **Status**: RESOLVED

---

### Server Missing /api/projects and /api/fields Routes

**Issue**: API requests to `/api/projects` and `/api/fields` return 404 Not Found despite route handlers existing in separate files.

- **Location**: `src/server/index.ts` - fetch handler routing
- **Root Cause**: The route handlers for projects (`src/server/routes/projects.ts`) and fields (`src/server/routes/fields.ts`) were fully implemented but never imported or registered in the main server entry point. Only the `docsRouter` was wired up. The stores (`ProjectStore`, `FieldCatalogStore`) were also not instantiated.
- **Fix**:
  1. Imported `createProjectsRouter` and `createFieldsRouter` from route modules
  2. Imported `createProjectStore` and `createFieldCatalogStore` from `@adapters/config-local`
  3. Initialized project and field stores with the expanded data directory
  4. Created router instances with their respective stores
  5. Added route handling blocks for `/api/projects/*` and `/api/fields/*` endpoints
- **Commit(s)**: 6d21945
- **Status**: RESOLVED

---

### Server Rejects Empty Domain/Context Fields

**Issue**: Creating a new request fails with 400 ValidationError because the server rejects empty `domain` and `context` fields that the UI allows.

- **Location**: `src/server/schemas/docs.ts:48-49` and `:249-250`
- **Root Cause**: The UI's `ItemStep.tsx` only validates `title`, `type`, `priority`, and `status` as required fields, allowing empty `domain` and `context`. However, the server's `validateRequestLogItem()` and `validateItemDraftBody()` functions used `validateString()` which rejects empty strings.
- **Fix**: Changed `domain` and `context` validation to accept empty strings, following the same pattern as the `notes` field:
  ```typescript
  domain: typeof item.domain === 'string' ? item.domain : '',
  context: typeof item.context === 'string' ? item.context : '',
  ```
- **Commit(s)**: a240c6d
- **Status**: RESOLVED

---

### Web App ERR_CONNECTION_REFUSED on /api/projects

**Issue**: Web app fails to load with `ERR_CONNECTION_REFUSED` on `:3737/api/projects` after running `pnpm dev`.

- **Location**: `.env:27`
- **Root Cause**: The `.env` file had `MEATYCAPTURE_API_URL=http://localhost:3737` uncommented, which triggers API mode in the platform detection logic. When the frontend uses API mode, it expects a backend server running on port 3737, but only the Vite dev server was started.
- **Fix**: Commented out `MEATYCAPTURE_API_URL` in `.env` to disable API mode. The app now defaults to browser mode (IndexedDB storage) when no server is running. Users who want API mode should run `pnpm run server:dev` before starting the frontend.
- **Commit(s)**: (configuration change, not committed)
- **Status**: RESOLVED

---

### Docker Web Container Cannot Connect to API Server

**Issue**: Web app running in Docker container fails with `ERR_CONNECTION_REFUSED` on `:3737/api/projects` even when both containers are running.

- **Location**: `docker-compose.yml:43` and `.env:34`
- **Root Cause**: Two separate issues:
  1. **Wrong API URL**: `docker-compose.yml` passed `http://meatycapture-server:3001` (internal Docker network name) as the build arg for `MEATYCAPTURE_API_URL`. This URL is embedded into the browser JavaScript at build time. Browsers running on the host machine cannot resolve Docker internal service names.
  2. **Missing CORS origin**: The web container serves on port 8069 (`WEB_PORT=8069`), but `CORS_ORIGINS` only listed ports 5173, 4173, and 3000 - not 8069. API requests from port 8069 would be blocked by CORS even with correct URL.
- **Fix**:
  1. Changed `docker-compose.yml` to use `${MEATYCAPTURE_API_URL:-http://localhost:3737}` - external host URL
  2. Added `http://localhost:8069,http://localhost:80` to `CORS_ORIGINS` in `.env`
  3. Requires: `docker compose build meatycapture-web && docker compose up -d`
- **Commit(s)**: f75b9d1
- **Status**: RESOLVED

---

### Docker Port Mapping Mismatch Causes ERR_CONNECTION_RESET

**Issue**: Web app fails to connect to API server with `GET http://localhost:3737/api/projects net::ERR_CONNECTION_RESET` when running via docker-compose.

- **Location**: `docker-compose.yml:97` - port mapping
- **Root Cause**: Port mismatch between Docker port mapping and server binding:
  - Docker port mapping: `"3737:3001"` (host 3737 → container 3001)
  - Server `PORT` env var: `3737` (from `.env` file)
  - Result: Server binds to port 3737 inside container, but Docker forwards to container port 3001 where nothing is listening
- **Fix**:
  1. Changed port mapping from `"3737:3001"` to `"3737:${PORT:-3001}"` so container port matches PORT env var
  2. Updated health check to use dynamic port: `process.env.PORT || 3001` instead of hardcoded 3001
  3. Updated header comments to reflect correct port documentation
- **Commit(s)**: 7d0148b
- **Status**: RESOLVED

---

### Docker Container Cannot Create Config Directory

**Issue**: API server returns InternalServerError on `/api/projects` with `EACCES: permission denied, mkdir '/home/meatycapture'`.

- **Location**: `docker-compose.yml:113` - MEATYCAPTURE_DATA_DIR environment variable
- **Root Cause**: The `.env` file sets `MEATYCAPTURE_DATA_DIR=~/.meatycapture` which expands to `/home/meatycapture/.meatycapture` inside the container. However:
  - The `meatycapture` user (UID 1001) has no home directory created
  - `/home` is owned by root, so mkdir fails with permission denied
  - The docker-compose default was `${MEATYCAPTURE_DATA_DIR:-/data}` but `env_file: .env` overrode it
- **Fix**: Hardcoded `MEATYCAPTURE_DATA_DIR: /data` in docker-compose.yml (ignoring .env override). The `/data` volume is properly mounted and owned by the meatycapture user. The .env setting is only for native/local development.
- **Commit(s)**: 5620456
- **Status**: RESOLVED

---

### Document Write Fails with Tilde Path in Docker

**Issue**: Creating a new request log fails with `EACCES: permission denied, mkdir '/home/meatycapture'` when project has `default_path: ~/projects/skillmeat`.

- **Location**: `src/adapters/fs-local/index.ts:26-34` - expandPath function
- **Root Cause**: The `expandPath()` function used `homedir()` from Node's `os` module to expand tilde paths. In the Docker container:
  - Container user is `meatycapture` (UID 1001)
  - `homedir()` returns `/home/meatycapture` which doesn't exist
  - User has no permission to create `/home/meatycapture`
  - Project paths like `~/projects/skillmeat` became `/home/meatycapture/projects/skillmeat`
- **Fix**: Made `expandPath()` environment-aware:
  - Added `getBaseDir()` helper that returns `MEATYCAPTURE_DATA_DIR` if set, otherwise `homedir()`
  - In server/Docker mode: `~/projects/skillmeat` → `/data/projects/skillmeat`
  - In desktop mode: `~/projects/skillmeat` → `/Users/username/projects/skillmeat`
- **Commit(s)**: 805282c
- **Status**: RESOLVED

---

### UI Refresh Layout Doesn't Match Design Render

**Issue**: The UI refresh implementation didn't match the design render (`viewer-render.png`). The navbar was vertically stacked instead of horizontally distributed, and filter dropdowns were wrapping to multiple rows instead of staying in a single horizontal row.

- **Location**: `src/App.tsx:104-155`, `src/index.css:84-200`, `src/ui/viewer/DocumentFilters.tsx`, `src/ui/viewer/viewer.css:119-131`
- **Root Cause**: Two layout issues:
  1. **Navbar**: The `.app` class used `align-items: center; justify-content: center;` causing all content to be centered. The header had brand and nav-row stacked vertically with a wrapper div preventing proper `space-between` distribution.
  2. **Filters**: The `.viewer-filters-row` used `flex-wrap: wrap` causing dropdowns to stack vertically on narrower viewports, and min-widths were too large to fit all 5 dropdowns.
- **Fix**:
  1. **Navbar layout** (`src/index.css`):
     - Removed centering from `.app`, added `header` styles with `display: flex; justify-content: space-between` for Brand LEFT | Nav CENTER | Profile RIGHT
     - Added `main` element styling with `flex: 1` to fill remaining height
     - Updated `.header-brand` to `text-align: left` and hidden tagline
  2. **Header structure** (`src/App.tsx`):
     - Removed `.header-nav-row` wrapper - brand, nav, and profile are now direct children of header
  3. **Filter layout** (`src/ui/viewer/viewer.css`):
     - Changed `.viewer-filters-row` to `flex-wrap: nowrap` forcing single-line layout
     - Reduced `.filter-control` min-width from 10rem to 7rem, added max-width 10rem
     - Reduced dropdown trigger min-widths from 120px to 80px
     - Added `overflow-x: auto` for horizontal scroll on very small viewports
  4. **Filter structure** (`src/ui/viewer/DocumentFilters.tsx`):
     - Added "Filter" accent button with `MixerVerticalIcon` to first row
     - Added "Filter all" button to second row
- **Commit(s)**: 2218fe3
- **Status**: RESOLVED

---

### Project Data Wiped on App Restart

**Issue**: When restarting the app instance (clicking "Done" after submission, or refreshing the page), project details appear to be wiped. Projects should persist across deployments based on localStorage.

- **Location**: `src/adapters/browser-storage/ls-config-stores.ts:560-577`, `src/ui/wizard/ReviewStep.tsx:104`, `src/App.tsx`
- **Root Cause**: Compound bug with three contributing factors:
  1. **Non-singleton store instances**: Each call to `createBrowserProjectStore()` created a new `BrowserProjectStore` instance. No singleton pattern, no shared state between instances.
  2. **React StrictMode double-invocation**: In development mode, React StrictMode intentionally double-invokes components and hooks, causing multiple store instances to be created.
  3. **Hard page reload**: The "Done" button in `ReviewStep` used `window.location.reload()` which destroyed all JavaScript state and forced full app reinitialization with new store instances.
  4. **Silent empty array return**: `readProjects()` returned `[]` on missing localStorage data without logging, making it impossible to distinguish between "no projects" and "data failed to load".
- **Fix**:
  1. Implemented singleton pattern for `BrowserProjectStore` and `BrowserFieldCatalogStore` - module-level instances ensure all code shares the same store
  2. Replaced `window.location.reload()` in ReviewStep with state reset callback that clears wizard state without page reload
  3. Added `handleWizardComplete` callback in WizardFlow that resets: selectedProject, selectedDocPath, draft, submitSuccess, batchingMode, completedSteps, currentStep
  4. Added development-only console warnings when localStorage data is missing (gated by `import.meta.env.DEV`)
  5. Added platform indicator badge in navbar showing current storage mode (API/Local/Browser) with color coding for visibility
- **Commit(s)**: 21d337d
- **Status**: RESOLVED

---

### Duplicate Project Name Prompt During Creation

**Issue**: When adding a new project, the user is prompted to enter the project name twice - first in the dropdown's inline form, then again in the modal form.

- **Location**: `src/ui/wizard/ProjectStep.tsx:69-77`
- **Root Cause**: The `handleAddNew` callback was defined as `async () => { ... }` with no parameters, ignoring the name value passed from `DropdownWithAdd`. The `DropdownWithAdd` component correctly passes the entered value via `onAddNew(newValue.trim())` (line 90), but `ProjectStep` discarded it and reset form state to empty defaults.
- **Fix**: Updated `handleAddNew` to accept the name parameter and pre-populate the modal form:
  ```typescript
  const handleAddNew = useCallback(async (name: string) => {
    setIsModalOpen(true);
    setFormData({
      ...DEFAULT_FORM_STATE,
      name: name,
    });
    // ...
  }, []);
  ```
- **Commit(s)**: 11aae0e
- **Status**: RESOLVED
