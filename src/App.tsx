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
    <div className="app">
      <h1>MeatyCapture</h1>
      <p>Lightweight capture app for request logs</p>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
