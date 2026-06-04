pub mod scraper;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            scraper::scrape_movieffm_home,
            scraper::search_movieffm_query,
            scraper::get_movieffm_iframe,
            scraper::fetch_tmdb_html
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
