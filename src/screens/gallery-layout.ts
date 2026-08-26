export type GalleryLayout = {
  contentWidth: number;
  columns: 1 | 2 | 3;
  cardWidthPercent: "100%" | "48.6%" | "31.8%";
};

export function getGalleryLayout(viewportWidth: number, fontScale: number): GalleryLayout {
  const contentWidth = Math.min(viewportWidth - (viewportWidth < 380 ? 28 : 40), 920);
  const columns = fontScale > 1.25 ? 1 : contentWidth >= 760 ? 3 : contentWidth >= 500 ? 2 : 1;
  return {
    contentWidth,
    columns,
    cardWidthPercent: columns === 1 ? "100%" : columns === 2 ? "48.6%" : "31.8%"
  };
}
