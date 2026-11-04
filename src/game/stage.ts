import type { Vec } from './simulation';

export const STAGE_CELL_SIZE = 32;
const NAVIGATION_CLEARANCE = 40;
export type TerrainKind = 'ground' | 'road' | 'sidewalk' | 'building';
export type BuildingStyle = 'brick' | 'glass' | 'industrial';
export interface RoadSegment {
  readonly id: string;
  readonly orientation: 'horizontal' | 'vertical';
  readonly start: number;
  readonly end: number;
  readonly crossStart: number;
  readonly crossEnd: number;
}

export interface StageBuilding {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly style: BuildingStyle;
}

export interface CityStage {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly terrain: Uint8Array;
  readonly buildings: readonly StageBuilding[];
  readonly roads: readonly RoadSegment[];
}

const TERRAIN: Record<TerrainKind, number> = { ground: 0, road: 1, sidewalk: 2, building: 3 };
const terrainKind = (value: number): TerrainKind => value === 1 ? 'road' : value === 2 ? 'sidewalk' : value === 3 ? 'building' : 'ground';

/**
 * Shared source of truth for the rendered city blocks, walkable cells, spawns,
 * collision, and enemy navigation. All placement is aligned to the 32px map grid.
 */
export function createCityStage(width: number, height: number): CityStage {
  const columns = Math.ceil(width / STAGE_CELL_SIZE);
  const rows = Math.ceil(height / STAGE_CELL_SIZE);
  const terrain = new Uint8Array(columns * rows).fill(TERRAIN.ground);
  const at = (x: number, y: number): number => y * columns + x;
  const roads: readonly RoadSegment[] = [
    { id: 'main-boulevard', orientation: 'horizontal', start: 0, end: columns - 1, crossStart: 14, crossEnd: 21 },
    { id: 'south-avenue', orientation: 'horizontal', start: 0, end: columns - 1, crossStart: 30, crossEnd: 34 },
    { id: 'west-avenue', orientation: 'vertical', start: 0, end: rows - 1, crossStart: 16, crossEnd: 20 },
    { id: 'east-avenue', orientation: 'vertical', start: 0, end: rows - 1, crossStart: 39, crossEnd: 43 },
  ];
  for (const road of roads) for (let along = road.start; along <= road.end; along++) for (let cross = road.crossStart; cross <= road.crossEnd; cross++) {
    const x = road.orientation === 'horizontal' ? along : cross;
    const y = road.orientation === 'horizontal' ? cross : along;
    if (x >= 0 && y >= 0 && x < columns && y < rows) terrain[at(x, y)] = TERRAIN.road;
  }

  const templates: readonly StageBuilding[] = [
    { id: 'brick-market', x: 2, y: 3, width: 12, height: 9, style: 'brick' },
    { id: 'glass-office', x: 23, y: 3, width: 14, height: 9, style: 'glass' },
    { id: 'industrial-depot', x: 46, y: 3, width: 8, height: 9, style: 'industrial' },
    { id: 'glass-corner', x: 2, y: 24, width: 12, height: 5, style: 'glass' },
    { id: 'brick-corner', x: 23, y: 24, width: 14, height: 5, style: 'brick' },
    { id: 'industrial-garage', x: 46, y: 24, width: 8, height: 5, style: 'industrial' },
  ];
  const definitions: readonly StageBuilding[] = templates.filter(building => building.x < columns && building.y < rows).map(building => ({
    ...building,
    width: Math.min(building.width, columns - building.x),
    height: Math.min(building.height, rows - building.y),
  }));

  // A one-cell sidewalk border follows the road graph except inside building footprints.
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    if (terrain[at(x, y)] === TERRAIN.road) continue;
    const touchesRoad = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx!; const ny = y + dy!;
      return nx >= 0 && ny >= 0 && nx < columns && ny < rows && terrain[at(nx, ny)] === TERRAIN.road;
    });
    if (touchesRoad) terrain[at(x, y)] = TERRAIN.sidewalk;
  }
  for (const building of definitions) {
    for (let y = building.y; y < building.y + building.height; y++) for (let x = building.x; x < building.x + building.width; x++) {
      terrain[at(x, y)] = TERRAIN.building;
    }
  }
  return { width, height, cellSize: STAGE_CELL_SIZE, columns, rows, terrain, buildings: definitions, roads };
}

export function getTerrain(stage: CityStage, column: number, row: number): TerrainKind | 'outside' {
  if (column < 0 || row < 0 || column >= stage.columns || row >= stage.rows) return 'outside';
  return terrainKind(stage.terrain[row * stage.columns + column]!);
}

export function isWalkable(stage: CityStage, x: number, y: number, radius = 0): boolean {
  if (x < radius || y < radius || x > stage.width - radius || y > stage.height - radius) return false;
  for (const building of stage.buildings) if (circleIntersectsRect(x, y, radius, building)) return false;
  return true;
}

export function nearestWalkablePoint(stage: CityStage, x: number, y: number, radius = 0): Vec {
  if (isWalkable(stage, x, y, radius)) return { x, y };
  let best = { x: stage.width / 2, y: stage.height / 2 }; let bestDistance = Number.POSITIVE_INFINITY;
  for (let row = 0; row < stage.rows; row++) for (let column = 0; column < stage.columns; column++) {
    if (stage.terrain[row * stage.columns + column] === TERRAIN.building) continue;
    const candidate = { x: clamp((column + 0.5) * stage.cellSize, radius, stage.width - radius), y: clamp((row + 0.5) * stage.cellSize, radius, stage.height - radius) };
    if (!isWalkable(stage, candidate.x, candidate.y, radius)) continue;
    const distance = (candidate.x - x) ** 2 + (candidate.y - y) ** 2;
    if (distance < bestDistance) { best = candidate; bestDistance = distance; }
  }
  return best;
}

