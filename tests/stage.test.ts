import { describe, expect, it } from 'vitest';
import { buildNavigationField, createCityStage, isWalkable, moveOnStage, navigationDirection, nearestWalkablePoint, segmentHitsBuilding } from '../src/game/stage';

describe('shared city stage geometry', () => {
  const stage = createCityStage(1800, 1200);

  it('lets the player use the entire connected north-south street network', () => {
    const x = 600;
    expect(isWalkable(stage, x, 100, 18)).toBe(true);
    const north = moveOnStage(stage, { x, y: 600 }, { x: 0, y: -500 }, 18);
    const south = moveOnStage(stage, north, { x: 0, y: 1050 }, 18);
    expect(north.y).toBeLessThan(288);
    expect(south.y).toBeGreaterThan(752);
    expect(south.y).toBeLessThanOrEqual(stage.height - 18);
  });

  it('stops at real building walls while allowing the player to slide along them', () => {
    const start = { x: 500, y: 200 };
    const moved = moveOnStage(stage, start, { x: -120, y: 120 }, 18);
    expect(moved.x).toBeGreaterThanOrEqual(466);
    expect(moved.x).toBeLessThan(468);
    expect(moved.y).toBeGreaterThan(start.y);
    expect(isWalkable(stage, moved.x, moved.y, 18)).toBe(true);
    expect(segmentHitsBuilding(stage, start, { x: 350, y: 200 })).toBe(true);
  });

  it('prevents dash tunneling through buildings and keeps the final point walkable', () => {
    const start = { x: 520, y: 220 };
    const dash = moveOnStage(stage, start, { x: -500, y: 0 }, 18);
    expect(dash.x).toBeCloseTo(466, 0);
    expect(isWalkable(stage, dash.x, dash.y, 18)).toBe(true);
  });

  it('sanitizes blocked spawns and keeps them on walkable stage terrain', () => {
    const point = nearestWalkablePoint(stage, 200, 200, 20);
    expect(isWalkable(stage, point.x, point.y, 20)).toBe(true);
  });

  it('routes around a building with a deterministic shared flow field', () => {
    const target = { x: 300, y: 500 };
    const fieldA = buildNavigationField(stage, target.x, target.y);
    const fieldB = buildNavigationField(stage, target.x, target.y);
    expect([...fieldA.directionX]).toEqual([...fieldB.directionX]);
    expect([...fieldA.directionY]).toEqual([...fieldB.directionY]);
    const start = { x: 300, y: 20 };
    const first = navigationDirection(stage, fieldA, start.x, start.y);
    expect(Math.abs(first.x) + Math.abs(first.y)).toBe(1);
    expect(segmentHitsBuilding(stage, start, target)).toBe(true);
    let position = { ...start };
    for (let i = 0; i < 240; i++) {
      const direction = navigationDirection(stage, fieldA, position.x, position.y);
      if (!direction.x && !direction.y) break;
      position = moveOnStage(stage, position, { x: direction.x * 8, y: direction.y * 8 }, 20);
      expect(isWalkable(stage, position.x, position.y, 20)).toBe(true);
      if (Math.hypot(position.x - target.x, position.y - target.y) < 40) break;
    }
    expect(Math.hypot(position.x - target.x, position.y - target.y)).toBeLessThan(80);
  });
});
