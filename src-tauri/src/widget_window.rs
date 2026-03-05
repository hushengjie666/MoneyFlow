use crate::preference_store::load_preferences;
use tauri::AppHandle;
use tauri::Manager;
use tauri::PhysicalPosition;
use tauri::PhysicalSize;
use tauri::WindowEvent;
use tauri::WebviewUrl;
use tauri::WebviewWindow;
use tauri::WebviewWindowBuilder;

pub const WIDGET_LABEL: &str = "widget";
const MAIN_LABEL: &str = "main";

fn should_show_widget_when_main_hidden(startup_mode: &str, allow_simultaneous_display: bool) -> bool {
    startup_mode == "auto" || allow_simultaneous_display
}

fn get_widget_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(WIDGET_LABEL)
        .ok_or_else(|| "widget window not initialized".to_string())
}

fn sync_main_taskbar_with_visibility(app: &AppHandle) {
    let Some(main_window) = app.get_webview_window(MAIN_LABEL) else {
        return;
    };
    let visible = main_window.is_visible().unwrap_or(false);
    let minimized = main_window.is_minimized().unwrap_or(false);
    let show_taskbar = visible && !minimized;
    let _ = main_window.set_skip_taskbar(!show_taskbar);
}

pub fn hide_main_window_to_tray(app: &AppHandle) -> Result<(), String> {
    let main_window = app
        .get_webview_window(MAIN_LABEL)
        .ok_or_else(|| "main window not initialized".to_string())?;
    let _ = main_window.unminimize();
    main_window.hide().map_err(|error| error.to_string())?;
    sync_main_taskbar_with_visibility(app);
    Ok(())
}

pub fn minimize_main_window(app: &AppHandle) -> Result<(), String> {
    let main_window = app
        .get_webview_window(MAIN_LABEL)
        .ok_or_else(|| "main window not initialized".to_string())?;
    main_window.minimize().map_err(|error| error.to_string())
}

pub fn toggle_main_window_maximized(app: &AppHandle) -> Result<(), String> {
    let main_window = app
        .get_webview_window(MAIN_LABEL)
        .ok_or_else(|| "main window not initialized".to_string())?;
    let maximized = main_window.is_maximized().unwrap_or(false);
    if maximized {
        main_window.unmaximize().map_err(|error| error.to_string())?;
    } else {
        main_window.maximize().map_err(|error| error.to_string())?;
    }
    Ok(())
}

pub fn ensure_widget_window(app: &AppHandle) -> Result<(), String> {
    if app.get_webview_window(WIDGET_LABEL).is_some() {
        return Ok(());
    }

    WebviewWindowBuilder::new(app, WIDGET_LABEL, WebviewUrl::App("widget.html".into()))
        .title("MoneyFlow Widget")
        .decorations(false)
        .resizable(false)
        .skip_taskbar(true)
        .transparent(true)
        .shadow(false)
        .always_on_top(false)
        .visible(false)
        .inner_size(296.0, 156.0)
        .build()
        .map_err(|error| format!("create widget window failed: {error}"))?;

    Ok(())
}

pub fn show_widget_window(app: &AppHandle) -> Result<(), String> {
    show_widget_window_passive(app)?;
    let window = get_widget_window(app)?;
    let _ = window.set_focus();
    Ok(())
}

pub fn show_widget_window_passive(app: &AppHandle) -> Result<(), String> {
    let window = get_widget_window(app)?;
    let _ = window.set_skip_taskbar(true);
    let _ = window.unminimize();
    window.show().map_err(|error| error.to_string())?;
    sync_main_taskbar_with_visibility(app);
    Ok(())
}

pub fn hide_widget_window(app: &AppHandle) -> Result<(), String> {
    let window = get_widget_window(app)?;
    window.hide().map_err(|error| error.to_string())?;
    sync_main_taskbar_with_visibility(app);
    Ok(())
}

pub fn open_main_window(app: &AppHandle) -> Result<(), String> {
    let main_window = app
        .get_webview_window(MAIN_LABEL)
        .ok_or_else(|| "main window not initialized".to_string())?;
    let _ = main_window.unminimize();
    main_window.show().map_err(|error| error.to_string())?;
    let _ = main_window.set_focus();
    sync_main_taskbar_with_visibility(app);
    let preferences = load_preferences(app).unwrap_or_default();
    if preferences.allow_simultaneous_display {
        let _ = show_widget_window_passive(app);
    } else {
        let _ = hide_widget_window(app);
    }
    Ok(())
}

