export interface SpatialPoint { x: number; y: number }

/** Reusable uniform broad phase. Call clear/rebuild after moving entities; queryRadius is conservative. */
export class SpatialGrid<T extends SpatialPoint> {
  private readonly columns: number;
  private readonly cells = new Map<number, T[]>();
  private readonly touched: number[] = [];

  constructor(readonly width: number, readonly height: number, readonly cellSize = 64) {
    this.columns = Math.ceil(width / cellSize) + 1;
  }

  clear(): void {
    for (const key of this.touched) this.cells.get(key)!.length = 0;
    this.touched.length = 0;
  }

  rebuild(items: readonly T[], include: (item: T) => boolean = () => true): void {
    this.clear();
    for (const item of items) if (include(item)) this.insert(item);
  }

  insert(item: T): void {
    const cx = Math.floor(item.x / this.cellSize);
    const cy = Math.floor(item.y / this.cellSize);
    const key = cx + cy * this.columns;
    let cell = this.cells.get(key);
    if (!cell) { cell = []; this.cells.set(key, cell); }
    if (cell.length === 0) this.touched.push(key);
    cell.push(item);
  }

  queryRadius(x: number, y: number, radius: number, result: T[]): T[] {
    result.length = 0;
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    for (let cy = minY; cy <= maxY; cy++) for (let cx = minX; cx <= maxX; cx++) {
      const cell = this.cells.get(cx + cy * this.columns);
      if (cell) for (const item of cell) result.push(item);
    }
    return result;
  }
}
