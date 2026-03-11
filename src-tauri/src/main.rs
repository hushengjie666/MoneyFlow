#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod preference_store;
mod widget_window;

use preference_store::{load_preferences, save_preferences, WidgetPreferenceProfile};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use single_instance::SingleInstance;
use std::time::Duration;
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

const FEEDBACK_PROXY_BASE_URL: &str = "http://94.191.82.58:38127";
const FEEDBACK_PROXY_TOKEN: &str = "duyu346327yd63g343";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FeedbackProxyRequest {
    title: String,
    content: String,
    contact: Option<String>,
    url: Option<String>,
    ua: Option<String>,
    app_version: Option<String>,
    extra: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct FeedbackServiceSuccess {
    ok: bool,
    id: Option<String>,
    filename: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FeedbackServiceFailure {
    ok: bool,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FeedbackProxyResponse {
    ok: bool,
    id: Option<String>,
    filename: Option<String>,
}

fn normalize_optional_trimmed(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn contains_risky_pattern(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    [
        "<script",
        "</script>",
        "javascript:",
        "onerror=",
        "onload=",
        "drop table",
        "union select",
    ]
    .iter()
    .any(|token| lower.contains(token))
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

#[tauri::command]
async fn submit_feedback_proxy(payload: FeedbackProxyRequest) -> Result<FeedbackProxyResponse, String> {
    let content = payload.content.trim().to_string();
    if content.len() < 4 {
        return Err("反馈内容过短，请补充更多细节".to_string());
    }
    if content.len() > 1500 {
        return Err("反馈内容过长，请精简后再提交".to_string());
    }
    if contains_risky_pattern(&content) {
        return Err("反馈内容包含不安全字符，请调整后重试".to_string());
    }
    let title = payload.title.trim().to_string();
    let contact = normalize_optional_trimmed(payload.contact);
    let url = normalize_optional_trimmed(payload.url);
    let ua = normalize_optional_trimmed(payload.ua);
    let app_version = normalize_optional_trimmed(payload.app_version);

    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|error| format!("build http client failed: {error}"))?;

    let endpoint = format!("{}/feedback", FEEDBACK_PROXY_BASE_URL.trim_end_matches('/'));
    let response = client
        .post(endpoint)
        .header("Content-Type", "application/json")
        .header("X-Feedback-Token", FEEDBACK_PROXY_TOKEN)
        .json(&serde_json::json!({
            "title": title,
            "content": content,
            "contact": contact,
            "url": url,
            "ua": ua,
            "appVersion": app_version,
            "extra": payload.extra
        }))
        .send()
        .await
        .map_err(|error| format!("submit feedback request failed: {error}"))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("read feedback response failed: {error}"))?;

    if !status.is_success() {
        if let Ok(failure) = serde_json::from_str::<FeedbackServiceFailure>(&text) {
            let _ = failure.ok;
            return Err(failure.error.unwrap_or_else(|| format!("feedback service status {status}")));
        }
        return Err(format!("feedback service status {status}: {text}"));
    }

    let success = serde_json::from_str::<FeedbackServiceSuccess>(&text)
        .map_err(|error| format!("parse feedback success response failed: {error}"))?;
    if !success.ok {
        return Err("feedback service returned ok=false".to_string());
    }
    Ok(FeedbackProxyResponse {
        ok: true,
        id: success.id,
        filename: success.filename,
    })
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
    let single = SingleInstance::new("moneyflow-desktop-single-instance")
        .expect("failed to create single-instance guard");
    if !single.is_single() {
        return;
    }

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
            start_main_window_dragging,
            submit_feedback_proxy
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
