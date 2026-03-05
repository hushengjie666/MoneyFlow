#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod preference_store;
mod widget_window;

use preference_store::{load_preferences, save_preferences, WidgetPreferenceProfile};
use serde::Serialize;
use tauri::image::Image;
use tauri::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::AppHandle;
use tauri::Manager;
use widget_window::{
    bind_widget_auto_toggle, ensure_widget_window, hide_widget_window as hide_widget_window_impl,
    hide_main_window_to_tray as hide_main_window_to_tray_impl,
    minimize_main_window as minimize_main_window_impl,
    open_main_window as open_main_window_impl, read_widget_window_position,
    restore_widget_position_if_needed,
    show_widget_window_passive as show_widget_window_passive_impl,
    start_widget_dragging as start_widget_dragging_impl,
    set_widget_collapsed as set_widget_collapsed_impl, set_widget_topmost as set_widget_topmost_impl,
    show_widget_window as show_widget_window_impl,
    toggle_main_window_maximized as toggle_main_window_maximized_impl,
};

#[derive(Debug, Serialize)]
struct CommandResponse {
    ok: bool,
}

#[tauri::command]
fn get_widget_preferences(app: AppHandle) -> Result<WidgetPreferenceProfile, String> {
    load_preferences(&app)
}

#[tauri::command]
fn save_widget_preferences(app: AppHandle, preferences: WidgetPreferenceProfile) -> Result<CommandResponse, String> {
    save_preferences(&app, &preferences)?;
    let _ = restore_widget_position_if_needed(&app, preferences.x, preferences.y);
    if preferences.allow_simultaneous_display {
        let _ = show_widget_window_passive_impl(&app);
    }
    Ok(CommandResponse { ok: true })
}

#[tauri::command]
fn show_widget_window(app: AppHandle) -> Result<CommandResponse, String> {
    show_widget_window_impl(&app)?;
    Ok(CommandResponse { ok: true })
}

#[tauri::command]
fn hide_widget_window(app: AppHandle) -> Result<CommandResponse, String> {
    hide_widget_window_impl(&app)?;
    Ok(CommandResponse { ok: true })
}

#[tauri::command]
fn open_main_window(app: AppHandle) -> Result<CommandResponse, String> {
    open_main_window_impl(&app)?;
    Ok(CommandResponse { ok: true })
}

#[tauri::command]
fn set_widget_topmost(app: AppHandle, value: bool) -> Result<CommandResponse, String> {
    set_widget_topmost_impl(&app, value)?;
    Ok(CommandResponse { ok: true })
}

#[tauri::command]
fn set_widget_collapsed(app: AppHandle, value: bool) -> Result<CommandResponse, String> {
    set_widget_collapsed_impl(&app, value)?;
    Ok(CommandResponse { ok: true })
}

#[tauri::command]
fn start_widget_dragging(app: AppHandle) -> Result<CommandResponse, String> {
    start_widget_dragging_impl(&app)?;
    Ok(CommandResponse { ok: true })
}

#[tauri::command]
fn save_widget_window_position(app: AppHandle) -> Result<CommandResponse, String> {
    let (x, y) = read_widget_window_position(&app)?;
    let mut preferences = load_preferences(&app).unwrap_or_default();
    preferences.x = x;
    preferences.y = y;
    save_preferences(&app, &preferences)?;
    Ok(CommandResponse { ok: true })
}

#[tauri::command]
fn minimize_main_window(app: AppHandle) -> Result<CommandResponse, String> {
    minimize_main_window_impl(&app)?;
    Ok(CommandResponse { ok: true })
}

#[tauri::command]
fn toggle_main_window_maximized(app: AppHandle) -> Result<CommandResponse, String> {
    toggle_main_window_maximized_impl(&app)?;
    Ok(CommandResponse { ok: true })
}

