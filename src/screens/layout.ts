import { space } from "../theme/tokens.ts";

export type GameLayout = {
  boardSize: number;
  compact: boolean;
  horizontal: boolean;
  pagePadding: number;
  phoneLandscape: boolean;
};

export function getGameLayout(width: number, height: number, fontScale: number): GameLayout {
  const phoneLandscape = width > height && height < 600 && width < 900;
  const horizontal = width >= 900 && width > height;
  const compact = height < 720 || fontScale > 1.2;
  const pagePadding = width < 380 ? space.md : width >= 700 ? space.xl : space.lg;
  const portraitBoardSize = Math.min(
    width - pagePadding * 2,
    height * (compact ? 0.42 : 0.49),
    width >= 700 ? 520 : 460
  );
  const horizontalBoardSize = Math.min(height - pagePadding * 2 - 92, width * 0.54, 500);

  return {
    boardSize: Math.max(260, horizontal ? horizontalBoardSize : portraitBoardSize),
    compact,
    horizontal,
    pagePadding,
    phoneLandscape
  };
}
