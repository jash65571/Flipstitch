import { Platform } from "react-native";

export const colors = {
  linen: "#F6F1E8",
  linenDeep: "#EAE0D1",
  cloth: "#FFFDF8",
  ink: "#20212A",
  inkSoft: "#69666A",
  coral: "#E85D75",
  coralSoft: "#F8D7DD",
  gold: "#F4B942",
  teal: "#2F9C95",
  iris: "#5968E8",
  irisSoft: "#DDE1FB",
  wood: "#A76F45",
  woodDark: "#74472F",
  white: "#FFFFFF",
  danger: "#C54F5E"
} as const;

export const type = {
  brand: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium", default: "system-ui" }),
  body: Platform.select({ ios: "Avenir Next", android: "sans-serif", default: "system-ui" })
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 28,
  pill: 999
} as const;
