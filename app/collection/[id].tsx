import { Redirect, useLocalSearchParams } from "expo-router";

import { getCollection } from "@/content/catalog";
import { getCollectionUnlockState } from "@/content/navigation";
import { useProgress } from "@/progress/ProgressProvider";
import { LevelSelectScreen } from "@/screens/LevelSelectScreen";

export default function CollectionRoute() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const collection = collectionId ? getCollection(collectionId) : undefined;
  const { data, loading } = useProgress();

  // An unknown collection id fails safely back to the library rather than
  // rendering an empty or broken journey.
  if (!collectionId || !collection) {
    return <Redirect href="/" />;
  }

  if (!loading) {
    const isCompleted = (levelId: string) => Boolean(data.completed[levelId]);
    const unlock = getCollectionUnlockState(collection, isCompleted);
    // A locked collection cannot be reached by typing or deep-linking its
    // route directly — progression still gates it even off the library UI.
    if (!unlock.unlocked) {
      return <Redirect href="/" />;
    }
  }

  return <LevelSelectScreen collectionId={collectionId} />;
}
