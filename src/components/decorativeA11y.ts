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

/**
 * Accessibility props for a subtree that must be fully removed from the
 * accessibility tree *and* from the focus order — a dimmed board sitting
 * behind a completion card, for example.
 *
 * `importantForAccessibility: "no-hide-descendants"` alone is not enough on
 * web: React Native Web maps it to `aria-hidden`, but the descendants stay
 * focusable, so if one of them already holds focus Chrome refuses to apply
 * the attribute and logs "Blocked aria-hidden on an element because its
 * descendant retained focus". `inert` is the attribute the WAI-ARIA spec
 * points to for exactly this case: it hides the subtree from assistive
 * technology, removes it from the tab order, and blurs anything inside it
 * that currently has focus. React Native Web forwards `inert` to the DOM.
 */
export function hiddenSubtreeA11yProps(hidden: boolean) {
  if (Platform.OS === "web") {
    return { inert: hidden } as const;
  }
  return {
    accessibilityElementsHidden: hidden,
    importantForAccessibility: hidden ? ("no-hide-descendants" as const) : ("auto" as const)
  };
}
