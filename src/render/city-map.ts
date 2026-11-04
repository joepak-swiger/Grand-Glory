/**
 * A small data-driven tilemap for the GRAND GLORY prototype city.
 * Source tile coordinates use the Kenney 16px grid with a one-pixel gutter.
 * The source atlas is CC0; geometry, composition, and road paint are original.
 */
export const CITY_TILE_SIZE = 32;
export const CITY_SOURCE_TILE_SIZE = 16;
export const CITY_ATLAS_COLUMNS = 37;
export const CITY_ATLAS_ROWS = 28;

export interface CityTileId { readonly column: number; readonly row: number }
export interface CityTileLayer { readonly id: string; readonly tile: CityTileId; readonly cells: ReadonlyArray<{ readonly x: number; readonly y: number }> }
export interface CityBuilding { readonly x: number; readonly y: number; readonly columns: number; readonly rows: number; readonly style: 'brick' | 'glass' | 'stone' }
export interface CityMapDefinition {
  readonly columns: number;
  readonly rows: number;
  readonly layers: ReadonlyArray<CityTileLayer>;
  readonly buildings: ReadonlyArray<CityBuilding>;
}

const inRect = (x: number, y: number, left: number, top: number, width: number, height: number): boolean =>
  x >= left && x < left + width && y >= top && y < top + height;

/** Compose tile placement once as layer data; it is never regenerated per frame. */
export function buildCityMapDefinition(worldWidth: number, worldHeight: number): CityMapDefinition {
  const columns = Math.ceil(worldWidth / CITY_TILE_SIZE);
  const rows = Math.ceil(worldHeight / CITY_TILE_SIZE);
  const all: Array<{ x: number; y: number }> = [];
  const concrete: Array<{ x: number; y: number }> = [];
  const asphalt: Array<{ x: number; y: number }> = [];
  const sidewalk: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    all.push({ x, y });
    const horizontalStreet = inRect(x, y, 0, 14, columns, 8) || inRect(x, y, 0, 30, columns, 5);
    const verticalStreet = inRect(x, y, 16, 0, 5, rows) || inRect(x, y, 39, 0, 5, rows);
    if (horizontalStreet || verticalStreet) asphalt.push({ x, y });
    else concrete.push({ x, y });
    if ((y === 13 || y === 22 || y === 29 || y === 35 || x === 15 || x === 21 || x === 38 || x === 44) && !horizontalStreet && !verticalStreet) sidewalk.push({ x, y });
  }

  const buildings: CityBuilding[] = [];
  const blocks = [
    [2, 2, 7, 7, 'brick'], [8, 4, 6, 8, 'glass'], [23, 2, 7, 7, 'stone'], [31, 4, 6, 8, 'brick'], [47, 2, 8, 7, 'glass'],
    [2, 24, 7, 5, 'glass'], [8, 24, 6, 5, 'brick'], [23, 24, 7, 5, 'brick'], [31, 24, 6, 5, 'stone'], [47, 24, 8, 5, 'brick'],
  ] as const;
  for (const [x, y, w, h, style] of blocks) if (x < columns && y < rows) buildings.push({ x, y, columns: Math.min(w, columns - x), rows: Math.min(h, rows - y), style });

  // Parking pockets and a couple of narrow walkable alleys keep blocks from reading as one repeated wall.
  const clearings = [{ x: 4, y: 10, columns: 4, rows: 2 }, { x: 33, y: 10, columns: 4, rows: 2 }, { x: 24, y: 36, columns: 5, rows: 2 }];
  for (const { x, y, columns: w, rows: h } of clearings) {
    const clearing = all.filter(cell => inRect(cell.x, cell.y, x, y, w, h));
    concrete.push(...clearing);
  }

  return {
    columns, rows,
    layers: [
      { id: 'pavement', tile: { column: 2, row: 24 }, cells: all },
      { id: 'concrete', tile: { column: 0, row: 19 }, cells: concrete },
      { id: 'asphalt', tile: { column: 10, row: 19 }, cells: asphalt },
      { id: 'sidewalk', tile: { column: 0, row: 22 }, cells: sidewalk },
      { id: 'lane-markings', tile: { column: 13, row: 19 }, cells: all.filter(cell => (cell.y === 17 || cell.y === 32) && cell.x % 4 === 1) },
    ],
    buildings,
  };
}

