import { describe, expect, it } from 'vitest';
import { buildCityMapDefinition, CITY_ATLAS_COLUMNS, CITY_ATLAS_ROWS, CITY_TILE_SIZE, validateCityMap } from '../src/render/city-map';
import { getTerrain, type BuildingStyle } from '../src/game/stage';

describe('city map semantics', () => {
  it('builds valid in-bounds layers from the shared stage geometry', () => {
    const map = buildCityMapDefinition(1800, 1200);
    expect(map.columns).toBe(Math.ceil(1800 / CITY_TILE_SIZE));
    expect(map.rows).toBe(Math.ceil(1200 / CITY_TILE_SIZE));
    expect(validateCityMap(map)).toEqual([]);
    expect(map.layers.map(layer => layer.id)).toEqual(['pavement', 'road', 'sidewalk']);
    expect(map.layers.every(layer => !layer.tile || (layer.tile.column < CITY_ATLAS_COLUMNS && layer.tile.row < CITY_ATLAS_ROWS))).toBe(true);
    for (const layer of map.layers) for (const cell of layer.cells) expect(getTerrain(map, cell.x, cell.y)).toBe(layer.id === 'pavement' ? 'ground' : layer.id);
  });

  it('keeps connected roads continuous and defines genuine four-way intersections', () => {
    const map = buildCityMapDefinition(1800, 1200);
    expect(getTerrain(map, 8, 18)).toBe('road');
    expect(getTerrain(map, 18, 8)).toBe('road');
    expect(getTerrain(map, 18, 18)).toBe('road');
    expect(getTerrain(map, 41, 32)).toBe('road');
    expect(getTerrain(map, 8, 13)).toBe('sidewalk');
    expect(getTerrain(map, 8, 14)).toBe('road');
  });

  it('uses coherent single-style building footprints with no overlaps or road intrusion', () => {
    const map = buildCityMapDefinition(1800, 1200);
    expect(map.buildings.length).toBeGreaterThanOrEqual(6);
    expect(new Set<BuildingStyle>(map.buildings.map(building => building.style))).toEqual(new Set(['brick', 'glass', 'industrial']));
    for (const building of map.buildings) {
      for (let y = building.y; y < building.y + building.height; y++) for (let x = building.x; x < building.x + building.width; x++) expect(getTerrain(map, x, y)).toBe('building');
    }
    for (let a = 0; a < map.buildings.length; a++) for (let b = a + 1; b < map.buildings.length; b++) {
      const first = map.buildings[a]!; const second = map.buildings[b]!;
      const overlap = first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y;
      expect(overlap).toBe(false);
    }
  });

  it('reports invalid atlas indices and out-of-stage tiles rather than rendering bad crops', () => {
    const map = buildCityMapDefinition(320, 320);
    const invalid = { ...map, layers: [...map.layers, { id: 'road' as const, tile: { column: CITY_ATLAS_COLUMNS, row: 0 }, cells: [{ x: 100, y: 100 }] }] };
    expect(validateCityMap(invalid)).toContain('Layer road uses an invalid atlas tile.');
    expect(validateCityMap(invalid)).toContain('Layer road contains an out-of-bounds cell.');
  });
});
