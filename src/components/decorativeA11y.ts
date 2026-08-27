import { Platform } from "react-native";

/**
 * Accessibility props for a purely decorative SVG mark whose meaning is
 * already carried by a sibling label or the parent's own accessibility props.
 *
 * `accessibilityElementsHidden` is iOS-only. `react-native-svg`'s web
 * renderer spreads unrecognized props straight onto the DOM `<svg>` element,
 * so passing it unconditionally on web leaks an invalid
 * `accessibilityelementshidden` attribute into the DOM. `importantForAccessibility`
 * is Android-only natively but is understood by React Native Web, which maps
 * it to `aria-hidden` correctly — so it is always safe to pass, while
 * `accessibilityElementsHidden` is scoped to native platforms only.
 */
export const decorativeSvgA11yProps = {
  importantForAccessibility: "no-hide-descendants" as const,
  ...(Platform.OS === "web" ? {} : { accessibilityElementsHidden: true })
};
