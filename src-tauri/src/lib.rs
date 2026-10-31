use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct BackendChild(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(BackendChild(Mutex::new(None)))
        .setup(|app| {
            // Find backend python venv or fallback to python3
            let app_handle = app.handle();
            let mut backend_dir = std::env::current_dir().unwrap_or_default();
            if !backend_dir.join("backend").exists() {
                // If running from src-tauri
                if let Some(parent) = backend_dir.parent() {
                    backend_dir = parent.to_path_buf();
                }
            }

            let python_bin = backend_dir.join("backend/.venv/bin/python3");
            let python_cmd = if python_bin.exists() {
                python_bin.to_string_lossy().to_string()
            } else {
                "python3".to_string()
            };

            println!("🚀 Launching FRIDAY Backend sidecar via {}", python_cmd);
            match Command::new(&python_cmd)
                .args(["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8765"])
                .current_dir(backend_dir.join("backend"))
                .spawn()
            {
                Ok(child) => {
                    let state = app_handle.state::<BackendChild>();
                    *state.0.lock().unwrap() = Some(child);
                    println!("✅ FRIDAY Backend sidecar spawned successfully.");
                }
                Err(e) => {
                    eprintln!("⚠️ Failed to spawn backend sidecar automatically: {}", e);
                    eprintln!("💡 You can start it manually with: 'cd backend && uvicorn app.main:app --port 8765'");
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<BackendChild>();
                if let Ok(mut lock) = state.0.lock() {
                    if let Some(mut child) = lock.take() {
                        println!("🛑 Terminating FRIDAY Backend sidecar child process...");
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running FRIDAY application");
}

