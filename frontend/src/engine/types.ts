export type EditorTool = "paint" | "erase";

export type EngineMode = "edit" | "play";

export interface PlayerState {
  x: number;
  y: number;
}

export interface TileChange {
  index: number;
  previousTile: number;
  nextTile: number;
}

export interface TileStrokeChange {
  changes: TileChange[];
}

export interface EngineSnapshot {
  mode: EngineMode;
  tool: EditorTool;
  selectedTile: number;
  collidableTileIds: number[];
  canUndo: boolean;
  canRedo: boolean;
  filledTiles: number;
  player: PlayerState;
}

export interface SerializedEngineState {
  map: number[];
  player: PlayerState;
  collidableTileIds?: number[];
}

export interface EngineCallbacks {
  onSnapshotChange?: (snapshot: EngineSnapshot) => void;
}