export function validateCityMap(map: CityMapDefinition): string[] {
  const errors: string[] = [];
  if (map.columns < 1 || map.rows < 1) errors.push('Map must have positive dimensions.');
  for (const layer of map.layers) {
    const { column, row } = layer.tile;
    if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || row < 0 || column >= CITY_ATLAS_COLUMNS || row >= CITY_ATLAS_ROWS) errors.push(`Layer ${layer.id} uses an invalid atlas tile.`);
    for (const cell of layer.cells) if (cell.x < 0 || cell.y < 0 || cell.x >= map.columns || cell.y >= map.rows) errors.push(`Layer ${layer.id} contains an out-of-bounds cell.`);
  }
  for (const building of map.buildings) if (building.x < 0 || building.y < 0 || building.x + building.columns > map.columns || building.y + building.rows > map.rows) errors.push('Building exceeds map bounds.');
  return errors;
}

const buildingTiles = {
  brick: [{ column: 1, row: 4 }, { column: 2, row: 4 }, { column: 3, row: 4 }, { column: 1, row: 5 }, { column: 2, row: 5 }, { column: 3, row: 5 }],
  glass: [{ column: 11, row: 5 }, { column: 12, row: 5 }, { column: 13, row: 5 }, { column: 11, row: 6 }, { column: 12, row: 6 }, { column: 13, row: 6 }],
  stone: [{ column: 5, row: 4 }, { column: 6, row: 4 }, { column: 7, row: 4 }, { column: 5, row: 5 }, { column: 6, row: 5 }, { column: 7, row: 5 }],
} as const;