#[tauri::command]
fn close_main_window_to_tray(app: AppHandle) -> Result<CommandResponse, String> {
    hide_main_window_to_tray_impl(&app)?;
    let preferences = load_preferences(&app).unwrap_or_default();
    if preferences.startup_mode == "auto" || preferences.allow_simultaneous_display {
        let _ = show_widget_window_impl(&app);
    } else {
        let _ = hide_widget_window_impl(&app);
    }
    Ok(CommandResponse { ok: true })
}

#[tauri::command]
fn start_main_window_dragging(app: AppHandle) -> Result<CommandResponse, String> {
    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not initialized".to_string())?;
    main_window.start_dragging().map_err(|error| error.to_string())?;
    Ok(CommandResponse { ok: true })
}

fn handle_tray_action(app: &AppHandle, action_id: &str) {
    match action_id {
        "show_main" => {
            let _ = open_main_window_impl(app);
        }
        "show_widget" => {
            let _ = show_widget_window_impl(app);
        }
        "quit_app" => {
            app.exit(0);
        }
        _ => {}
    }
}

fn setup_system_tray(app: &tauri::App) -> Result<(), String> {
    let show_main = MenuItem::with_id(app, "show_main", "打开主界面", true, None::<&str>)
        .map_err(|error| error.to_string())?;
    let show_widget = MenuItem::with_id(app, "show_widget", "显示悬浮窗", true, None::<&str>)
        .map_err(|error| error.to_string())?;
    let separator = PredefinedMenuItem::separator(app).map_err(|error| error.to_string())?;
    let quit = MenuItem::with_id(app, "quit_app", "退出", true, None::<&str>)
        .map_err(|error| error.to_string())?;
    let menu = Menu::with_items(app, &[&show_main, &show_widget, &separator, &quit])
        .map_err(|error| error.to_string())?;

    let tray_icon =
        Image::from_bytes(include_bytes!("../icons/tray-icon.png")).map_err(|error| error.to_string())?;

    TrayIconBuilder::with_id("moneyflow-tray")
        .icon(tray_icon)
        .tooltip("MoneyFlow 资金助手")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app: &AppHandle, event: MenuEvent| {
            handle_tray_action(app, event.id().as_ref());
        })
        .on_tray_icon_event(|tray: &TrayIcon, event: TrayIconEvent| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = open_main_window_impl(tray.app_handle());
            }
        })
        .build(app)
        .map_err(|error| format!("setup tray failed: {error}"))?;

    Ok(())
}

fn apply_app_icons(app: &tauri::App) -> Result<(), String> {
    let main_icon = Image::from_bytes(include_bytes!("../icons/app-icon.png"))
        .map_err(|error| error.to_string())?;
    let widget_icon = Image::from_bytes(include_bytes!("../icons/app-icon.png"))
        .map_err(|error| error.to_string())?;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_icon(main_icon);
    }
    if let Some(window) = app.get_webview_window(widget_window::WIDGET_LABEL) {
        let _ = window.set_icon(widget_icon);
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            ensure_widget_window(&app.handle())?;
            apply_app_icons(app)?;
            setup_system_tray(app)?;
            bind_widget_auto_toggle(&app.handle())?;
            let prefs = load_preferences(&app.handle()).unwrap_or_default();
            let _ = restore_widget_position_if_needed(&app.handle(), prefs.x, prefs.y);
            let _ = set_widget_topmost_impl(&app.handle(), prefs.always_on_top);
            let _ = set_widget_collapsed_impl(&app.handle(), prefs.collapsed);
            if prefs.startup_mode == "auto" {
                let _ = show_widget_window_impl(&app.handle());
            } else if let Some(window) = app.get_webview_window(widget_window::WIDGET_LABEL) {
                let _ = window.hide();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_widget_preferences,
            save_widget_preferences,
            show_widget_window,
            hide_widget_window,
            open_main_window,
            set_widget_topmost,
            set_widget_collapsed,
            start_widget_dragging,
            save_widget_window_position,
            minimize_main_window,
            toggle_main_window_maximized,
            close_main_window_to_tray,
            start_main_window_dragging
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
