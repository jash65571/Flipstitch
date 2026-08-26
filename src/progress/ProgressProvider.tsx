import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { levels } from "@/game/levels";
import {
  emptyProgress,
  isLevelUnlocked,
  readProgress,
  recordCompletion,
  recordLevelStart,
  resumeLevelId,
  unlockedLevelCount,
  type ProgressData
} from "@/progress/model";

const STORAGE_KEY = "flipstitch.progress.v1";

type ProgressContextValue = {
  data: ProgressData;
  loading: boolean;
  storageWarning: string | null;
  unlockedCount: number;
  resumeId: string;
  isUnlocked: (levelId: string) => boolean;
  startLevel: (levelId: string) => void;
  completeLevel: (levelId: string, moves: number) => void;
  resetProgress: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ProgressData>(emptyProgress);
  const [loading, setLoading] = useState(true);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (mounted) setData(readProgress(raw, levels));
      })
      .catch(() => {
        if (mounted) setStorageWarning("Progress could not be loaded. You can still play this session.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback((change: (current: ProgressData) => ProgressData) => {
    setData((current) => {
      const next = change(current);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
        setStorageWarning("Progress is active, but could not be saved on this device.");
      });
      return next;
    });
  }, []);

  const startLevel = useCallback((levelId: string) => update((current) => recordLevelStart(current, levelId)), [update]);
  const completeLevel = useCallback(
    (levelId: string, moves: number) => update((current) => recordCompletion(current, levelId, moves)),
    [update]
  );
  const resetProgress = useCallback(() => {
    setData(emptyProgress);
    void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {
      setStorageWarning("Progress reset, but the saved copy could not be removed on this device.");
    });
  }, []);

  const value = useMemo<ProgressContextValue>(() => ({
    data,
    loading,
    storageWarning,
    unlockedCount: unlockedLevelCount(data, levels),
    resumeId: resumeLevelId(data, levels),
    isUnlocked: (levelId) => isLevelUnlocked(data, levels, levelId),
    startLevel,
    completeLevel,
    resetProgress
  }), [completeLevel, data, loading, resetProgress, startLevel, storageWarning]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used inside ProgressProvider.");
  return value;
}
