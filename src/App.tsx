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

  // Initialize stores once using useMemo to prevent recreation on re-renders
  const projectStore = useMemo(() => createProjectStore(), []);
  const fieldCatalogStore = useMemo(() => createFieldCatalogStore(), []);
  const docStore = useMemo(() => createDocStore(), []);
  const clock = useMemo(() => realClock, []);

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
              projectStore={projectStore}
              fieldCatalogStore={fieldCatalogStore}
              docStore={docStore}
              clock={clock}
            />
          ) : (
            <AdminContainer
              projectStore={projectStore}
              fieldCatalogStore={fieldCatalogStore}
            />
          )}
        </main>

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </>
  );
}

export default App;
