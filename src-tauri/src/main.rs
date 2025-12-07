// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/**
 * MeatyCapture Desktop Entry Point
 *
 * Tauri application initialization with filesystem plugin support.
 * The frontend handles all business logic - this is just the desktop shell.
 */

fn main() {
    let mut builder = tauri::Builder::default()
        // Register filesystem plugin for markdown file read/write
        .plugin(tauri_plugin_fs::init());

    // Register shell plugin for desktop platforms only
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_shell::init());
    }

    // Run the application
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
