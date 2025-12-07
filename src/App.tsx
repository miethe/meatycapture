/**
 * App Root Component
 *
 * Main application shell with:
 * - Wizard capture flow
 * - Admin field management interface
 * - Store initialization and view routing
 */
import { useState, useMemo } from 'react';
import { ToastProvider, ToastContainer, useToast } from './ui/shared';
import { WizardFlow } from './ui/wizard';
import { AdminContainer } from './ui/admin';
import { createProjectStore, createFieldCatalogStore } from './adapters/config-local/platform-factory';
import { createDocStore } from './adapters/fs-local/platform-factory';
import { realClock } from './adapters/clock';

type View = 'wizard' | 'admin';

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const { toasts, dismissToast } = useToast();
  const [view, setView] = useState<View>('wizard');
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize stores once using useMemo to prevent recreation on re-renders
  // Wrap in try/catch to gracefully handle browser environment (non-Tauri)
  const stores = useMemo(() => {
    try {
      return {
        projectStore: createProjectStore(),
        fieldCatalogStore: createFieldCatalogStore(),
        docStore: createDocStore(),
        clock: realClock,
      };
    } catch (error) {
      setInitError(error instanceof Error ? error.message : 'Failed to initialize stores');
      return null;
    }
  }, []);

  // Show error UI if initialization failed
  if (initError || !stores) {
    return (
      <>
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <div className="app">
          <header>
            <h1>MeatyCapture</h1>
            <p>Lightweight capture app for request logs</p>
          </header>

          <main id="main-content">
            <div className="error-panel" role="alert" aria-live="polite">
              <h2>Platform Not Supported</h2>
              <p className="error-message">{initError || 'Unable to initialize storage.'}</p>
              <p>MeatyCapture requires the Tauri desktop application for file system access.</p>
              <p>
                Please run the app using <code>pnpm tauri dev</code> instead of <code>pnpm dev</code>.
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      <div className="app">
        <header>
          <h1>MeatyCapture</h1>
          <p>Lightweight capture app for request logs</p>

          <nav aria-label="Main navigation" className="app-nav">
            <button
              type="button"
              onClick={() => setView('wizard')}
              className={`nav-button ${view === 'wizard' ? 'active' : ''}`}
              aria-current={view === 'wizard' ? 'page' : undefined}
              aria-label="Capture items"
            >
              Capture
            </button>
            <button
              type="button"
              onClick={() => setView('admin')}
              className={`nav-button ${view === 'admin' ? 'active' : ''}`}
              aria-current={view === 'admin' ? 'page' : undefined}
              aria-label="Manage field options"
            >
              Admin
            </button>
          </nav>
        </header>

        <main id="main-content">
          {view === 'wizard' ? (
            <WizardFlow
              projectStore={stores.projectStore}
              fieldCatalogStore={stores.fieldCatalogStore}
              docStore={stores.docStore}
              clock={stores.clock}
            />
          ) : (
            <AdminContainer
              projectStore={stores.projectStore}
              fieldCatalogStore={stores.fieldCatalogStore}
            />
          )}
        </main>

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </>
  );
}

export default App;
