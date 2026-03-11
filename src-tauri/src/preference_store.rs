use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetPreferenceProfile {
    pub version: u32,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub opacity: f64,
    pub always_on_top: bool,
    pub collapsed: bool,
    pub allow_simultaneous_display: bool,
    pub startup_mode: String,
    pub updated_at: Option<String>,
}

impl Default for WidgetPreferenceProfile {
    fn default() -> Self {
        Self {
            version: 1,
            x: 20.0,
            y: 20.0,
            width: 248.0,
            height: 146.0,
            opacity: 0.95,
            always_on_top: false,
            collapsed: false,
            allow_simultaneous_display: false,
            startup_mode: "manual".to_string(),
            updated_at: None,
        }
    }
}

fn preference_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("resolve app data dir failed: {error}"))?;
    fs::create_dir_all(&dir).map_err(|error| format!("create app data dir failed: {error}"))?;
    dir.push("widget-preferences.json");
    Ok(dir)
}

pub fn load_preferences(app: &AppHandle) -> Result<WidgetPreferenceProfile, String> {
    let path = preference_path(app)?;
    if !path.exists() {
        return Ok(WidgetPreferenceProfile::default());
    }
    let text = fs::read_to_string(path).map_err(|error| format!("read preferences failed: {error}"))?;
    let parsed = serde_json::from_str::<WidgetPreferenceProfile>(&text)
        .map_err(|error| format!("parse preferences failed: {error}"))?;
    Ok(parsed)
}

pub fn save_preferences(app: &AppHandle, preferences: &WidgetPreferenceProfile) -> Result<(), String> {
    let path = preference_path(app)?;
    let text = serde_json::to_string_pretty(preferences)
        .map_err(|error| format!("serialize preferences failed: {error}"))?;
    fs::write(path, text).map_err(|error| format!("write preferences failed: {error}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::WidgetPreferenceProfile;

    #[test]
    fn default_preferences_are_valid() {
        let prefs = WidgetPreferenceProfile::default();
        assert_eq!(prefs.startup_mode, "manual");
        assert!(prefs.opacity >= 0.4);
        assert_eq!(prefs.version, 1);
    }

    #[test]
    fn preferences_support_json_round_trip() {
        let prefs = WidgetPreferenceProfile {
            startup_mode: "auto".to_string(),
            always_on_top: true,
            allow_simultaneous_display: true,
            ..WidgetPreferenceProfile::default()
        };
        let text = serde_json::to_string(&prefs).expect("serialize preferences");
        let parsed: WidgetPreferenceProfile = serde_json::from_str(&text).expect("deserialize preferences");
        assert_eq!(parsed.startup_mode, "auto");
        assert!(parsed.always_on_top);
        assert!(parsed.allow_simultaneous_display);
    }
}
