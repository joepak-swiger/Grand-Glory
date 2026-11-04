import { describe, expect, it } from 'vitest';
import { SpatialGrid } from '../src/game/spatial-grid';

describe('reusable spatial grid', () => {
  it('finds neighbors across cell boundaries without duplicate hits', () => {
    const grid = new SpatialGrid<{ id: number; x: number; y: number }>(512, 512, 64);
    const left = { id: 1, x: 63, y: 120 };
    const right = { id: 2, x: 65, y: 120 };
    const distant = { id: 3, x: 220, y: 120 };
    grid.rebuild([left, right, distant]);
    const result: typeof left[] = [];
    expect(grid.queryRadius(64, 120, 3, result).map(point => point.id).sort()).toEqual([1, 2]);
    expect(new Set(result.map(point => point.id)).size).toBe(result.length);
  });

  it('rebuilds moved entities and reuses cleared buckets', () => {
    const grid = new SpatialGrid<{ id: number; x: number; y: number }>(512, 512, 64);
    const moved = { id: 1, x: 30, y: 30 };
    const result: typeof moved[] = [];
    grid.rebuild([moved]);
    expect(grid.queryRadius(30, 30, 1, result)).toHaveLength(1);
    moved.x = 300; moved.y = 300;
    grid.rebuild([moved]);
    expect(grid.queryRadius(30, 30, 1, result)).toHaveLength(0);
    expect(grid.queryRadius(300, 300, 1, result)).toEqual([moved]);
  });
});