pub fn bind_widget_auto_toggle(app: &AppHandle) -> Result<(), String> {
    let main_window = app
        .get_webview_window(MAIN_LABEL)
        .ok_or_else(|| "main window not initialized".to_string())?;
    let app_handle = app.clone();

    main_window.on_window_event(move |event| {
        let Some(main_window) = app_handle.get_webview_window(MAIN_LABEL) else {
            return;
        };
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = hide_main_window_to_tray(&app_handle);
            let preferences = load_preferences(&app_handle).unwrap_or_default();
            if should_show_widget_when_main_hidden(
                &preferences.startup_mode,
                preferences.allow_simultaneous_display,
            ) {
                let _ = show_widget_window(&app_handle);
            } else {
                let _ = hide_widget_window(&app_handle);
            }
            return;
        }
        let minimized = main_window.is_minimized().unwrap_or(false);
        let visible = main_window.is_visible().unwrap_or(true);
        let preferences = load_preferences(&app_handle).unwrap_or_default();
        let show_widget_on_tray = should_show_widget_when_main_hidden(
            &preferences.startup_mode,
            preferences.allow_simultaneous_display,
        );
        if minimized {
            let _ = hide_main_window_to_tray(&app_handle);
            if show_widget_on_tray {
                let _ = show_widget_window(&app_handle);
            } else {
                let _ = hide_widget_window(&app_handle);
            }
            return;
        }
        if !visible {
            if show_widget_on_tray {
                let _ = show_widget_window(&app_handle);
            } else {
                let _ = hide_widget_window(&app_handle);
            }
        } else {
            if preferences.allow_simultaneous_display {
                let _ = show_widget_window_passive(&app_handle);
            } else {
                let _ = hide_widget_window(&app_handle);
            }
        }
    });

    Ok(())
}

pub fn set_widget_topmost(app: &AppHandle, value: bool) -> Result<(), String> {
    let window = get_widget_window(app)?;
    window
        .set_always_on_top(value)
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn set_widget_collapsed(app: &AppHandle, value: bool) -> Result<(), String> {
    let window = get_widget_window(app)?;
    let (width, height) = collapsed_window_size(value);
    window
        .set_size(PhysicalSize::new(width, height))
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn start_widget_dragging(app: &AppHandle) -> Result<(), String> {
    let window = get_widget_window(app)?;
    window.start_dragging().map_err(|error| error.to_string())
}

pub fn restore_widget_position_if_needed(app: &AppHandle, x: f64, y: f64) -> Result<(), String> {
    let window = get_widget_window(app)?;
    let (safe_x, safe_y) = normalized_position(x, y);
    window
        .set_position(PhysicalPosition::new(safe_x, safe_y))
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn read_widget_window_position(app: &AppHandle) -> Result<(f64, f64), String> {
    let window = get_widget_window(app)?;
    let position = window.outer_position().map_err(|error| error.to_string())?;
    Ok((position.x as f64, position.y as f64))
}

pub fn normalized_position(x: f64, y: f64) -> (f64, f64) {
    let safe_x = if x.is_finite() && x >= 0.0 { x } else { 20.0 };
    let safe_y = if y.is_finite() && y >= 0.0 { y } else { 20.0 };
    (safe_x, safe_y)
}

pub fn collapsed_window_size(collapsed: bool) -> (f64, f64) {
    if collapsed {
        (296.0, 64.0)
    } else {
        (296.0, 156.0)
    }
}

#[cfg(test)]
mod tests {
    use super::{collapsed_window_size, normalized_position};

    #[test]
    fn keeps_positive_position() {
        let (x, y) = normalized_position(120.0, 88.0);
        assert_eq!(x, 120.0);
        assert_eq!(y, 88.0);
    }

    #[test]
    fn falls_back_to_safe_position_for_invalid_values() {
        let (x, y) = normalized_position(-1.0, f64::NAN);
        assert_eq!(x, 20.0);
        assert_eq!(y, 20.0);
    }

    #[test]
    fn maps_collapsed_window_size() {
        let expanded = collapsed_window_size(false);
        let collapsed = collapsed_window_size(true);
        assert_eq!(expanded, (296.0, 156.0));
        assert_eq!(collapsed, (296.0, 64.0));
    }
}
