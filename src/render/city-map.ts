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
  // A consistent upper-left light source and lower/right extrusion communicate height.
  // Shadow is cosmetic only; the collision footprint remains the authored building rectangle.
  context.fillStyle = 'rgba(9, 16, 24, 0.5)'; context.fillRect(x + 9, y + 11, width - 1, height - 1);
  context.fillStyle = material.shadow; context.fillRect(x + 5, y + 7, width - 5, height - 7);
  context.fillStyle = material.wall; context.fillRect(x + 2, y + 3, width - 7, height - 9);
  // The south and east faces sit below the roofline, with a hard pixel edge rather than blur.
  context.fillStyle = material.roofDark; context.fillRect(x + 3, y + height - 15, width - 8, 7);
  context.fillStyle = material.trim; context.fillRect(x + 3, y + 3, width - 8, 3); context.fillRect(x + width - 7, y + 5, 3, height - 13);
  context.fillStyle = '#17232c'; context.fillRect(x, y, width - 7, height - 14);
  context.fillStyle = material.roofDark; context.fillRect(x + 3, y + 3, width - 13, height - 20);
  context.fillStyle = material.roof; context.fillRect(x + 6, y + 6, width - 19, height - 27);
  // Parapet is one continuous frame with bright north/west and shaded south/east edges.
  context.fillStyle = material.roofLight; context.fillRect(x + 4, y + 3, width - 15, 3); context.fillRect(x + 4, y + 3, 3, height - 20);
  context.fillStyle = material.roofDark; context.fillRect(x + 6, y + height - 21, width - 19, 2); context.fillRect(x + width - 16, y + 6, 2, height - 27);
  if (building.style === 'brick') {
    // Short, staggered brick courses are restricted to the exposed south facade band.
    context.fillStyle = '#704440'; context.fillRect(x + 5, y + height - 18, width - 13, 4);
    for (let row = 0; row < 2; row++) {
      const py = y + height - 17 + row * 5;
      context.fillStyle = row ? '#9a5c50' : '#bd715e'; context.fillRect(x + 7, py, width - 17, 1);
      for (let px = x + (row ? 17 : 29); px < x + width - 14; px += 26) context.fillRect(px, py - 2, 1, 2);
    }
    // Two paired storefront windows, aligned on the same street-facing wall.
    context.fillStyle = '#293b49'; context.fillRect(x + width * 0.2, y + height - 14, width * 0.16, 8); context.fillRect(x + width * 0.64, y + height - 14, width * 0.16, 8);
    context.fillStyle = '#94c4c5'; context.fillRect(x + width * 0.2 + 2, y + height - 12, width * 0.16 - 4, 4); context.fillRect(x + width * 0.64 + 2, y + height - 12, width * 0.16 - 4, 4);
    context.fillStyle = material.roofDark; context.fillRect(x + width / 2 - 7, y + height - 15, 14, 9);
    context.fillStyle = material.accent;
    context.fillRect(x + width / 2 - 4, y + height - 13, 8, 6);
    context.fillStyle = '#f0d8a3'; context.fillRect(x + width / 2 - 2, y + height - 12, 4, 3);
    drawRoofUnit(context, x + width * 0.28, y + height * 0.31, 36, 25, material);
    drawRoofUnit(context, x + width * 0.62, y + height * 0.56, 30, 21, material);
  } else if (building.style === 'glass') {
    const innerX = x + 14; const innerY = y + 14; const innerWidth = width - 29; const innerHeight = height - 37;
    context.fillStyle = '#263e50'; context.fillRect(innerX, innerY, innerWidth, innerHeight);
    context.fillStyle = '#7eaeb5'; context.fillRect(innerX + 2, innerY + 2, innerWidth - 4, 2);
    const columns = Math.max(2, Math.floor(innerWidth / 54)); const rows = Math.max(2, Math.floor(innerHeight / 42));
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const panelWidth = (innerWidth - (columns + 1) * 5) / columns;
      const panelHeight = (innerHeight - (rows + 1) * 5) / rows;
      const px = innerX + 5 + column * (panelWidth + 5); const py = innerY + 5 + row * (panelHeight + 5);
      context.fillStyle = (row + column) % 3 === 0 ? '#719ba1' : '#416c79'; context.fillRect(px, py, panelWidth, panelHeight);
      context.fillStyle = '#9fc9c4'; context.fillRect(px + 3, py + 3, Math.max(2, panelWidth * 0.12), panelHeight - 6);
    }
    // Street-facing glass entry, aligned to the lower facade rather than scattered over the roof.
    context.fillStyle = '#203744'; context.fillRect(x + width / 2 - 10, y + height - 13, 20, 8);
    context.fillStyle = '#86c8d0'; context.fillRect(x + width / 2 - 7, y + height - 11, 6, 5); context.fillRect(x + width / 2 + 1, y + height - 11, 6, 5);
    drawRoofUnit(context, x + width * 0.23, y + height * 0.22, 40, 28, material);
    drawRoofUnit(context, x + width * 0.61, y + height * 0.55, 34, 25, material);
  } else {
    // Industrial roofing uses broad, aligned seams and service equipment in two tidy rows.
    for (let py = y + 13; py < y + height - 20; py += 17) {
      context.fillStyle = material.roofDark; context.fillRect(x + 14, py, width - 28, 2);
      context.fillStyle = material.roofLight; context.fillRect(x + 14, py + 3, width - 28, 1);
    }
    const units: ReadonlyArray<readonly [number, number]> = [[0.2, 0.26], [0.58, 0.26], [0.2, 0.57], [0.58, 0.57]];
    for (const [unitX, unitY] of units) {
      const unitW = Math.min(34, width * 0.22); const unitH = Math.min(22, height * 0.19);
      const ux = x + width * unitX; const uy = y + height * unitY;
      context.fillStyle = '#27353c'; context.fillRect(ux, uy, unitW, unitH);
      context.fillStyle = material.roofLight; context.fillRect(ux + 3, uy + 3, unitW - 6, 3);
      context.fillStyle = material.accent; context.fillRect(ux + 3, uy + unitH - 5, unitW - 6, 2);
    }
  }
  // Rooftop hatch and low parapet shadows complete the raised-roof read.
  context.fillStyle = material.roofDark; context.fillRect(x + width * 0.44, y + 9, 25, 17);
  context.fillStyle = material.roofLight; context.fillRect(x + width * 0.44 + 3, y + 11, 19, 2);
  context.fillStyle = material.accent; context.fillRect(x + width * 0.44 + 4, y + 14, 2, 8);
}

