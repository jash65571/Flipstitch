/**
 * The Living Sampler palette.
 *
 * A dyed-fabric-and-ink language, not a flat card system. Warm paper grounds
 * every surface; deep indigo ink carries text; the two threads are a brick
 * vermilion (front) and a deep indigo (back). Brass/ochre and muted sage are
 * the accent metals and dyes. Front and back are never distinguished by hue
 * alone — the front thread reads solid, the back thread reads dashed, and both
 * carry a written side label.
 *
 * The historical key names (linen, coral, iris, ink) are kept so the whole app
 * re-skins from one file; canonical Living-Sampler aliases are exported below.
 * Every colour used behind text or on a control is covered by contrast.test.ts.
 */
export const colors = {
  // Warm paper ground.
  linen: "#F4ECDD",
  linenDeep: "#E7DAC4",
  linenShadow: "#D3C1A4",
  cloth: "#FFFDF8",
  clothShade: "#F1E7D5",

  // Dark blue-black ink for text.
  ink: "#1C2333",
  inkSoft: "#54586A",

  // Front thread — brick / vermilion.
  coral: "#C0442E",
  coralSoft: "#F1D8CE",
  coralDeep: "#97301D",

  // Back thread — deep indigo.
  iris: "#38477F",
  irisSoft: "#D8DDEE",
  irisDeep: "#232E5C",

  // Brass / ochre metals.
  gold: "#F4B942",
  goldDeep: "#8A5E14",

  // Muted sage dye and slate-teal accent.
  teal: "#2F9C95",
  tealDeep: "#1F6F6B",

  // Wooden hoop.
  woodLight: "#D5A16B",
  wood: "#A86E42",
  woodDark: "#6C402A",

  white: "#FFFFFF",
  danger: "#B23A46"
} as const;

/**
 * Canonical Living-Sampler names. Prefer these in new code; they alias the
 * historical keys above so both refer to the same value.
 */
export const palette = {
  paper: colors.linen,
  paperDeep: colors.linenDeep,
  paperShadow: colors.linenShadow,
  inkBlue: colors.ink,
  inkBlueSoft: colors.inkSoft,
  vermilion: colors.coral,
  vermilionSoft: colors.coralSoft,
  vermilionDeep: colors.coralDeep,
  indigo: colors.iris,
  indigoSoft: colors.irisSoft,
  indigoDeep: colors.irisDeep,
  ochre: "#C58A2E",
  brass: "#B07A22",
  brassDeep: colors.goldDeep,
  sage: "#6F7E5C",
  sageDeep: "#556247"
} as const;

/** Per-side thread identity. Colour is one cue; shape/label are the others. */
export const thread = {
  front: { core: colors.coral, deep: colors.coralDeep, soft: colors.coralSoft },
  back: { core: colors.iris, deep: colors.irisDeep, soft: colors.irisSoft }
} as const;

export const type = {
  // Fraunces — editorial display for collection and level titles.
  brand: "Fraunces_700Bold",
  brandHeavy: "Fraunces_800ExtraBold",
  brandSemi: "Fraunces_600SemiBold",
  // Atkinson Hyperlegible Next — controls and small interface text.
  body: "AtkinsonHyperlegibleNext_400Regular",
  bodyMedium: "AtkinsonHyperlegibleNext_500Medium",
  bodySemibold: "AtkinsonHyperlegibleNext_600SemiBold",
  bodyBold: "AtkinsonHyperlegibleNext_700Bold"
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