function circleIntersectsRect(x: number, y: number, radius: number, rect: Pick<StageBuilding, 'x' | 'y' | 'width' | 'height'> & { cellSize?: number }): boolean {
  const size = rect.cellSize ?? STAGE_CELL_SIZE;
  const left = rect.x * size; const top = rect.y * size;
  const right = left + rect.width * size; const bottom = top + rect.height * size;
  const nearestX = Math.max(left, Math.min(right, x));
  const nearestY = Math.max(top, Math.min(bottom, y));
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 < radius ** 2;
}

/** Resolve movement in bounded steps and axis-separated passes to prevent dash tunneling and permit wall sliding. */
export function moveOnStage(stage: CityStage, from: Vec, delta: Vec, radius: number, maxStep = 6): Vec {
  const distance = Math.hypot(delta.x, delta.y);
  const steps = Math.max(1, Math.ceil(distance / maxStep));
  const stepX = delta.x / steps; const stepY = delta.y / steps;
  let x = from.x; let y = from.y;
  for (let step = 0; step < steps; step++) {
    const candidateX = clamp(x + stepX, radius, stage.width - radius);
    if (isWalkable(stage, candidateX, y, radius)) x = candidateX;
    const candidateY = clamp(y + stepY, radius, stage.height - radius);
    if (isWalkable(stage, x, candidateY, radius)) y = candidateY;
  }
  return { x, y };
}

/** Segment/rectangle broad collision used by projectiles and line-of-sight checks. */
export function segmentHitsBuilding(stage: CityStage, from: Vec, to: Vec, padding = 0): boolean {
  for (const building of stage.buildings) {
    const left = building.x * stage.cellSize - padding; const top = building.y * stage.cellSize - padding;
    const right = (building.x + building.width) * stage.cellSize + padding; const bottom = (building.y + building.height) * stage.cellSize + padding;
    const dx = to.x - from.x; const dy = to.y - from.y;
    let tMin = 0; let tMax = 1;
    for (const [origin, direction, min, max] of [[from.x, dx, left, right], [from.y, dy, top, bottom]] as const) {
      if (Math.abs(direction) < 1e-8) { if (origin < min || origin > max) { tMin = 2; break; } continue; }
      const inv = 1 / direction; let t1 = (min - origin) * inv; let t2 = (max - origin) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1); tMax = Math.min(tMax, t2);
      if (tMin > tMax) break;
    }
    if (tMin <= tMax && tMax >= 0 && tMin <= 1) return true;
  }
  return false;
}

export interface NavigationField { readonly goalCell: number; readonly directionX: Int8Array; readonly directionY: Int8Array }

/** One breadth-first flow field shared by every enemy; rebuilt only when Blue Pinwheel enters a new tile. */
export function buildNavigationField(stage: CityStage, targetX: number, targetY: number): NavigationField {
  const count = stage.columns * stage.rows;
  const directionX = new Int8Array(count); const directionY = new Int8Array(count);
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);
  const target = nearestWalkableCell(stage, Math.floor(targetX / stage.cellSize), Math.floor(targetY / stage.cellSize));
  if (target < 0) return { goalCell: -1, directionX, directionY };
  let head = 0; let tail = 0; queue[tail++] = target; visited[target] = 1;
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  while (head < tail) {
    const cell = queue[head++]!; const x = cell % stage.columns; const y = Math.floor(cell / stage.columns);
    for (const [dx, dy] of steps) {
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= stage.columns || ny >= stage.rows) continue;
      const next = ny * stage.columns + nx;
      if (visited[next] || !isWalkable(stage, (nx + 0.5) * stage.cellSize, (ny + 0.5) * stage.cellSize, NAVIGATION_CLEARANCE)) continue;
      visited[next] = 1; directionX[next] = -dx; directionY[next] = -dy; queue[tail++] = next;
    }
  }
  return { goalCell: target, directionX, directionY };
}

export function navigationDirection(stage: CityStage, field: NavigationField, x: number, y: number): Vec {
  const cell = nearestWalkableCell(stage, Math.floor(x / stage.cellSize), Math.floor(y / stage.cellSize));
  if (cell < 0 || field.goalCell < 0) return { x: 0, y: 0 };
  return { x: field.directionX[cell]!, y: field.directionY[cell]! };
}

function nearestWalkableCell(stage: CityStage, column: number, row: number): number {
  if (column >= 0 && row >= 0 && column < stage.columns && row < stage.rows && isWalkable(stage, (column + 0.5) * stage.cellSize, (row + 0.5) * stage.cellSize, NAVIGATION_CLEARANCE)) return row * stage.columns + column;
  for (let radius = 1; radius < Math.max(stage.columns, stage.rows); radius++) {
    for (let y = Math.max(0, row - radius); y <= Math.min(stage.rows - 1, row + radius); y++) for (let x = Math.max(0, column - radius); x <= Math.min(stage.columns - 1, column + radius); x++) {
      if (Math.abs(x - column) !== radius && Math.abs(y - row) !== radius) continue;
      const cell = y * stage.columns + x; if (isWalkable(stage, (x + 0.5) * stage.cellSize, (y + 0.5) * stage.cellSize, NAVIGATION_CLEARANCE)) return cell;
    }
  }
  return -1;
}

function clamp(value: number, low: number, high: number): number { return Math.max(low, Math.min(high, value)); }
