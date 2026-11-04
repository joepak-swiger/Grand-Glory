import { createCityStage, getTerrain, type BuildingStyle, type CityStage, type StageBuilding } from '../game/stage';

export const CITY_TILE_SIZE = 32;
export const CITY_SOURCE_TILE_SIZE = 16;
export const CITY_ATLAS_COLUMNS = 37;
export const CITY_ATLAS_ROWS = 28;

export interface CityTileId { readonly column: number; readonly row: number }
export interface CityTileLayer { readonly id: 'pavement' | 'road' | 'sidewalk'; readonly tile?: CityTileId; readonly cells: ReadonlyArray<{ readonly x: number; readonly y: number }> }
export interface CityMapDefinition extends CityStage { readonly layers: ReadonlyArray<CityTileLayer> }

/** Semantic source-art tiles only: pavement, asphalt, and sidewalk. Building roofs are original coherent pixel art. */
export const CITY_TILE_CATALOG = {
  pavement: { column: 0, row: 19 },
  sidewalk: { column: 0, row: 22 },
} as const;

export function buildCityMapDefinition(worldWidth: number, worldHeight: number): CityMapDefinition {
  const stage = createCityStage(worldWidth, worldHeight);
  const pavement: Array<{ x: number; y: number }> = [];
  const road: Array<{ x: number; y: number }> = [];
  const sidewalk: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < stage.rows; y++) for (let x = 0; x < stage.columns; x++) {
    const kind = getTerrain(stage, x, y);
    if (kind === 'road') road.push({ x, y });
    else if (kind === 'sidewalk') sidewalk.push({ x, y });
    else if (kind === 'ground') pavement.push({ x, y });
  }
  return {
    ...stage,
    layers: [
      { id: 'pavement', tile: CITY_TILE_CATALOG.pavement, cells: pavement },
      { id: 'road', cells: road },
      { id: 'sidewalk', tile: CITY_TILE_CATALOG.sidewalk, cells: sidewalk },
    ],
  };
}

export function validateCityMap(map: CityMapDefinition): string[] {
  const errors: string[] = [];
  if (map.columns < 1 || map.rows < 1 || map.terrain.length !== map.columns * map.rows) errors.push('Map must have positive dimensions and one terrain value per cell.');
  for (const layer of map.layers) {
    const tile = layer.tile;
    if (tile && (!Number.isInteger(tile.column) || !Number.isInteger(tile.row) || tile.column < 0 || tile.row < 0 || tile.column >= CITY_ATLAS_COLUMNS || tile.row >= CITY_ATLAS_ROWS)) errors.push(`Layer ${layer.id} uses an invalid atlas tile.`);
    for (const cell of layer.cells) if (cell.x < 0 || cell.y < 0 || cell.x >= map.columns || cell.y >= map.rows) errors.push(`Layer ${layer.id} contains an out-of-bounds cell.`);
  }
  for (const building of map.buildings) if (building.x < 0 || building.y < 0 || building.x + building.width > map.columns || building.y + building.height > map.rows) errors.push(`Building ${building.id} exceeds map bounds.`);
  return errors;
}

const MATERIALS: Record<BuildingStyle, { wall: string; shadow: string; trim: string; roof: string; roofLight: string; roofDark: string; accent: string }> = {
  brick: { wall: '#5a3d3c', shadow: '#26323c', trim: '#c9755f', roof: '#824b46', roofLight: '#aa6658', roofDark: '#643d3b', accent: '#e9ba75' },
  glass: { wall: '#334c5b', shadow: '#26333e', trim: '#91b7ba', roof: '#385d6b', roofLight: '#76a5aa', roofDark: '#243e50', accent: '#d8c993' },
  industrial: { wall: '#474d52', shadow: '#252e35', trim: '#b18a55', roof: '#525e63', roofLight: '#879293', roofDark: '#344148', accent: '#d39852' },
};

