import { describe, expect, it } from 'vitest';
import { buildCityMapDefinition, CITY_ATLAS_COLUMNS, CITY_ATLAS_ROWS, CITY_TILE_SIZE, validateCityMap } from '../src/render/city-map';

describe('city tilemap', () => {
  it('builds valid in-bounds tile layers using the supplied atlas metadata', () => {
    const map = buildCityMapDefinition(1800, 1200);
    expect(map.columns).toBe(Math.ceil(1800 / CITY_TILE_SIZE));
    expect(map.rows).toBe(Math.ceil(1200 / CITY_TILE_SIZE));
    expect(validateCityMap(map)).toEqual([]);
    expect(map.layers.map(layer => layer.id)).toEqual(['pavement', 'concrete', 'asphalt', 'sidewalk', 'lane-markings']);
    expect(map.layers.every(layer => layer.tile.column < CITY_ATLAS_COLUMNS && layer.tile.row < CITY_ATLAS_ROWS)).toBe(true);
  });

  it('keeps roads continuous through major cross streets and places distinct city blocks around them', () => {
    const map = buildCityMapDefinition(1800, 1200);
    const asphalt = map.layers.find(layer => layer.id === 'asphalt')!;
    const cells = new Set(asphalt.cells.map(cell => `${cell.x},${cell.y}`));
    for (const x of [0, 8, 22, 32, 48, map.columns - 1]) expect(cells.has(`${x},15`)).toBe(true);
    for (const y of [0, 8, 24, 29, map.rows - 1]) expect(cells.has('18,' + y)).toBe(true);
    expect(map.buildings.length).toBeGreaterThanOrEqual(8);
    expect(new Set(map.buildings.map(building => building.style))).toEqual(new Set(['brick', 'glass', 'stone']));
  });

  it('reports invalid atlas indices and out-of-stage tiles instead of rendering bad crops', () => {
    const map = buildCityMapDefinition(320, 320);
    const invalid = { ...map, layers: [...map.layers, { id: 'bad', tile: { column: CITY_ATLAS_COLUMNS, row: 0 }, cells: [{ x: 100, y: 100 }] }] };
    expect(validateCityMap(invalid)).toContain('Layer bad uses an invalid atlas tile.');
    expect(validateCityMap(invalid)).toContain('Layer bad contains an out-of-bounds cell.');
  });
});
