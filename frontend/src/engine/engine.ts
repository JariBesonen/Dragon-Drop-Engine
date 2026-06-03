import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLLIDABLE_TILE_ID,
  MAP_HEIGHT_TILES,
  MAP_WIDTH_TILES,
  PALETTE,
  PLAYER_SIZE,
  PLAYER_SPEED_TILES_PER_SECOND,
  STORAGE_KEY,
  TILE_SIZE,
} from "./constants";
import type {
  EditorTool,
  EngineCallbacks,
  EngineMode,
  EngineSnapshot,
  SerializedEngineState,
  TileChange,
  TileStrokeChange,
} from "./types";

const EMPTY_TILE = 0;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class PixelEditorEngine {
  private readonly canvas: HTMLCanvasElement;

  private readonly ctx: CanvasRenderingContext2D;

  private readonly callbacks: EngineCallbacks;

  private readonly map: number[];

  private readonly pressedKeys: Set<string>;

  private readonly collidableTileIds: Set<number>;

  private readonly onPointerDownBound: (event: MouseEvent) => void;

  private readonly onPointerMoveBound: (event: MouseEvent) => void;

  private readonly onPointerUpBound: () => void;

  private readonly onContextMenuBound: (event: MouseEvent) => void;

  private readonly onKeyDownBound: (event: KeyboardEvent) => void;

  private readonly onKeyUpBound: (event: KeyboardEvent) => void;

  private animationFrameId: number | null;

  private previousFrameTime: number;

  private pointerDown: boolean;

  private mode: EngineMode;

  private tool: EditorTool;

  private selectedTile: number;

  private playerX: number;

  private playerY: number;

  private undoStack: TileStrokeChange[];

  private redoStack: TileStrokeChange[];

  private currentStrokeChanges: Map<number, TileChange>;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks = {}) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2D canvas context is not available.");
    }
    this.ctx = context;
    this.callbacks = callbacks;

    this.map = new Array(MAP_WIDTH_TILES * MAP_HEIGHT_TILES).fill(EMPTY_TILE);
    this.pressedKeys = new Set<string>();
    this.collidableTileIds = new Set<number>([COLLIDABLE_TILE_ID]);

    this.animationFrameId = null;
    this.previousFrameTime = 0;
    this.pointerDown = false;
    this.mode = "edit";
    this.tool = "paint";
    this.selectedTile = 1;
    this.playerX = MAP_WIDTH_TILES / 2;
    this.playerY = MAP_HEIGHT_TILES / 2;
    this.undoStack = [];
    this.redoStack = [];
    this.currentStrokeChanges = new Map<number, TileChange>();

    this.onPointerDownBound = (event: MouseEvent) => {
      this.onPointerDown(event);
    };
    this.onPointerMoveBound = (event: MouseEvent) => {
      this.onPointerMove(event);
    };
    this.onPointerUpBound = () => {
      this.onPointerUp();
    };
    this.onContextMenuBound = (event: MouseEvent) => {
      event.preventDefault();
    };
    this.onKeyDownBound = (event: KeyboardEvent) => {
      this.onKeyDown(event);
    };
    this.onKeyUpBound = (event: KeyboardEvent) => {
      this.onKeyUp(event);
    };

    this.ctx.imageSmoothingEnabled = false;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
  }

  public start(): void {
    this.canvas.addEventListener("mousedown", this.onPointerDownBound);
    this.canvas.addEventListener("mousemove", this.onPointerMoveBound);
    this.canvas.addEventListener("contextmenu", this.onContextMenuBound);
    window.addEventListener("mouseup", this.onPointerUpBound);
    window.addEventListener("keydown", this.onKeyDownBound);
    window.addEventListener("keyup", this.onKeyUpBound);

    this.previousFrameTime = performance.now();
    this.animationFrameId = window.requestAnimationFrame(
      (timestamp: number) => {
        this.loop(timestamp);
      },
    );
    this.emitSnapshot();
  }

  public destroy(): void {
    this.canvas.removeEventListener("mousedown", this.onPointerDownBound);
    this.canvas.removeEventListener("mousemove", this.onPointerMoveBound);
    this.canvas.removeEventListener("contextmenu", this.onContextMenuBound);
    window.removeEventListener("mouseup", this.onPointerUpBound);
    window.removeEventListener("keydown", this.onKeyDownBound);
    window.removeEventListener("keyup", this.onKeyUpBound);

    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getSnapshot(): EngineSnapshot {
    return {
      mode: this.mode,
      tool: this.tool,
      selectedTile: this.selectedTile,
      collidableTileIds: [...this.collidableTileIds].sort(
        (a: number, b: number) => a - b,
      ),
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      filledTiles: this.map.filter((tileId: number) => tileId !== EMPTY_TILE)
        .length,
      player: {
        x: this.playerX,
        y: this.playerY,
      },
    };
  }

  public getMapData(): readonly number[] {
    return this.map;
  }

  public setMode(nextMode: EngineMode): void {
    this.mode = nextMode;
    this.emitSnapshot();
  }

  public toggleMode(): void {
    this.mode = this.mode === "edit" ? "play" : "edit";
    this.emitSnapshot();
  }

  public setTool(nextTool: EditorTool): void {
    this.tool = nextTool;
    this.emitSnapshot();
  }

  public setSelectedTile(tileId: number): void {
    this.selectedTile = clamp(tileId, 0, PALETTE.length - 1);
    this.emitSnapshot();
  }

  public toggleCollidableTile(tileId: number): void {
    const normalizedTileId = clamp(Math.floor(tileId), 0, PALETTE.length - 1);
    if (normalizedTileId === EMPTY_TILE) {
      return;
    }

    if (this.collidableTileIds.has(normalizedTileId)) {
      this.collidableTileIds.delete(normalizedTileId);
    } else {
      this.collidableTileIds.add(normalizedTileId);
    }
    this.emitSnapshot();
  }

  public undo(): void {
    const stroke = this.undoStack.pop();
    if (!stroke) {
      return;
    }

    stroke.changes.forEach((change: TileChange) => {
      this.map[change.index] = change.previousTile;
    });
    this.redoStack.push(stroke);
    this.emitSnapshot();
  }

  public redo(): void {
    const stroke = this.redoStack.pop();
    if (!stroke) {
      return;
    }

    stroke.changes.forEach((change: TileChange) => {
      this.map[change.index] = change.nextTile;
    });
    this.undoStack.push(stroke);
    this.emitSnapshot();
  }

  public resetMap(): void {
    this.map.fill(EMPTY_TILE);
    this.undoStack = [];
    this.redoStack = [];
    this.playerX = MAP_WIDTH_TILES / 2;
    this.playerY = MAP_HEIGHT_TILES / 2;
    this.emitSnapshot();
  }

  public saveToLocalStorage(): void {
    const payload: SerializedEngineState = {
      map: [...this.map],
      player: {
        x: this.playerX,
        y: this.playerY,
      },
      collidableTileIds: [...this.collidableTileIds],
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  public loadFromLocalStorage(): boolean {
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return false;
    }

    try {
      const parsed = JSON.parse(rawState) as Partial<SerializedEngineState>;
      return this.applySerializedState(parsed);
    } catch {
      return false;
    }
  }

  public exportToJson(): string {
    const payload: SerializedEngineState = {
      map: [...this.map],
      player: {
        x: this.playerX,
        y: this.playerY,
      },
      collidableTileIds: [...this.collidableTileIds],
    };
    return JSON.stringify(payload, null, 2);
  }

  public importFromJson(rawJson: string): boolean {
    try {
      const parsed = JSON.parse(rawJson) as Partial<SerializedEngineState>;
      return this.applySerializedState(parsed);
    } catch {
      return false;
    }
  }

  private loop(timestamp: number): void {
    const deltaSeconds = (timestamp - this.previousFrameTime) / 1000;
    this.previousFrameTime = timestamp;

    this.update(deltaSeconds);
    this.render();

    this.animationFrameId = window.requestAnimationFrame(
      (nextTimestamp: number) => {
        this.loop(nextTimestamp);
      },
    );
  }

  private update(deltaSeconds: number): void {
    if (this.mode !== "play") {
      return;
    }

    let velocityX = 0;
    let velocityY = 0;

    if (this.pressedKeys.has("w")) {
      velocityY -= 1;
    }
    if (this.pressedKeys.has("s")) {
      velocityY += 1;
    }
    if (this.pressedKeys.has("a")) {
      velocityX -= 1;
    }
    if (this.pressedKeys.has("d")) {
      velocityX += 1;
    }

    const speed = PLAYER_SPEED_TILES_PER_SECOND;
    const candidateX = clamp(
      this.playerX + velocityX * speed * deltaSeconds,
      0,
      MAP_WIDTH_TILES - 1,
    );
    const candidateY = clamp(
      this.playerY + velocityY * speed * deltaSeconds,
      0,
      MAP_HEIGHT_TILES - 1,
    );

    if (!this.isBlocked(candidateX, this.playerY)) {
      this.playerX = candidateX;
    }
    if (!this.isBlocked(this.playerX, candidateY)) {
      this.playerY = candidateY;
    }
  }

  private render(): void {
    this.ctx.fillStyle = "#111111";
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let y = 0; y < MAP_HEIGHT_TILES; y += 1) {
      for (let x = 0; x < MAP_WIDTH_TILES; x += 1) {
        const index = y * MAP_WIDTH_TILES + x;
        const tileId = this.map[index];
        const tileColor = PALETTE[tileId] ?? PALETTE[0];
        this.ctx.fillStyle = tileColor;
        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    this.ctx.strokeStyle = "rgba(255,255,255,0.09)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= MAP_WIDTH_TILES; x += 1) {
      const drawX = x * TILE_SIZE + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(drawX, 0);
      this.ctx.lineTo(drawX, CANVAS_HEIGHT);
      this.ctx.stroke();
    }
    for (let y = 0; y <= MAP_HEIGHT_TILES; y += 1) {
      const drawY = y * TILE_SIZE + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, drawY);
      this.ctx.lineTo(CANVAS_WIDTH, drawY);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = "#ffeb3b";
    this.ctx.fillRect(
      this.playerX * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2,
      this.playerY * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2,
      PLAYER_SIZE,
      PLAYER_SIZE,
    );
  }

  private onPointerDown(event: MouseEvent): void {
    if (this.mode !== "edit") {
      return;
    }

    this.pointerDown = true;
    this.currentStrokeChanges.clear();
    this.paintFromPointerEvent(event);
  }

  private onPointerMove(event: MouseEvent): void {
    if (!this.pointerDown || this.mode !== "edit") {
      return;
    }

    this.paintFromPointerEvent(event);
  }

  private onPointerUp(): void {
    this.commitCurrentStroke();
    this.pointerDown = false;
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (event.key === "Tab") {
      event.preventDefault();
      this.toggleMode();
      return;
    }

    if (event.ctrlKey && key === "z" && !event.shiftKey) {
      event.preventDefault();
      this.undo();
      return;
    }

    if (event.ctrlKey && key === "z" && event.shiftKey) {
      event.preventDefault();
      this.redo();
      return;
    }

    this.pressedKeys.add(key);
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.pressedKeys.delete(event.key.toLowerCase());
  }

  private paintFromPointerEvent(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const tileX = Math.floor((offsetX / rect.width) * MAP_WIDTH_TILES);
    const tileY = Math.floor((offsetY / rect.height) * MAP_HEIGHT_TILES);

    if (
      tileX < 0 ||
      tileY < 0 ||
      tileX >= MAP_WIDTH_TILES ||
      tileY >= MAP_HEIGHT_TILES
    ) {
      return;
    }

    const index = tileY * MAP_WIDTH_TILES + tileX;
    const previousTile = this.map[index];
    const shouldErase = this.tool === "erase" || event.button === 2;
    const nextTile = shouldErase ? EMPTY_TILE : this.selectedTile;
    if (previousTile === nextTile) {
      return;
    }

    this.map[index] = nextTile;
    this.currentStrokeChanges.set(index, {
      index,
      previousTile,
      nextTile,
    });
    this.redoStack = [];
    this.emitSnapshot();
  }

  private commitCurrentStroke(): void {
    if (this.currentStrokeChanges.size === 0) {
      return;
    }

    this.undoStack.push({
      changes: [...this.currentStrokeChanges.values()],
    });
    this.currentStrokeChanges.clear();
    this.emitSnapshot();
  }

  private isBlocked(tileX: number, tileY: number): boolean {
    const x = clamp(Math.floor(tileX), 0, MAP_WIDTH_TILES - 1);
    const y = clamp(Math.floor(tileY), 0, MAP_HEIGHT_TILES - 1);
    const tileId = this.map[y * MAP_WIDTH_TILES + x] ?? EMPTY_TILE;
    return this.collidableTileIds.has(tileId);
  }

  private applySerializedState(state: Partial<SerializedEngineState>): boolean {
    if (!Array.isArray(state.map) || state.map.length !== this.map.length) {
      return false;
    }
    if (
      !state.player ||
      typeof state.player.x !== "number" ||
      typeof state.player.y !== "number"
    ) {
      return false;
    }

    state.map.forEach((value: number, index: number) => {
      this.map[index] = clamp(Math.floor(value), 0, PALETTE.length - 1);
    });

    this.collidableTileIds.clear();
    if (Array.isArray(state.collidableTileIds)) {
      state.collidableTileIds.forEach((tileId: number) => {
        const normalizedTileId = clamp(
          Math.floor(tileId),
          0,
          PALETTE.length - 1,
        );
        if (normalizedTileId !== EMPTY_TILE) {
          this.collidableTileIds.add(normalizedTileId);
        }
      });
    }
    if (this.collidableTileIds.size === 0) {
      this.collidableTileIds.add(COLLIDABLE_TILE_ID);
    }

    this.playerX = clamp(state.player.x, 0, MAP_WIDTH_TILES - 1);
    this.playerY = clamp(state.player.y, 0, MAP_HEIGHT_TILES - 1);
    this.undoStack = [];
    this.redoStack = [];
    this.currentStrokeChanges.clear();
    this.emitSnapshot();
    return true;
  }

  private emitSnapshot(): void {
    this.callbacks.onSnapshotChange?.(this.getSnapshot());
  }
}
