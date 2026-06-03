export const TILE_SIZE = 16;
export const MAP_WIDTH_TILES = 40;
export const MAP_HEIGHT_TILES = 25;
export const CANVAS_WIDTH = MAP_WIDTH_TILES * TILE_SIZE;
export const CANVAS_HEIGHT = MAP_HEIGHT_TILES * TILE_SIZE;
export const PLAYER_SIZE = 12;
export const PLAYER_SPEED_TILES_PER_SECOND = 5;
export const COLLIDABLE_TILE_ID = 1;

export const STORAGE_KEY = "hive.create.map.v1";

export const PALETTE = [
  "#1b1b1b",
  "#5ecb4f",
  "#2f7fc9",
  "#d9ab42",
  "#8f5ad5",
  "#d9534f",
  "#40c7c0",
  "#f2f2f2",
] as const;
