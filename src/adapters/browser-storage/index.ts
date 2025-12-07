/**
 * Browser Storage Adapters
 *
 * Browser-based implementations of storage ports for web environments.
 * These adapters enable MeatyCapture to work in browsers without filesystem access.
 *
 * Storage strategy:
 * - Projects and field catalogs: localStorage (simple key-value config)
 * - Documents: IndexedDB (complex queryable data with indexes)
 *
 * @module adapters/browser-storage
 */

export {
  BrowserProjectStore,
  BrowserFieldCatalogStore,
  createBrowserProjectStore,
  createBrowserFieldCatalogStore,
} from './ls-config-stores';

export { BrowserDocStore, createBrowserDocStore } from './idb-doc-store';
