/**
 * Type stubs for Tauri packages
 *
 * These stubs allow TypeScript to compile without the actual Tauri packages installed.
 * The actual implementations are only available in Tauri desktop builds.
 */

declare module '@tauri-apps/plugin-fs' {
  export function readTextFile(path: string): Promise<string>;
  export function writeTextFile(path: string, content: string): Promise<void>;
  export function readDir(path: string): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>>;
  export function exists(path: string): Promise<boolean>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function copyFile(source: string, destination: string): Promise<void>;
}

declare module '@tauri-apps/api/path' {
  export function join(...paths: string[]): Promise<string>;
  export function dirname(path: string): Promise<string>;
  export function homeDir(): Promise<string>;
}