export function renderCityMap(atlas: CanvasImageSource, map: CityMapDefinition): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = map.width; canvas.height = map.height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('City canvas rendering is unavailable.');
  context.imageSmoothingEnabled = false;
  const drawTile = (tile: CityTileId, x: number, y: number): void => {
    if (tile.column < 0 || tile.row < 0 || tile.column >= CITY_ATLAS_COLUMNS || tile.row >= CITY_ATLAS_ROWS) throw new Error(`Invalid city atlas tile ${tile.column},${tile.row}`);
    const px = x * CITY_TILE_SIZE; const py = y * CITY_TILE_SIZE;
    context.drawImage(atlas, tile.column * 17, tile.row * 17, CITY_SOURCE_TILE_SIZE, CITY_SOURCE_TILE_SIZE, px, py, Math.min(CITY_TILE_SIZE, canvas.width - px), Math.min(CITY_TILE_SIZE, canvas.height - py));
  };

  // Road atlas pieces contain baked divider marks. The authored connected-road layer uses one clean asphalt material.
  for (const layer of map.layers) {
    if (layer.id === 'road') {
      context.fillStyle = '#303941';
      for (const cell of layer.cells) {
        const x = cell.x * CITY_TILE_SIZE; const y = cell.y * CITY_TILE_SIZE;
        context.fillRect(x, y, Math.min(CITY_TILE_SIZE, canvas.width - x), Math.min(CITY_TILE_SIZE, canvas.height - y));
        if ((cell.x * 7 + cell.y * 3) % 11 === 0) { context.fillStyle = '#374149'; context.fillRect(x + 9, y + 18, 2, 2); context.fillStyle = '#303941'; }
      }
    } else if (layer.tile) for (const cell of layer.cells) drawTile(layer.tile, cell.x, cell.y);
  }
  drawRoadPaint(context, map);
  for (const building of map.buildings) drawBuilding(context, building, map.cellSize);
  drawStreetDetails(context, map);
  return canvas;
}

function drawRoadPaint(context: CanvasRenderingContext2D, map: CityStage): void {
  const size = map.cellSize;
  const center = (start: number, end: number): number => (start + end + 1) * size / 2;
  // Lane lines are laid from typed road segments; perpendicular segment overlaps become junction gaps.
  context.fillStyle = '#dfbd68';
  const horizontal = map.roads.filter(road => road.orientation === 'horizontal');
  const vertical = map.roads.filter(road => road.orientation === 'vertical');
  for (const road of map.roads) {
    for (let along = road.start; along <= road.end; along++) {
      const inJunction = (road.orientation === 'horizontal' ? vertical : horizontal).some(crossing => along >= crossing.crossStart && along <= crossing.crossEnd && crossing.start <= road.crossEnd && crossing.end >= road.crossStart);
      if (inJunction || (along - road.start) % 4 !== 1) continue;
      if (road.orientation === 'horizontal') {
        const lane = center(road.crossStart, road.crossEnd);
        context.fillRect(along * size + 4, lane - 4, size - 8, 2);
        context.fillRect(along * size + 4, lane + 2, size - 8, 2);
      } else {
        const lane = center(road.crossStart, road.crossEnd);
        context.fillRect(lane - 4, along * size + 4, 2, size - 8);
        context.fillRect(lane + 2, along * size + 4, 2, size - 8);
      }
    }
  }

  // Each crosswalk sits on one approach to the junction: two across the east/west street
  // and two across the north/south street. Keep the stripes outside the junction box.
  context.fillStyle = '#eee2c6';
  for (const v of vertical) for (const h of horizontal) {
    const x0 = v.crossStart * size; const x1 = (v.crossEnd + 1) * size;
    const y0 = h.crossStart * size; const y1 = (h.crossEnd + 1) * size;
    if (v.start > h.crossEnd || v.end < h.crossStart || h.start > v.crossEnd || h.end < v.crossStart) continue;
    for (let stripe = 0; stripe < 4; stripe++) {
      const north = y0 - 40 + stripe * 9; const south = y1 + 4 + stripe * 9;
      context.fillRect(x0 + 5, north, x1 - x0 - 10, 4);
      context.fillRect(x0 + 5, south, x1 - x0 - 10, 4);
      const west = x0 - 40 + stripe * 9; const east = x1 + 4 + stripe * 9;
      context.fillRect(west, y0 + 5, 4, y1 - y0 - 10);
      context.fillRect(east, y0 + 5, 4, y1 - y0 - 10);
    }
  }
}