export function renderCityMap(atlas: CanvasImageSource, map: CityMapDefinition): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = map.columns * CITY_TILE_SIZE; canvas.height = map.rows * CITY_TILE_SIZE;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('City canvas rendering is unavailable.');
  context.imageSmoothingEnabled = false;
  const drawTile = (tile: CityTileId, x: number, y: number, size = CITY_TILE_SIZE): void => {
    const sx = tile.column * 17; const sy = tile.row * 17;
    if (tile.column < 0 || tile.row < 0 || tile.column >= CITY_ATLAS_COLUMNS || tile.row >= CITY_ATLAS_ROWS) throw new Error(`Invalid city atlas tile ${tile.column},${tile.row}`);
    context.drawImage(atlas, sx, sy, CITY_SOURCE_TILE_SIZE, CITY_SOURCE_TILE_SIZE, x * CITY_TILE_SIZE, y * CITY_TILE_SIZE, size, size);
  };

  // Keep all map layers in one cached texture. Tile work occurs once at renderer setup.
  for (const layer of map.layers) for (const cell of layer.cells) drawTile(layer.tile, cell.x, cell.y);

  // Original road paint keeps intersections legible without adding gameplay collision.
  context.fillStyle = '#d8c98f';
  for (const y of [14, 15, 21, 30, 31, 34]) for (let x = 0; x < map.columns; x++) {
    if (y === 15 || y === 31) {
      if (x % 4 === 1) context.fillRect(x * CITY_TILE_SIZE + 5, y * CITY_TILE_SIZE + 15, 19, 2);
    }
  }
  // Crosswalk bars at each intersection, with a midnight curb line as a visual edge.
  context.fillStyle = '#f1e5c6';
  for (const x of [13, 14, 22, 23, 36, 37, 45, 46]) for (let y = 16; y < 20; y++) context.fillRect(x * CITY_TILE_SIZE + 3, y * CITY_TILE_SIZE + (x % 2 ? 8 : 18), 26, 6);
  context.fillStyle = '#263b47';
  for (const y of [13, 22, 29, 35]) context.fillRect(0, y * CITY_TILE_SIZE, canvas.width, 2);

  // Street-facing block footprints are built from atlas tiles, framed with an original curb and entrance strip.
  for (const building of map.buildings) {
    const px = building.x * CITY_TILE_SIZE; const py = building.y * CITY_TILE_SIZE;
    const pw = building.columns * CITY_TILE_SIZE; const ph = building.rows * CITY_TILE_SIZE;
    context.fillStyle = '#101a27'; context.fillRect(px - 5, py - 5, pw + 10, ph + 10);
    context.fillStyle = building.style === 'brick' ? '#633e3a' : building.style === 'glass' ? '#324f61' : '#4d545b';
    context.fillRect(px - 3, py - 3, pw + 6, ph + 6);
    for (let y = 0; y < building.rows; y++) for (let x = 0; x < building.columns; x++) {
      const palette = buildingTiles[building.style];
      drawTile(palette[(x + y * 2) % palette.length]!, building.x + x, building.y + y);
    }
    context.fillStyle = '#d9c9a5'; context.fillRect(px, py + ph - 5, pw, 3);
    context.fillStyle = '#f0bf59'; context.fillRect(px + CITY_TILE_SIZE, py + ph - 2, CITY_TILE_SIZE, 2);
  }

  // Original top-down parked cars sit in the small curb pockets, away from the combat lanes.
  const paintCar = (x: number, y: number, body: string, roof: string, pointsRight: boolean): void => {
    context.fillStyle = '#101822'; context.fillRect(x + 2, y + 4, 58, 30);
    context.fillStyle = '#080f16'; context.fillRect(x + 5, y + 3, 8, 5); context.fillRect(x + 5, y + 29, 8, 5); context.fillRect(x + 49, y + 3, 8, 5); context.fillRect(x + 49, y + 29, 8, 5);
    context.fillStyle = body; context.fillRect(x + 7, y + 2, 48, 33);
    context.fillStyle = roof; context.fillRect(x + 17, y + 5, 27, 27);
    context.fillStyle = '#b5d8e3'; context.fillRect(x + (pointsRight ? 40 : 10), y + 8, 7, 21);
    context.fillStyle = '#1a2a36'; context.fillRect(x + (pointsRight ? 22 : 31), y + 7, 3, 24);
    context.fillStyle = '#ffd77c'; context.fillRect(x + (pointsRight ? 52 : 5), y + 7, 3, 6); context.fillRect(x + (pointsRight ? 52 : 5), y + 24, 3, 6);
    context.fillStyle = '#e27462'; context.fillRect(x + (pointsRight ? 6 : 52), y + 7, 3, 6); context.fillRect(x + (pointsRight ? 6 : 52), y + 24, 3, 6);
    context.fillStyle = '#d8e5df'; context.fillRect(x + 26, y + 3, 8, 2);
  };
  for (const car of [
    { x: 9 * CITY_TILE_SIZE, y: 11 * CITY_TILE_SIZE, body: '#2d7592', roof: '#234a62', right: true },
    { x: 33 * CITY_TILE_SIZE, y: 11 * CITY_TILE_SIZE, body: '#ac5948', roof: '#633c3a', right: false },
    { x: 48 * CITY_TILE_SIZE, y: 23 * CITY_TILE_SIZE, body: '#657b73', roof: '#344c4a', right: true },
    { x: 25 * CITY_TILE_SIZE, y: 36 * CITY_TILE_SIZE, body: '#c18b47', roof: '#65533b', right: false },
  ]) paintCar(car.x, car.y, car.body, car.roof, car.right);

  // Street lamps are baked into the map canvas as small original pixel accents.
  for (const [x, y] of [[11, 12], [28, 12], [37, 23], [49, 23]] as const) {
    const px = x * CITY_TILE_SIZE + 12; const py = y * CITY_TILE_SIZE + 10;
    context.fillStyle = '#263a48'; context.fillRect(px + 6, py + 10, 5, 21);
    context.fillStyle = '#c4d5d3'; context.fillRect(px + 5, py + 5, 7, 8);
    context.fillStyle = '#f4ce73'; context.fillRect(px + 7, py + 7, 3, 3);
    context.fillStyle = '#607c88'; context.fillRect(px + 3, py + 29, 11, 3);
  }
  return canvas;
}
