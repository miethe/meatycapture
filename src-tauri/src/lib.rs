/**
 * MeatyCapture Library
 *
 * Shared library code for Tauri application.
 * Currently minimal as all logic is in the frontend.
 */

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_shell::init());
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
