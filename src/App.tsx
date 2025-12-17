/**
 * App Root Component
 *
 * Main application shell with:
 * - Wizard capture flow
 * - Viewer catalog interface
 * - Admin field management interface
 * - Store initialization and view routing
 */
import { useState, useMemo } from 'react';
import { Pencil2Icon, EyeOpenIcon, GearIcon, PersonIcon } from '@radix-ui/react-icons';
import { ToastProvider, ToastContainer, useToast, useNavigationShortcuts } from './ui/shared';
import { WizardFlow } from './ui/wizard';
import { AdminContainer } from './ui/admin';
import { ViewerContainer } from './ui/viewer';
import { createProjectStore, createFieldCatalogStore } from './adapters/config-local/platform-factory';
import { createDocStore } from './adapters/fs-local/platform-factory';
import { realClock } from './adapters/clock';

type View = 'wizard' | 'viewer' | 'admin';

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

// Store types for initialization
interface Stores {
  projectStore: ReturnType<typeof createProjectStore>;
  fieldCatalogStore: ReturnType<typeof createFieldCatalogStore>;
  docStore: ReturnType<typeof createDocStore>;
  clock: typeof realClock;
}

type StoreResult = { stores: Stores; error: null } | { stores: null; error: string };

// Initialize stores outside component to avoid React render issues
function initializeStores(): StoreResult {
  try {
    return {
      stores: {
        projectStore: createProjectStore(),
        fieldCatalogStore: createFieldCatalogStore(),
        docStore: createDocStore(),
        clock: realClock,
      },
      error: null,
    };
  } catch (error) {
    return {
      stores: null,
      error: error instanceof Error ? error.message : 'Failed to initialize stores',
    };
  }
}

function AppContent() {
  const { toasts, dismissToast } = useToast();
  const [view, setView] = useState<View>('wizard');

  // Enable keyboard shortcuts for navigation
  useNavigationShortcuts({ onNavigate: setView });

  // Initialize stores once using useMemo to prevent recreation on re-renders
  // Error handling is done in initializeStores to avoid setState during render
  const { stores, error: initError } = useMemo(() => initializeStores(), []);

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
              <h2>Initialization Error</h2>
              <p className="error-message">{initError || 'Unable to initialize storage.'}</p>
              <p>
                Please check the browser console for more details, or try refreshing the page.
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
          <div className="header-brand">
            <h1>MeatyCapture</h1>
            <p>Lightweight capture app for request logs</p>
          </div>

          <nav aria-label="Main navigation" className="app-nav">
            <button
              type="button"
              onClick={() => setView('wizard')}
              className={`nav-button ${view === 'wizard' ? 'active' : ''}`}
              aria-current={view === 'wizard' ? 'page' : undefined}
              aria-label="Capture items"
            >
              <Pencil2Icon className="nav-icon" aria-hidden="true" />
              <span>Capture</span>
            </button>
            <button
              type="button"
              onClick={() => setView('viewer')}
              className={`nav-button ${view === 'viewer' ? 'active' : ''}`}
              aria-current={view === 'viewer' ? 'page' : undefined}
              aria-label="Navigate to Viewer"
            >
              <EyeOpenIcon className="nav-icon" aria-hidden="true" />
              <span>Viewer</span>
            </button>
            <button
              type="button"
              onClick={() => setView('admin')}
              className={`nav-button ${view === 'admin' ? 'active' : ''}`}
              aria-current={view === 'admin' ? 'page' : undefined}
              aria-label="Manage field options"
            >
              <GearIcon className="nav-icon" aria-hidden="true" />
              <span>Admin</span>
            </button>
          </nav>

          <div className="header-profile">
            <button
              type="button"
              className="profile-button"
              aria-label="User profile"
              title="User Profile"
            >
              <PersonIcon aria-hidden="true" />
            </button>
          </div>
        </header>

        <main id="main-content">
          {view === 'wizard' ? (
            <WizardFlow
              projectStore={stores.projectStore}
              fieldCatalogStore={stores.fieldCatalogStore}
              docStore={stores.docStore}
              clock={stores.clock}
            />
          ) : view === 'viewer' ? (
            <ViewerContainer
              projectStore={stores.projectStore}
              docStore={stores.docStore}
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
