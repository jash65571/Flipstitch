import { usePathname } from "expo-router";
import { useLayoutEffect } from "react";
import { Platform } from "react-native";

/**
 * Drops DOM focus when the route changes, on web only.
 *
 * expo-router keeps the previous screen mounted behind the new one and marks
 * it `aria-hidden`. The control the player just activated to navigate — a
 * level tile, "Back to level gallery" — lives on that now-background screen
 * and keeps focus, so Chrome refuses the attribute and logs "Blocked
 * aria-hidden on an element because its descendant retained focus". The
 * screen reader is then left with focus parked inside a subtree the app is
 * trying to hide.
 *
 * Releasing focus at route change lets the hidden subtree actually be hidden,
 * and hands the next Tab back to the top of the new screen. A layout effect
 * runs in the same commit that mounts the new screen, before paint.
 *
 * Native platforms manage screen focus themselves, so this is a no-op there.
 */
export function useReleaseFocusOnNavigate(): void {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      active.blur();
    }
  }, [pathname]);
}