function drawRoofUnit(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, material: typeof MATERIALS.brick): void {
  const unitWidth = Math.min(width, 42); const unitHeight = Math.min(height, 28);
  context.fillStyle = '#1d2931'; context.fillRect(x + 2, y + 3, unitWidth, unitHeight);
  context.fillStyle = material.wall; context.fillRect(x, y, unitWidth, unitHeight);
  context.fillStyle = material.roofLight; context.fillRect(x + 2, y + 2, unitWidth - 4, 3);
  context.fillStyle = material.roofDark; context.fillRect(x + 4, y + 7, unitWidth - 8, 2);
  context.fillStyle = material.accent; context.fillRect(x + 5, y + unitHeight - 5, unitWidth - 10, 2);
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
  // Utility covers and patched cracks are deterministic and road-only; they never alter walkability.
  for (let cy = 0; cy < map.rows; cy++) for (let cx = 0; cx < map.columns; cx++) {
    if (getTerrain(map, cx, cy) !== 'road') continue;
    const mark = (cx * 31 + cy * 17 + cx * cy * 3) % 29;
    const x = cx * cell; const y = cy * cell;
    if (mark === 3) {
      context.fillStyle = '#222c32'; context.fillRect(x + 10, y + 10, 12, 12);
      context.fillStyle = '#758087'; context.fillRect(x + 12, y + 12, 8, 8);
      context.fillStyle = '#3e494e'; context.fillRect(x + 14, y + 14, 4, 4);
    } else if (mark === 8 || mark === 19) {
      context.fillStyle = '#252e34'; context.fillRect(x + (mark === 8 ? 4 : 22), y + 21, 6, 2);
      context.fillStyle = '#596166'; context.fillRect(x + (mark === 8 ? 5 : 23), y + 22, 4, 1);
    }
  }

  // Authored sidewalk objects are intentionally decorative and nonblocking, away from street-center combat lanes.
  const hydrants = [[17, 12], [39, 12], [17, 33], [39, 33]] as const;
  for (const [cx, cy] of hydrants) {
    if (getTerrain(map, cx, cy) !== 'sidewalk') continue;
    const x = cx * cell + 14; const y = cy * cell + 11;
    context.fillStyle = '#24313a'; context.fillRect(x + 1, y + 14, 12, 3);
    context.fillStyle = '#ba4b45'; context.fillRect(x + 5, y + 4, 5, 10);
    context.fillStyle = '#df7160'; context.fillRect(x + 4, y + 6, 7, 3); context.fillRect(x + 6, y + 2, 3, 3);
    context.fillStyle = '#8d3939'; context.fillRect(x + 4, y + 13, 7, 2);
  }

  // Five authored curbside pieces establish neighborhood scale; all remain visual-only.
  const props: ReadonlyArray<readonly [number, number, 'planter' | 'bin']> = [
    [9, 12, 'planter'], [29, 12, 'bin'], [45, 12, 'planter'], [21, 33, 'bin'], [45, 35, 'planter'],
  ];
  for (const [cx, cy, kind] of props) {
    if (getTerrain(map, cx, cy) !== 'sidewalk') continue;
    const x = cx * cell + 5; const y = cy * cell + 8;
    if (kind === 'planter') {
      context.fillStyle = '#25343b'; context.fillRect(x, y + 15, 25, 4);
      context.fillStyle = '#7a6252'; context.fillRect(x + 1, y + 7, 22, 9);
      context.fillStyle = '#b18a5d'; context.fillRect(x + 1, y + 7, 22, 2);
      context.fillStyle = '#476d58'; context.fillRect(x + 4, y + 3, 16, 7);
      context.fillStyle = '#6f9a6d'; context.fillRect(x + 8, y + 1, 8, 5);
    } else {
      context.fillStyle = '#26323a'; context.fillRect(x + 3, y + 5, 18, 17);
      context.fillStyle = '#54636a'; context.fillRect(x + 2, y + 3, 20, 4);
      context.fillStyle = '#819094'; context.fillRect(x + 5, y + 9, 14, 2);
      context.fillStyle = '#17232c'; context.fillRect(x + 6, y + 18, 3, 3); context.fillRect(x + 16, y + 18, 3, 3);
    }
  }
}
