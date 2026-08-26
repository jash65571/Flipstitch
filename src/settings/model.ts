/**
 * Pure, versioned settings model.
 *
 * Persisted settings cover sound effects and haptics. Reduced motion is not
 * stored here: it always follows the system setting (AccessibilityInfo), which
 * is the accessible default and the documented product rule.
 */

export const SETTINGS_VERSION = 1;

export type SettingsState = {
  version: typeof SETTINGS_VERSION;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
};

export function emptySettings(): SettingsState {
  return { version: SETTINGS_VERSION, soundEnabled: true, hapticsEnabled: true };
}

export function readSettings(raw: string | null): SettingsState {
  if (!raw) return emptySettings();
  try {
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    if (parsed.version !== SETTINGS_VERSION) return emptySettings();
    return {
      version: SETTINGS_VERSION,
      soundEnabled: parsed.soundEnabled !== false,
      hapticsEnabled: parsed.hapticsEnabled !== false
    };
  } catch {
    return emptySettings();
  }
}

export function setSoundEnabled(state: SettingsState, enabled: boolean): SettingsState {
  return { ...state, soundEnabled: enabled };
}

export function setHapticsEnabled(state: SettingsState, enabled: boolean): SettingsState {
  return { ...state, hapticsEnabled: enabled };
}
