/**
 * App Root Component
 *
 * Main application shell - will contain:
 * - Wizard flow routing
 * - Admin interface routing
 * - Global state management
 */
import { ToastProvider, ToastContainer, useToast } from './ui/shared';

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const { toasts, dismissToast } = useToast();

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
          {/* Wizard or admin content will go here */}
        </main>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </>
  );
}

export default App;
