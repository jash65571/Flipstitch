import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  emptySettings,
  readSettings,
  setHapticsEnabled,
  setSoundEnabled,
  type SettingsState
} from "@/settings/model";

const SETTINGS_STORAGE_KEY = "flipstitch.settings.v1";

type SettingsContextValue = {
  settings: SettingsState;
  loaded: boolean;
  updateSound: (enabled: boolean) => void;
  updateHaptics: (enabled: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(emptySettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      .then((raw) => {
        if (mounted) setSettings(readSettings(raw));
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback((next: SettingsState) => {
    setSettings(next);
    void AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const updateSound = useCallback((enabled: boolean) => persist(setSoundEnabled(settings, enabled)), [persist, settings]);
  const updateHaptics = useCallback((enabled: boolean) => persist(setHapticsEnabled(settings, enabled)), [persist, settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loaded, updateSound, updateHaptics }),
    [loaded, settings, updateHaptics, updateSound]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider.");
  return value;
}