/** Original top-down roof silhouettes: one semantic material per building, with stable edge/corner treatment. */
function drawBuilding(context: CanvasRenderingContext2D, building: StageBuilding, cellSize: number): void {
  const material = MATERIALS[building.style];
  const x = building.x * cellSize; const y = building.y * cellSize;
  const width = building.width * cellSize; const height = building.height * cellSize;
  context.fillStyle = material.shadow; context.fillRect(x + 5, y + 7, Math.max(1, width - 5), Math.max(1, height - 5));
  context.fillStyle = '#17232c'; context.fillRect(x, y, width, height);
  context.fillStyle = material.wall; context.fillRect(x + 3, y + 3, width - 6, height - 6);
  context.fillStyle = material.trim; context.fillRect(x + 5, y + 5, width - 10, 4); context.fillRect(x + 5, y + height - 9, width - 10, 4);
  context.fillRect(x + 5, y + 5, 4, height - 10); context.fillRect(x + width - 9, y + 5, 4, height - 10);
  context.fillStyle = material.roof; context.fillRect(x + 10, y + 10, width - 20, height - 20);
  context.fillStyle = material.roofLight;
  context.fillRect(x + 14, y + 14, width - 28, 3);
  context.fillStyle = material.roofDark;
  if (building.style === 'brick') {
    for (let row = 0; row < Math.floor((height - 28) / 14); row++) {
      const py = y + 24 + row * 14;
      context.fillRect(x + 14, py, width - 28, 1);
      const offset = row % 2 ? 22 : 8;
      for (let px = x + offset; px < x + width - 16; px += 38) context.fillRect(px, py - 7, 1, 7);
    }
    context.fillStyle = material.accent;
    context.fillRect(x + width * 0.44, y + height - 9, width * 0.12, 5);
  } else if (building.style === 'glass') {
    const innerX = x + 18; const innerY = y + 22; const innerWidth = width - 36; const innerHeight = height - 44;
    context.fillStyle = '#263e50'; context.fillRect(innerX, innerY, innerWidth, innerHeight);
    const columns = Math.max(2, Math.floor(innerWidth / 54)); const rows = Math.max(2, Math.floor(innerHeight / 42));
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const panelWidth = (innerWidth - (columns + 1) * 5) / columns;
      const panelHeight = (innerHeight - (rows + 1) * 5) / rows;
      const px = innerX + 5 + column * (panelWidth + 5); const py = innerY + 5 + row * (panelHeight + 5);
      context.fillStyle = (row + column) % 3 === 0 ? '#719ba1' : '#416c79'; context.fillRect(px, py, panelWidth, panelHeight);
      context.fillStyle = '#9fc9c4'; context.fillRect(px + 3, py + 3, Math.max(2, panelWidth * 0.12), panelHeight - 6);
    }
  } else {
    // A restrained industrial roof with repeated parallel seams and a few aligned service units.
    for (let py = y + 23; py < y + height - 12; py += 18) {
      context.fillStyle = material.roofDark; context.fillRect(x + 14, py, width - 28, 2);
      context.fillStyle = material.roofLight; context.fillRect(x + 14, py + 3, width - 28, 1);
    }
    const units: ReadonlyArray<readonly [number, number]> = [[0.22, 0.28], [0.55, 0.28], [0.22, 0.62], [0.55, 0.62]];
    for (const [unitX, unitY] of units) {
      const unitW = Math.min(34, width * 0.22); const unitH = Math.min(22, height * 0.19);
      const ux = x + width * unitX; const uy = y + height * unitY;
      context.fillStyle = '#27353c'; context.fillRect(ux, uy, unitW, unitH);
      context.fillStyle = material.roofLight; context.fillRect(ux + 3, uy + 3, unitW - 6, 3);
      context.fillStyle = material.accent; context.fillRect(ux + 3, uy + unitH - 5, unitW - 6, 2);
    }
  }
  // Raised roof access box; no open door or traversable roof is implied.
  context.fillStyle = material.roofDark; context.fillRect(x + width / 2 - 12, y + 11, 24, 14);
  context.fillStyle = material.roofLight; context.fillRect(x + width / 2 - 8, y + 13, 16, 2);
}

function drawStreetDetails(context: CanvasRenderingContext2D, map: CityStage): void {
  // Deliberately sparse original pixel props sit on sidewalks. They are visual only and never block movement.
  const cell = map.cellSize;
  const lamps = [[10, 13], [30, 13], [44, 18], [22, 29], [44, 32], [10, 35]] as const;
  for (const [cx, cy] of lamps) {
    if (getTerrain(map, cx, cy) !== 'sidewalk') continue;
    const x = cx * cell + 12; const y = cy * cell + 9;
    context.fillStyle = '#243641'; context.fillRect(x + 7, y + 9, 4, 17);
    context.fillStyle = '#9eb5b7'; context.fillRect(x + 4, y + 4, 10, 7);
    context.fillStyle = '#ffd67c'; context.fillRect(x + 7, y + 6, 4, 3);
    context.fillStyle = '#506875'; context.fillRect(x + 3, y + 25, 12, 3);
  }
}
