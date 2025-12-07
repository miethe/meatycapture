/// <reference types="vite/client" />

/**
 * Vite environment variable types
 * Extends the default ImportMetaEnv with our custom env vars
 */
interface ImportMetaEnv {
  readonly VITE_LOG_LEVEL?: string;
  // Add other VITE_ prefixed env vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
